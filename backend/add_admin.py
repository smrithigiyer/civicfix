"""
CivicFix Admin Setup Script
============================
Temporary script to add default admin user to MongoDB for testing and registration.
RUN ONCE, then delete or comment out usage.

Usage:
    python add_admin.py [--phone PHONE] [--password PASSWORD] [--name NAME]

Default credentials (if no args provided):
    Phone: 9999999999
    Password: Admin@123
    Name: Admin User
"""

import sys
import os
from datetime import datetime, timezone, timedelta
import bcrypt
from pymongo import MongoClient
from bson import ObjectId

# MongoDB connection
MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb://localhost:27017/civicfix'
DB_NAME = 'civicfix'

# IST (Indian Standard Time) timezone: UTC+5:30
IST = timezone(timedelta(hours=5, minutes=30))


def get_ist_now():
    """Get current time in IST (Indian Standard Time, UTC+5:30)."""
    return datetime.now(IST)


def create_admin(phone='9999999999', password='Admin@123', name='Admin User', email=None):
    """
    Create an admin user in the database.
    
    Args:
        phone: Admin phone number (unique identifier)
        password: Admin password (will be hashed)
        name: Admin name
        email: Optional admin email
        
    Returns:
        Dict with admin details and status
    """
    try:
        # Direct MongoDB connection
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        users_collection = db['users']
        
        # Check if admin already exists
        existing_admin = users_collection.find_one({'phone': phone})
        if existing_admin:
            return {
                'success': False,
                'message': f'Admin with phone {phone} already exists!',
                'admin_id': str(existing_admin['_id'])
            }
        
        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Create admin document
        admin_data = {
            'phone': phone,
            'password_hash': password_hash,
            'name': name,
            'role': 'admin',
            'is_active': True,
            'admin_cert_id': 'TEMP_ADMIN_' + get_ist_now().strftime('%Y%m%d%H%M%S IST'),
            'created_at': get_ist_now(),
            'updated_at': get_ist_now()
        }
        
        # Add email if provided
        if email:
            admin_data['email'] = email
        
        # Insert admin into database
        result = users_collection.insert_one(admin_data)
        admin_id = str(result.inserted_id)
        
        # Verify insertion
        verify_admin = users_collection.find_one({'_id': ObjectId(admin_id)})
        if verify_admin:
            return {
                'success': True,
                'message': 'Admin created successfully!',
                'admin_id': admin_id,
                'credentials': {
                    'phone': phone,
                    'password': password,
                    'name': name,
                    'email': email or 'Not set',
                    'role': 'admin'
                }
            }
        else:
            return {
                'success': False,
                'message': 'Admin created but verification failed!'
            }
            
    except Exception as e:
        return {
            'success': False,
            'message': f'Database error: {str(e)}'
        }
    finally:
        try:
            client.close()
        except:
            pass


def delete_admin(phone):
    """
    Delete an admin user by phone number.
    
    Args:
        phone: Admin phone number
        
    Returns:
        Dict with status
    """
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        users_collection = db['users']
        
        result = users_collection.delete_one({'phone': phone})
        
        if result.deleted_count > 0:
            return {
                'success': True,
                'message': f'Admin with phone {phone} deleted successfully!'
            }
        else:
            return {
                'success': False,
                'message': f'Admin with phone {phone} not found!'
            }
    except Exception as e:
        return {
            'success': False,
            'message': f'Database error: {str(e)}'
        }
    finally:
        try:
            client.close()
        except:
            pass


