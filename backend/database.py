"""
CivicFix Database Module
========================
MongoDB database connection and operations using PyMongo.
"""
from flask_pymongo import PyMongo
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import bcrypt

# Initialize PyMongo
mongo = PyMongo()

# IST (Indian Standard Time) timezone: UTC+5:30
IST = timezone(timedelta(hours=5, minutes=30))


def get_ist_now():
    """
    Get current time in IST (Indian Standard Time).
    IST is UTC+5:30.
    Uses timezone-aware datetime to ensure consistency.
    """
    return datetime.now(IST)


def datetime_to_millis(dt):
    """
    Convert a datetime to Unix epoch milliseconds safely.
    MongoDB/PyMongo commonly returns naive UTC datetimes; treat them as UTC.
    """
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


def init_db(app):
    """Initialize database with Flask app."""
    mongo.init_app(app)
    # Create indexes for better performance
    with app.app_context():
        # Users collection indexes
        mongo.db.users.create_index('phone', unique=True)
        mongo.db.users.create_index('email', unique=True, sparse=True)
        
        # Complaints collection indexes
        mongo.db.complaints.create_index('citizen_id')
        mongo.db.complaints.create_index('status')
        mongo.db.complaints.create_index('priority')
        mongo.db.complaints.create_index('created_at')
        mongo.db.complaints.create_index('auto_delete_at')
        mongo.db.complaints.create_index([('location', '2dsphere')])
        
        print("Database initialized and indexes created.")


class User:
    """User model for citizens and admins."""
    
    COLLECTION = 'users'
    
    @staticmethod
    def create_user(phone, password, name, email=None, role='citizen', admin_cert_id=None, department=None):
        """Create a new user with hashed password."""
        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        user_data = {
            'phone': phone,
            'password_hash': password_hash,
            'name': name,
            'role': role,  # 'citizen' or 'admin'
            'is_active': True,
            'created_at': get_ist_now(),
            'updated_at': get_ist_now()
        }
        
        # Only include email if provided (to avoid duplicate null values)
        if email and email.strip():
            user_data['email'] = email.strip()
        
        # Only include admin_cert_id if provided
        if admin_cert_id:
            user_data['admin_cert_id'] = admin_cert_id
        
        # Only include department if provided
        if department:
            user_data['department'] = department
        
        result = mongo.db[User.COLLECTION].insert_one(user_data)
        return str(result.inserted_id)
    
    @staticmethod
    def find_by_phone(phone):
        """Find user by phone number."""
        return mongo.db[User.COLLECTION].find_one({'phone': phone})
    
    @staticmethod
    def find_by_id(user_id):
        """Find user by ID."""
        try:
            return mongo.db[User.COLLECTION].find_one({'_id': ObjectId(user_id)})
        except:
            return None
    
    @staticmethod
    def verify_password(user, password):
        """Verify password against stored hash."""
        if not user or 'password_hash' not in user:
            return False
        return bcrypt.checkpw(password.encode('utf-8'), user['password_hash'])
    
    @staticmethod
    def to_dict(user):
        """Convert user document to dictionary (exclude sensitive data)."""
        if not user:
            return None
        return {
            'id': str(user['_id']),
            'phone': user['phone'],
            'name': user['name'],
            'email': user.get('email'),
            'role': user['role'],
            'is_active': user.get('is_active', True),
            'created_at': datetime_to_millis(user.get('created_at'))
        }


