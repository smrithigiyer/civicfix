"""
CivicFix Main Application
=========================
Flask application with REST API for civic issue reporting.
"""
import os
import uuid
from datetime import datetime, timezone, timedelta
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from config import get_config
from database import init_db, User, Complaint, PriorityLog, mongo, get_ist_now, IST
from auth import generate_token, login_required, admin_required, citizen_required
from priority_calculator import init_calculator, get_calculator

# Create Flask app
def create_app(config_name=None):
    """Application factory pattern."""
    app = Flask(__name__)
    
    # Load configuration
    config = get_config()
    app.config.from_object(config)
    
    # Enable CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Authorization", "Content-Type"]
        }
    })
    
    # Initialize database
    init_db(app)
    
    # Initialize priority calculator
    init_calculator(config)
    
    # Create upload directories
    os.makedirs(app.config['UPLOAD_FOLDER_COMPLAINTS'], exist_ok=True)
    os.makedirs(app.config['UPLOAD_FOLDER_RESOLUTIONS'], exist_ok=True)
    
    return app


app = create_app()

# Log server startup time in IST
startup_time_ist = get_ist_now()
print("\n" + "="*60)
print("🚀 CivicFix Server Started")
print("="*60)
print(f"📅 Startup Time (IST): {startup_time_ist.strftime('%Y-%m-%d %H:%M:%S IST')}")
print(f"🕐 Timezone: Indian Standard Time (UTC+5:30)")
print("="*60 + "\n")


# ==================== Utility Functions ====================

def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


def save_uploaded_file(file, folder):
    """Save uploaded file and return filename."""
    if file and allowed_file(file.filename):
        # Generate unique filename
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(folder, filename)
        file.save(filepath)
        return filename
    return None


def validate_phone(phone):
    """Validate phone number format (10 digits)."""
    return phone and len(phone) == 10 and phone.isdigit()


def validate_password(password):
    """Validate password (min 6 characters)."""
    return password and len(password) >= 6


def cleanup_expired_solved_complaints(citizen_id=None):
    """
    Delete solved complaints that have passed their auto-delete time.
    If citizen_id is provided, only clean that citizen's complaints.
    """
    now = get_ist_now()
    query = {
        'status': 'Solved',
        'auto_delete_at': {'$lte': now}
    }

    if citizen_id:
        query['citizen_id'] = citizen_id

    expired = list(mongo.db.complaints.find(query))
    if not expired:
        return 0

    complaint_ids = [c['_id'] for c in expired]

    # Best effort: remove stored media files.
    for complaint in expired:
        for image_name in complaint.get('images', []) or []:
            image_path = os.path.join(app.config['UPLOAD_FOLDER_COMPLAINTS'], image_name)
            if os.path.exists(image_path):
                try:
                    os.remove(image_path)
                except OSError:
                    pass

        proof_name = complaint.get('resolution_proof')
        if proof_name:
            proof_path = os.path.join(app.config['UPLOAD_FOLDER_RESOLUTIONS'], proof_name)
            if os.path.exists(proof_path):
                try:
                    os.remove(proof_path)
                except OSError:
                    pass

    mongo.db.complaints.delete_many({'_id': {'$in': complaint_ids}})
    return len(complaint_ids)


def mark_solved_complaint_viewed_for_auto_delete(complaint, current_user):
    """
    Start auto-delete countdown for solved complaints once the citizen views details.
    """
    if current_user.get('role') != 'citizen':
        return complaint

    if complaint.get('status') != 'Solved':
        return complaint

    if complaint.get('citizen_id') != current_user.get('id'):
        return complaint

    if complaint.get('solved_viewed_at'):
        return complaint

    now = get_ist_now()
    auto_delete_at = now + timedelta(days=2)

    mongo.db.complaints.update_one(
        {'_id': complaint['_id']},
        {'$set': {
            'solved_viewed_at': now,
            'auto_delete_at': auto_delete_at,
            'updated_at': now
        }}
    )

    complaint['solved_viewed_at'] = now
    complaint['auto_delete_at'] = auto_delete_at
    complaint['updated_at'] = now
    return complaint


