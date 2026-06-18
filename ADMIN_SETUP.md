# Admin Setup Guide

## Quick Start

To add a temporary admin user to the database for testing and registration:

### Option 1: Default Admin (Recommended First Time)
```bash
cd backend
python add_admin.py --create
```

**Default Credentials:**
- Phone: `9999999999`
- Password: `Admin@123`
- Name: `Admin User`

### Option 2: Custom Admin
```bash
python add_admin.py --create --phone 8765432109 --password YourPassword@123 --name "Your Name"
```

### Option 3: With Email
```bash
python add_admin.py --create --phone 8765432109 --password YourPassword@123 --name "Admin" --email admin@civicfix.local
```

## Other Commands

### List All Admins
```bash
python add_admin.py --list
```

### Delete an Admin
```bash
python add_admin.py --delete --phone 9999999999
```

### View Help
```bash
python add_admin.py --help
```

## Workflow

1. **Create Admin**
   ```bash
   python add_admin.py --create
   ```
   Save the credentials shown in the output

2. **Login to Admin Dashboard**
   - Navigate to: `http://localhost:5000/admin-login.html`
   - Enter phone: `9999999999`
   - Enter password: `Admin@123`

3. **Register Proper Admin**
   - Once logged in, use the admin registration page
   - Create your actual admin account
   - Delete the temporary admin using:
   ```bash
   python add_admin.py --delete --phone 9999999999
   ```

4. **Clean Up**
   - After registration is complete, you can safely delete `add_admin.py`
   - Or commit it to source control for future setup purposes

## Database Schema (Users Collection)

```json
{
  "_id": ObjectId,
  "phone": "string (unique)",
  "password_hash": "bcrypt hash",
  "name": "string",
  "email": "string (optional)",
  "role": "admin or citizen",
  "admin_cert_id": "string (for admins)",
  "is_active": "boolean",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## Security Notes

⚠️ **IMPORTANT:**
- This script is for development/testing only
- Change the default password immediately after first login
- In production, use proper admin provisioning mechanisms
- Do not commit credentials to version control
- Delete temporary admins after registration is complete

## Troubleshooting

**Issue:** `MONGO_URI not set`
- Ensure MongoDB is running on `mongodb://localhost:27017`
- Or set `MONGO_URI` environment variable

**Issue:** `Phone already exists`
- Use `--list` to see existing admins
- Use `--delete` to remove before recreating

**Issue:** `Permission denied`
- Ensure you have write access to the MongoDB database
- Check MongoDB user permissions
