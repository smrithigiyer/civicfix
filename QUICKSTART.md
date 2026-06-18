# CivicFix - Quick Start Guide

## Prerequisites

- Python 3.8 or higher
- MongoDB 4.0 or higher
- 2GB RAM minimum
- 1GB disk space

## Installation (5 minutes)

### Option 1: Automated Setup

```bash
# Clone or extract the project
cd civicfix

# Run automated setup
python3 setup.py
```

### Option 2: Manual Setup

```bash
# 1. Create virtual environment
python3 -m venv venv

# 2. Activate virtual environment
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# 3. Install dependencies
pip install -r backend/requirements.txt

# 4. Create environment file
cp .env.example .env
# Edit .env with your settings

# 5. Create upload directories
mkdir -p uploads/complaints uploads/resolutions
```

## Start MongoDB

```bash
# Linux (systemd)
sudo systemctl start mongod

# macOS (Homebrew)
brew services start mongodb-community

# Windows (Service)
net start MongoDB
```

## Run the Application

```bash
# Activate virtual environment (if not already)
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows

# Run the application
python run.py
```

## Access the Application

- **Main Website**: http://localhost:5000
- **Citizen Login**: Use phone number and password
- **Admin Login**: http://localhost:5000/admin-login.html

## First Time Setup

### 1. Register as Citizen
- Go to http://localhost:5000
- Click "Register here" in the login modal
- Fill in your details

### 2. Create Admin Account (Optional)

Use the API to create an admin:

```bash
curl -X POST http://localhost:5000/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "password": "adminpassword",
    "name": "Admin User",
    "admin_cert_id": "CIVICFIX-ADMIN-001"
  }'
```

Or use the registration endpoint with admin certification ID format.

### 3. Report Your First Issue

1. Login as citizen
2. Click "Report Issue"
3. Select issue type
4. Add description
5. Upload photos (optional)
6. Set location on map
7. Submit

## Configuration

### Update Emergency Zones

Edit `backend/config.py` to add your city's emergency locations:

```python
EMERGENCY_ZONES = {
    'schools': [
        (28.6139, 77.2090),  # Your school coordinates
    ],
    'hospitals': [
        (28.6129, 77.2295),  # Your hospital coordinates
    ],
    # ...
}
```

### Change Default Location

Update map center in `frontend/js/config.js`:

```javascript
MAP: {
    DEFAULT_LAT: 28.6139,  // Your city latitude
    DEFAULT_LNG: 77.2090,  // Your city longitude
    DEFAULT_ZOOM: 13
}
```

## Production Deployment

### Using Gunicorn

```bash
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 backend.app:app
```

### Using Docker

```bash
# Build image
docker build -t civicfix .

# Run container
docker run -p 5000:5000 -v $(pwd)/uploads:/app/uploads civicfix
```

### Using Systemd

Create `/etc/systemd/system/civicfix.service`:

```ini
[Unit]
Description=CivicFix Application
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/civicfix
Environment="PATH=/path/to/civicfix/venv/bin"
Environment="FLASK_ENV=production"
ExecStart=/path/to/civicfix/venv/bin/gunicorn -w 4 -b 127.0.0.1:5000 backend.app:app

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable civicfix
sudo systemctl start civicfix
```

## Troubleshooting

### MongoDB Connection Error

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod
```

### Port Already in Use

```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill process or change port in .env
```

### Permission Denied on Uploads

```bash
# Fix permissions
chmod 755 uploads
chmod 755 uploads/complaints
chmod 755 uploads/resolutions
```

## Getting Help

- **Documentation**: See README.md
- **API Docs**: See README.md API section
- **Issues**: Check PROJECT_STRUCTURE.md

## Next Steps

1. Customize emergency zones for your city
2. Update branding and colors in CSS
3. Configure email notifications (optional)
4. Set up SSL certificates for production
5. Configure backup for MongoDB

---

**Happy Reporting!** 🏙️