# ==================== Static File Routes ====================

@app.route('/')
def index():
    """Serve main page."""
    return send_from_directory('../frontend', 'index.html')


@app.route('/<path:path>')
def static_files(path):
    """Serve static files."""
    return send_from_directory('../frontend', path)


@app.route('/uploads/<folder>/<filename>')
def uploaded_file(folder, filename):
    """Serve uploaded images."""
    if folder in ['complaints', 'resolutions']:
        folder_path = app.config[f'UPLOAD_FOLDER_{folder.upper()}']
        return send_from_directory(folder_path, filename)
    return jsonify({'success': False, 'message': 'Invalid folder'}), 404


# ==================== System API ====================

@app.route('/api/server-time', methods=['GET'])
def get_server_time():
    """Get current server time in IST for timezone-aware client operations."""
    server_time = get_ist_now()
    return jsonify({
        'success': True,
        'timestamp': int(server_time.timestamp() * 1000),  # milliseconds
        'iso_string': server_time.isoformat(),
        'timezone': 'IST (Indian Standard Time, UTC+5:30)',
        'readable_format': server_time.strftime('%Y-%m-%d %H:%M:%S IST')
    }), 200


# ==================== Authentication API ====================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new citizen account."""
    data = request.get_json()
    
    # Validate required fields
    phone = data.get('phone', '').strip()
    password = data.get('password', '')
    name = data.get('name', '').strip()
    
    if not validate_phone(phone):
        return jsonify({
            'success': False,
            'message': 'Invalid phone number. Please enter 10 digits.'
        }), 400
    
    if not validate_password(password):
        return jsonify({
            'success': False,
            'message': 'Password must be at least 6 characters long.'
        }), 400
    
    if not name:
        return jsonify({
            'success': False,
            'message': 'Name is required.'
        }), 400
    
    # Check if phone already exists
    if User.find_by_phone(phone):
        return jsonify({
            'success': False,
            'message': 'Phone number already registered.'
        }), 409
    
    # Create user
    try:
        user_id = User.create_user(
            phone=phone,
            password=password,
            name=name,
            email=data.get('email'),
            role='citizen'
        )
        
        return jsonify({
            'success': True,
            'message': 'Registration successful. Please login.',
            'data': {'user_id': user_id}
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Registration failed: {str(e)}'
        }), 500


