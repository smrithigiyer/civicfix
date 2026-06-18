# Isolated Admin Registration System

## Overview

The CivicFix admin registration system has been redesigned to be **completely isolated** from the main website, accessible only to authorized municipal officials with a secret access key.

---

## 🔐 Security Features

### Two-Layer Security

1. **Secret Access Key Verification**
   - Required before accessing registration form
   - Stored in environment variable
   - Invalid attempts are logged

2. **Backend API Validation**
   - Server-side access key verification
   - Prevents unauthorized registrations
   - Auto-generates admin certification IDs

---

## 📂 Files

### Frontend
- **`frontend/official-admin-register.html`** - Isolated admin registration page
  - Two-step process: Access key → Registration
  - Modern, secure UI
  - No links from main website

### Backend
- **`backend/app.py`** - Updated `/api/auth/register-admin` endpoint
- **`backend/database.py`** - Updated User model with department field

### Configuration
- **`.env`** - Contains `ADMIN_ACCESS_KEY`
- **`.env.example`** - Template with placeholder

---

## 🚀 Setup Instructions

### 1. Set Your Secret Access Key

Edit `.env` file:

```bash
# IMPORTANT: Change this to your own secret key!
ADMIN_ACCESS_KEY=your-custom-secret-key-here
```

**Recommendations:**
- Use a strong, random string (minimum 20 characters)
- Include uppercase, lowercase, numbers, and symbols
- Never commit the actual key to version control
- Share only with authorized officials via secure channels

**Example strong key:**
```
ADMIN_ACCESS_KEY=CvFx2024!Adm1n$Reg#SecureKey@9876
```

### 2. Update Frontend Access Key

Edit `frontend/official-admin-register.html` line 267:

```javascript
const SECRET_ACCESS_KEY = 'your-custom-secret-key-here';
```

**⚠️ IMPORTANT:** This should match the key in `.env`

> **Note:** In production, consider implementing server-side-only validation by removing client-side checks and relying entirely on the backend API.

---

## 🎯 Usage

### For System Administrators

1. **Generate a Secret Access Key**
   ```bash
   # Example using Python
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. **Update Configuration**
   - Add key to `.env`
   - Update frontend JavaScript
   - Restart the server

3. **Share with Officials**
   - Provide the secret key via secure channel (encrypted email, in-person, etc.)
   - Provide the registration URL: `http://your-domain.com/official-admin-register.html`
   - Emphasize confidentiality

### For Municipal Officials

1. **Access the Registration Page**
   - Navigate to: `http://localhost:5000/official-admin-register.html`
   - Or in production: `https://yourdomain.com/official-admin-register.html`

2. **Step 1: Verify Access**
   - Enter the secret access key provided by your administrator
   - Click "Verify Access Key"

3. **Step 2: Complete Registration**
   - Fill in your details:
     - Full Name
     - Phone Number (10 digits) - This will be your login username
     - Email (optional)
     - Department/Organization
     - Password (minimum 8 characters)
     - Confirm Password

4. **Submit**
   - Click "Complete Registration"
   - You'll be redirected to the admin login page
   - Login with your phone number and password

---

## 🔒 Security Best Practices

### Access Key Management

✅ **DO:**
- Store in environment variables
- Use strong, random keys
- Rotate keys periodically
- Share via secure channels only
- Keep a backup in a secure location

❌ **DON'T:**
- Hardcode in source code
- Commit to version control
- Share via insecure channels (plain email, SMS)
- Use predictable patterns
- Reuse keys across environments

### Production Deployment

1. **Use HTTPS**
   ```
   https://yourdomain.com/official-admin-register.html
   ```

2. **Implement Rate Limiting**
   - Limit failed access key attempts
   - Block IP addresses after multiple failures

3. **Add Logging**
   - Log all access attempts
   - Monitor for suspicious activity
   - Set up alerts for unauthorized attempts

4. **Server-Side Only Validation**
   - Remove client-side access key check
   - Validate only on backend
   - Return generic error messages

5. **IP Whitelisting (Optional)**
   - Restrict access to known IP ranges
   - Municipal office networks only

---

## 🛠️ API Endpoint