class Complaint:
    """Complaint model for civic issues."""
    
    COLLECTION = 'complaints'
    
    # Valid complaint types
    COMPLAINT_TYPES = [
        'pothole',
        'drainage',
        'road_damage',
        'streetlight',
        'garbage',
        'other'
    ]
    
    # Valid statuses
    STATUSES = ['Pending', 'In Progress', 'Solved']
    
    # Valid priorities
    PRIORITIES = ['HIGH', 'MEDIUM', 'NORMAL']
    
    @staticmethod
    def create_complaint(citizen_id, complaint_type, description, images, 
                         location, priority='NORMAL', priority_score=0, address=None, place_name=None):
        """Create a new complaint."""
        complaint_data = {
            'citizen_id': citizen_id,
            'complaint_type': complaint_type,
            'description': description,
            'images': images,  # List of image filenames
            'location': {
                'type': 'Point',
                'coordinates': [location['lng'], location['lat']]  # GeoJSON format: [lng, lat]
            },
            'priority': priority,
            'priority_score': priority_score,
            'address': address,
            'place_name': place_name,
            'status': 'Pending',
            'admin_remarks': None,
            'resolution_proof': None,
            'priority_override_reason': None,
            'created_at': get_ist_now(),
            'updated_at': get_ist_now(),
            'resolved_at': None,
            'solved_viewed_at': None,
            'auto_delete_at': None
        }
        
        result = mongo.db[Complaint.COLLECTION].insert_one(complaint_data)
        return str(result.inserted_id)
    
    @staticmethod
    def find_by_id(complaint_id):
        """Find complaint by ID."""
        try:
            return mongo.db[Complaint.COLLECTION].find_one({'_id': ObjectId(complaint_id)})
        except:
            return None
    
    @staticmethod
    def find_by_citizen(citizen_id):
        """Find all complaints by a citizen."""
        return list(mongo.db[Complaint.COLLECTION].find(
            {'citizen_id': citizen_id}
        ).sort('created_at', -1))
    
    @staticmethod
    def find_all(filters=None, sort_by=None, limit=None):
        """Find all complaints with optional filters."""
        query = filters or {}
        cursor = mongo.db[Complaint.COLLECTION].find(query)
        
        if sort_by:
            cursor = cursor.sort(sort_by[0], sort_by[1])
        else:
            cursor = cursor.sort('created_at', -1)
        
        if limit:
            cursor = cursor.limit(limit)
        
        return list(cursor)
    
    @staticmethod
    def update_status(complaint_id, status, admin_remarks=None, resolution_proof=None):
        """Update complaint status."""
        update_data = {
            'status': status,
            'updated_at': get_ist_now()
        }
        
        if admin_remarks is not None:
            update_data['admin_remarks'] = admin_remarks
        
        if resolution_proof is not None:
            update_data['resolution_proof'] = resolution_proof
        
        if status == 'Solved':
            update_data['resolved_at'] = get_ist_now()
            update_data['solved_viewed_at'] = None
            update_data['auto_delete_at'] = None
        else:
            update_data['solved_viewed_at'] = None
            update_data['auto_delete_at'] = None
            update_data['resolved_at'] = None
        
        result = mongo.db[Complaint.COLLECTION].update_one(
            {'_id': ObjectId(complaint_id)},
            {'$set': update_data}
        )
        return result.modified_count > 0
    
    @staticmethod
    def update_priority(complaint_id, priority, reason):
        """Override complaint priority with reason."""
        result = mongo.db[Complaint.COLLECTION].update_one(
            {'_id': ObjectId(complaint_id)},
            {'$set': {
                'priority': priority,
                'priority_override_reason': reason,
                'updated_at': get_ist_now()
            }}
        )
        return result.modified_count > 0
    
    @staticmethod
    def to_dict(complaint, include_citizen_info=False):
        """Convert complaint document to dictionary."""
        if not complaint:
            return None
        
        result = {
            'id': str(complaint['_id']),
            'citizen_id': complaint['citizen_id'],
            'complaint_type': complaint['complaint_type'],
            'description': complaint['description'],
            'images': complaint.get('images', []),
            'location': {
                'lat': complaint['location']['coordinates'][1],
                'lng': complaint['location']['coordinates'][0]
            } if 'location' in complaint else None,
            'address': complaint.get('address'),
            'place_name': complaint.get('place_name'),
            'priority': complaint['priority'],
            'priority_score': complaint.get('priority_score', 0),
            'status': complaint['status'],
            'admin_remarks': complaint.get('admin_remarks'),
            'resolution_proof': complaint.get('resolution_proof'),
            'priority_override_reason': complaint.get('priority_override_reason'),
            'created_at': datetime_to_millis(complaint.get('created_at')),
            'updated_at': datetime_to_millis(complaint.get('updated_at')),
            'resolved_at': datetime_to_millis(complaint.get('resolved_at')),
            'solved_viewed_at': datetime_to_millis(complaint.get('solved_viewed_at')),
            'auto_delete_at': datetime_to_millis(complaint.get('auto_delete_at'))
        }
        
        if include_citizen_info and 'citizen_info' in complaint:
            result['citizen_info'] = User.to_dict(complaint['citizen_info'])
        
        return result


class PriorityLog:
    """Log for priority override actions."""
    
    COLLECTION = 'priority_logs'
    
    @staticmethod
    def log_override(complaint_id, admin_id, old_priority, new_priority, reason):
        """Log a priority override action."""
        log_data = {
            'complaint_id': complaint_id,
            'admin_id': admin_id,
            'old_priority': old_priority,
            'new_priority': new_priority,
            'reason': reason,
            'created_at': get_ist_now()
        }
        
        result = mongo.db[PriorityLog.COLLECTION].insert_one(log_data)
        return str(result.inserted_id)