@app.route('/api/auth/register-admin', methods=['POST'])
def register_admin():
    """Register a new admin account (requires secret access key)."""
    data = request.get_json()
    
    phone = data.get('phone', '').strip()
    password = data.get('password', ''
)
    name = data.get('name', '').strip()
    department = data.get('department', '').strip()
    access_key = data.get('access_key', '').strip()
    
    # Verify secret access key
    # In production, store this in environment variable
    SECRET_ACCESS_KEY = os.environ.get('ADMIN_ACCESS_KEY', 'CIVICFIX-ADMIN-2024-SECURE')
    
    if access_key != SECRET_ACCESS_KEY:
        return jsonify({
            'success': False,
            'message': 'Invalid access key. Unauthorized access attempt logged.'
        }), 403
    
    # Validate required fields
    if not validate_phone(phone):
        return jsonify({
            'success': False,
            'message': 'Invalid phone number. Please enter 10 digits.'
        }), 400
    
    if not validate_password(password):
        return jsonify({
            'success': False,
            'message': 'Password must be at least 6 characters long.'
        }), 400
    
    if not name:
        return jsonify({
            'success': False,
            'message': 'Name is required.'
        }), 400
    
    if not department:
        return jsonify({
            'success': False,
            'message': 'Department/Organization is required.'
        }), 400
    
    # Check if phone already exists
    if User.find_by_phone(phone):
        return jsonify({
            'success': False,
            'message': 'Phone number already registered.'
        }), 409
    
    # Create admin user
    try:
        # Generate admin certification ID
        admin_cert_id = f'CIVICFIX-ADMIN-{get_ist_now().strftime("%Y%m%d%H%M%S IST")}'
        
        user_id = User.create_user(
            phone=phone,
            password=password,
            name=name,
            email=data.get('email'),
            role='admin',
            admin_cert_id=admin_cert_id,
            department=department
        )
        
        return jsonify({
            'success': True,
            'message': 'Admin registration successful.',
            'data': {
                'user_id': user_id,
                'admin_cert_id': admin_cert_id
            }
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Registration failed: {str(e)}'
        }), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user and return JWT token."""
    data = request.get_json()
    
    phone = data.get('phone', '').strip()
    password = data.get('password', '')
    
    if not phone or not password:
        return jsonify({
            'success': False,
            'message': 'Phone and password are required.'
        }), 400
    
    # Find user
    user = User.find_by_phone(phone)
    
    if not user or not User.verify_password(user, password):
        return jsonify({
            'success': False,
            'message': 'Invalid phone number or password.'
        }), 401
    
    # Generate token
    token = generate_token(
        user_id=str(user['_id']),
        role=user['role'],
        phone=user['phone']
    )
    
    return jsonify({
        'success': True,
        'message': 'Login successful.',
        'data': {
            'token': token,
            'user': User.to_dict(user)
        }
    })


@app.route('/api/auth/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current authenticated user info."""
    return jsonify({
        'success': True,
        'data': {'user': request.current_user}
    })


# ==================== Complaint API ====================

@app.route('/api/complaints', methods=['POST'])
@citizen_required
def create_complaint():
    """Submit a new complaint."""
    try:
        # Handle multipart form data (for image uploads)
        complaint_type = request.form.get('complaint_type')
        description = request.form.get('description', '').strip()
        lat = request.form.get('lat', type=float)
        lng = request.form.get('lng', type=float)
        address = request.form.get('address', '').strip()
        place_name = request.form.get('place_name', '').strip()
        
        # Validate inputs
        if not complaint_type or complaint_type not in Complaint.COMPLAINT_TYPES:
            return jsonify({
                'success': False,
                'message': f'Invalid complaint type. Must be one of: {", ".join(Complaint.COMPLAINT_TYPES)}'
            }), 400
        
        if not description or len(description) < 10:
            return jsonify({
                'success': False,
                'message': 'Description must be at least 10 characters.'
            }), 400
        
        if lat is None or lng is None:
            return jsonify({
                'success': False,
                'message': 'Location coordinates are required.'
            }), 400
        
        # Validate coordinates
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return jsonify({
                'success': False,
                'message': 'Invalid coordinates.'
            }), 400
        
        # Handle image uploads
        images = []
        if 'images' in request.files:
            files = request.files.getlist('images')
            for file in files:
                if len(images) >= 5:  # Max 5 images
                    break
                filename = save_uploaded_file(file, app.config['UPLOAD_FOLDER_COMPLAINTS'])
                if filename:
                    images.append(filename)
        
        # Calculate priority
        calculator = get_calculator()
        priority, priority_score = calculator.calculate_priority(lat, lng, complaint_type)
        
        # Create complaint
        complaint_id = Complaint.create_complaint(
            citizen_id=request.current_user['id'],
            complaint_type=complaint_type,
            description=description,
            images=images,
            location={'lat': lat, 'lng': lng},
            priority=priority,
            priority_score=priority_score,
            address=address if address else None,
            place_name=place_name if place_name else None
        )
        
        return jsonify({
            'success': True,
            'message': 'Complaint submitted successfully.',
            'data': {
                'complaint_id': complaint_id,
                'priority': priority,
                'priority_score': priority_score
            }
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to submit complaint: {str(e)}'
        }), 500