def list_admins():
    """List all admin users in the database."""
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        users_collection = db['users']
        
        admins = list(users_collection.find({'role': 'admin'}))
        
        if not admins:
            return {
                'success': True,
                'message': 'No admins found in database',
                'admins': []
            }
        
        admin_list = []
        for admin in admins:
            admin_list.append({
                'id': str(admin['_id']),
                'phone': admin['phone'],
                'name': admin['name'],
                'email': admin.get('email', 'Not set'),
                'is_active': admin.get('is_active', True),
                'created_at': admin.get('created_at').strftime('%Y-%m-%d %H:%M:%S') if admin.get('created_at') else 'Unknown'
            })
        
        return {
            'success': True,
            'message': f'Found {len(admin_list)} admin(s)',
            'admins': admin_list
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'Database error: {str(e)}',
            'admins': []
        }
    finally:
        try:
            client.close()
        except:
            pass


def main():
    """Main function to handle CLI arguments."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='CivicFix Admin Setup Script',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python add_admin.py --create                    # Add default admin
  python add_admin.py --create --phone 9876543210 --password MyPass@123 --name "My Admin"
  python add_admin.py --list                      # List all admins
  python add_admin.py --delete --phone 9999999999 # Delete admin by phone
        """
    )
    
    parser.add_argument('--create', action='store_true', help='Create a new admin user')
    parser.add_argument('--list', action='store_true', help='List all admin users')
    parser.add_argument('--delete', action='store_true', help='Delete an admin user')
    parser.add_argument('--phone', type=str, default='9999999999', help='Admin phone number (default: 9999999999)')
    parser.add_argument('--password', type=str, default='Admin@123', help='Admin password (default: Admin@123)')
    parser.add_argument('--name', type=str, default='Admin User', help='Admin name (default: Admin User)')
    parser.add_argument('--email', type=str, help='Admin email (optional)')
    
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("CivicFix Admin Setup Script")
    print("="*60 + "\n")
    
    try:
        if args.create:
            print(f"Creating admin user...")
            print(f"  Phone: {args.phone}")
            print(f"  Name: {args.name}")
            print(f"  Email: {args.email or 'Not set'}\n")
            
            result = create_admin(
                phone=args.phone,
                password=args.password,
                name=args.name,
                email=args.email
            )
            
            if result['success']:
                print("✅ SUCCESS!\n")
                print("Admin Credentials:")
                print("-" * 40)
                for key, value in result['credentials'].items():
                    print(f"  {key.capitalize()}: {value}")
                print("-" * 40)
                print(f"\nAdmin ID: {result['admin_id']}")
                print("\n⚠️  IMPORTANT:")
                print("  1. Save these credentials in a secure location")
                print("  2. Login to admin page and change the password")
                print("  3. Delete this script or remove the usage code")
            else:
                print(f"❌ FAILED: {result['message']}")
                
        elif args.delete:
            print(f"Deleting admin with phone: {args.phone}\n")
            result = delete_admin(args.phone)
            
            if result['success']:
                print(f"✅ {result['message']}")
            else:
                print(f"❌ {result['message']}")
                
        elif args.list:
            print("Fetching all admins...\n")
            result = list_admins()
            
            if result['success']:
                print(result['message'])
                if result['admins']:
                    print("\nAdmin List:")
                    print("-" * 80)
                    for admin in result['admins']:
                        print(f"  ID: {admin['id']}")
                        print(f"  Phone: {admin['phone']}")
                        print(f"  Name: {admin['name']}")
                        print(f"  Email: {admin['email']}")
                        print(f"  Active: {admin['is_active']}")
                        print(f"  Created: {admin['created_at']}")
                        print("-" * 80)
            else:
                print(f"❌ {result['message']}")
        else:
            # Default: show help and create default admin
            parser.print_help()
            print("\n" + "="*60)
            print("Running default admin creation...\n")
            result = create_admin()
            
            if result['success']:
                print("✅ SUCCESS!\n")
                print("Default Admin Credentials:")
                print("-" * 40)
                for key, value in result['credentials'].items():
                    print(f"  {key.capitalize()}: {value}")
                print("-" * 40)
                print(f"\nAdmin ID: {result['admin_id']}")
            else:
                print(f"❌ FAILED: {result['message']}")
                
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "="*60 + "\n")


if __name__ == '__main__':
    main()