### POST `/api/auth/register-admin`

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "9876543210",
  "email": "john@municipal.gov",
  "department": "Public Works Department",
  "password": "SecurePass@123",
  "access_key": "your-secret-access-key"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Admin registration successful.",
  "data": {
    "user_id": "507f1f77bcf86cd799439011",
    "admin_cert_id": "CIVICFIX-ADMIN-20240217215923"
  }
}
```

**Error Responses:**

- **403 Forbidden** - Invalid access key
  ```json
  {
    "success": false,
    "message": "Invalid access key. Unauthorized access attempt logged."
  }
  ```

- **409 Conflict** - Phone already registered
  ```json
  {
    "success": false,
    "message": "Phone number already registered."
  }
  ```

- **400 Bad Request** - Validation errors
  ```json
  {
    "success": false,
    "message": "Invalid phone number. Please enter 10 digits."
  }
  ```

---

## 📊 Database Schema

### Admin User Document

```javascript
{
  "_id": ObjectId("..."),
  "phone": "9876543210",
  "password_hash": "$2b$12$...",
  "name": "John Doe",
  "email": "john@municipal.gov",
  "department": "Public Works Department",
  "role": "admin",
  "admin_cert_id": "CIVICFIX-ADMIN-20240217215923",
  "is_active": true,
  "created_at": ISODate("2024-02-17T16:29:23.000Z"),
  "updated_at": ISODate("2024-02-17T16:29:23.000Z")
}
```

---

## 🧪 Testing

### Test the Registration Flow

1. **Start the server:**
   ```bash
   python run.py
   ```

2. **Open the registration page:**
   ```
   http://localhost:5000/official-admin-register.html
   ```

3. **Test with correct access key:**
   - Enter: `CIVICFIX-ADMIN-2024-SECURE` (or your custom key)
   - Should proceed to Step 2

4. **Test with incorrect access key:**
   - Enter: `wrong-key`
   - Should show error: "Invalid access key. Access denied."

5. **Complete registration:**
   - Fill all fields
   - Submit
   - Should redirect to admin login

6. **Verify in database:**
   ```javascript
   // MongoDB shell
   use civicfix
   db.users.find({ role: "admin" }).pretty()
   ```

---

## 🔄 Migrating from Old System

The old `admin-register.html` has been **deleted** and replaced with the new isolated system.

### Key Changes

| Old System | New System |
|------------|------------|
| Public certification ID | Secret access key |
| Accessible from main site | Completely isolated |
| Client-side validation only | Client + Server validation |
| No department field | Department required |
| Manual cert ID entry | Auto-generated cert ID |

### Migration Steps

1. ✅ Old file deleted: `frontend/admin-register.html`
2. ✅ New file created: `frontend/official-admin-register.html`
3. ✅ Backend API updated with access key validation
4. ✅ Database model updated with department field
5. ✅ Environment variables configured

---

## 📝 Troubleshooting

### Issue: "Invalid access key" error

**Solution:**
- Verify the key in `.env` matches the key in `official-admin-register.html`
- Check for typos or extra spaces
- Restart the server after changing `.env`

### Issue: Registration succeeds but can't login

**Solution:**
- Verify the admin was created: Check MongoDB `users` collection
- Ensure `role` is set to `"admin"`
- Try logging in at `admin-login.html` (not regular login)

### Issue: "Phone number already registered"

**Solution:**
- The phone number is already in use
- Use a different phone number
- Or delete the existing user from database

---

## 🎓 For Developers

### Adding Additional Security

**1. Add CAPTCHA:**
```html
<!-- Add to official-admin-register.html -->
<script src="https://www.google.com/recaptcha/api.js"></script>
<div class="g-recaptcha" data-sitekey="your-site-key"></div>
```

**2. Add Email Verification:**
```python
# In app.py after registration
send_verification_email(email, verification_token)
```

**3. Add Two-Factor Authentication:**
```python
# Require OTP after access key verification
send_otp(phone)
verify_otp(phone, entered_otp)
```

---

## 📞 Support

For issues or questions:
- Check this documentation first
- Review server logs for errors
- Verify MongoDB connection
- Ensure all environment variables are set

---

## ⚠️ Important Reminders

1. **Change the default access key immediately**
2. **Never commit `.env` to version control**
3. **Use HTTPS in production**
4. **Rotate access keys periodically**
5. **Monitor access logs regularly**
6. **Keep the registration URL confidential**

---

**Last Updated:** 2024-02-17
**Version:** 1.0.0