@app.route('/api/complaints/my', methods=['GET'])
@citizen_required
def get_my_complaints():
    """Get all complaints submitted by current citizen."""
    try:
        cleanup_expired_solved_complaints(citizen_id=request.current_user['id'])
        complaints = Complaint.find_by_citizen(request.current_user['id'])
        
        # Format response
        complaints_data = [Complaint.to_dict(c) for c in complaints]
        
        return jsonify({
            'success': True,
            'data': {
                'complaints': complaints_data,
                'total': len(complaints_data)
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch complaints: {str(e)}'
        }), 500


@app.route('/api/complaints/<complaint_id>', methods=['GET'])
@login_required
def get_complaint(complaint_id):
    """Get single complaint details."""
    try:
        if request.current_user['role'] == 'citizen':
            cleanup_expired_solved_complaints(citizen_id=request.current_user['id'])

        complaint = Complaint.find_by_id(complaint_id)
        
        if not complaint:
            return jsonify({
                'success': False,
                'message': 'Complaint not found.'
            }), 404
        
        # Citizens can only view their own complaints
        if request.current_user['role'] == 'citizen':
            if complaint['citizen_id'] != request.current_user['id']:
                return jsonify({
                    'success': False,
                    'message': 'Access denied.'
                }), 403
            complaint = mark_solved_complaint_viewed_for_auto_delete(complaint, request.current_user)
        
        # Include citizen info for admin
        include_citizen = request.current_user['role'] == 'admin'
        complaint_data = Complaint.to_dict(complaint, include_citizen_info=include_citizen)
        
        return jsonify({
            'success': True,
            'data': {'complaint': complaint_data}
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch complaint: {str(e)}'
        }), 500


# ==================== Admin API ====================

@app.route('/api/admin/complaints', methods=['GET'])
@admin_required
def get_all_complaints():
    """Get all complaints with filtering (admin only)."""
    try:
        cleanup_expired_solved_complaints()
        # Get query parameters
        priority = request.args.get('priority')
        status = request.args.get('status')
        complaint_type = request.args.get('type')
        
        # Build filter
        filters = {}
        if priority and priority in Complaint.PRIORITIES:
            filters['priority'] = priority
        if status and status in Complaint.STATUSES:
            filters['status'] = status
        if complaint_type and complaint_type in Complaint.COMPLAINT_TYPES:
            filters['complaint_type'] = complaint_type
        
        # Fetch complaints
        complaints = Complaint.find_all(filters=filters, sort_by=('created_at', -1))
        
        # Format response
        complaints_data = [Complaint.to_dict(c, include_citizen_info=True) for c in complaints]
        
        return jsonify({
            'success': True,
            'data': {
                'complaints': complaints_data,
                'total': len(complaints_data)
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch complaints: {str(e)}'
        }), 500


@app.route('/api/admin/complaints/<complaint_id>/status', methods=['PUT'])
@admin_required
def update_complaint_status(complaint_id):
    """Update complaint status with optional remarks and resolution proof (admin only)."""
    try:
        # Handle both JSON and FormData requests
        if request.content_type and 'multipart/form-data' in request.content_type:
            # FormData with file upload
            status = request.form.get('status')
            admin_remarks = request.form.get('admin_remarks', '').strip()
        else:
            # JSON request
            data = request.get_json() or request.form
            status = data.get('status')
            admin_remarks = data.get('admin_remarks', '').strip()
        
        # Validate status
        if not status or status not in Complaint.STATUSES:
            return jsonify({
                'success': False,
                'message': f'Invalid status. Must be one of: {", ".join(Complaint.STATUSES)}'
            }), 400
        
        # Handle resolution proof file upload (only for Solved status)
        resolution_proof = None
        if status == 'Solved' and 'resolution_proof' in request.files:
            file = request.files['resolution_proof']
            if file and file.filename != '':
                resolution_proof = save_uploaded_file(
                    file, 
                    app.config['UPLOAD_FOLDER_RESOLUTIONS']
                )
                if not resolution_proof:
                    return jsonify({
                        'success': False,
                        'message': 'Failed to upload resolution proof. Invalid file type.'
                    }), 400
        
        # Validate that resolution proof is provided when marking as Solved
        if status == 'Solved' and not resolution_proof:
            return jsonify({
                'success': False,
                'message': 'Resolution proof image is required when marking complaint as Solved.'
            }), 400
        
        # Find and update complaint
        complaint = Complaint.find_by_id(complaint_id)
        if not complaint:
            return jsonify({
                'success': False,
                'message': 'Complaint not found.'
            }), 404
        
        # Update complaint status
        success = Complaint.update_status(
            complaint_id=complaint_id,
            status=status,
            admin_remarks=admin_remarks if admin_remarks else None,
            resolution_proof=resolution_proof
        )
        
        if not success:
            return jsonify({
                'success': False,
                'message': 'Failed to update complaint status.'
            }), 500
        
        return jsonify({
            'success': True,
            'message': f'Complaint status updated to {status} successfully.'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to update status: {str(e)}'
        }), 500


@app.route('/api/admin/complaints/<complaint_id>/priority', methods=['PUT'])
@admin_required
def override_priority(complaint_id):
    """Override complaint priority with reason (admin only)."""
    try:
        data = request.get_json()
        
        priority = data.get('priority')
        reason = data.get('reason', '').strip()
        
        if priority not in Complaint.PRIORITIES:
            return jsonify({
                'success': False,
                'message': f'Invalid priority. Must be one of: {", ".join(Complaint.PRIORITIES)}'
            }), 400
        
        if not reason or len(reason) < 10:
            return jsonify({
                'success': False,
                'message': 'Reason must be at least 10 characters.'
            }), 400
        
        # Get current complaint
        complaint = Complaint.find_by_id(complaint_id)
        if not complaint:
            return jsonify({
                'success': False,
                'message': 'Complaint not found.'
            }), 404
        
        old_priority = complaint['priority']
        
        # Update priority
        success = Complaint.update_priority(complaint_id, priority, reason)
        
        if not success:
            return jsonify({
                'success': False,
                'message': 'Failed to update priority.'
            }), 500
        
        # Log the override
        PriorityLog.log_override(
            complaint_id=complaint_id,
            admin_id=request.current_user['id'],
            old_priority=old_priority,
            new_priority=priority,
            reason=reason
        )
        
        return jsonify({
            'success': True,
            'message': 'Priority updated successfully.'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to update priority: {str(e)}'
        }), 500


# ==================== Statistics API ====================

@app.route('/api/stats', methods=['GET'])
def get_statistics():
    """Get public statistics."""
    try:
        cleanup_expired_solved_complaints()
        # Count by status
        status_counts = {}
        for status in Complaint.STATUSES:
            status_counts[status] = mongo.db.complaints.count_documents({'status': status})
        
        # Count by priority
        priority_counts = {}
        for priority in Complaint.PRIORITIES:
            priority_counts[priority] = mongo.db.complaints.count_documents({'priority': priority})
        
        # Total complaints
        total = mongo.db.complaints.count_documents({})
        
        # Recent complaints (last 7 days)
        week_ago = get_ist_now() - timedelta(days=7)
        recent = mongo.db.complaints.count_documents({'created_at': {'$gte': week_ago}})
        
        return jsonify({
            'success': True,
            'data': {
                'total_complaints': total,
                'by_status': status_counts,
                'by_priority': priority_counts,
                'recent_complaints': recent
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch statistics: {str(e)}'
        }), 500


# ==================== Error Handlers ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'message': 'Resource not found.'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'message': 'Internal server error.'
    }), 500


# ==================== Main Entry Point ====================

if __name__ == '__main__':
    app.run(
        host=app.config['HOST'],
        port=app.config['PORT'],
        debug=app.config['DEBUG']
    )
