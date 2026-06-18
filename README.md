# CivicFix - Smart Public Issue Reporting Platform

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0+-green.svg)](https://flask.palletsprojects.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.0+-brightgreen.svg)](https://mongodb.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

CivicFix is a production-ready civic issue reporting platform designed for municipal-level public infrastructure management. Citizens can report issues like potholes, drainage problems, road damage, streetlight failures, and garbage accumulation. The system automatically calculates priority based on proximity to emergency zones (schools, hospitals, fire stations, police stations).

## Features

### User Authentication
- Phone number and password registration/login
- Password hashing using bcrypt
- JWT-based authentication
- Role-based access control (Citizen and Certified Admin)

### Complaint Submission
- Multiple complaint types (pothole, drainage, road damage, streetlight, garbage, other)
- Description with minimum character validation
- Multiple image uploads (up to 5 images, 5MB each)
- Browser-based geolocation detection
- Manual map pin placement using Leaflet.js

### Automatic Priority Calculation
- Haversine formula for distance calculation
- Emergency zone proximity scoring:
  - Schools (100% criticality)
  - Hospitals (100% criticality)
  - Fire Stations (90% criticality)
  - Police Stations (80% criticality)
- Weighted scoring: Location (60%) + Severity (40%)
- Priority levels: HIGH, MEDIUM, NORMAL

### Citizen Dashboard
- View all submitted complaints
- Color-coded priority badges
- Status tracking (Pending, In Progress, Solved)
- View admin remarks
- View resolution proof images
- Filter by status and priority

### Admin Dashboard
- Secure admin login with certified admin ID verification
- View all complaints with citizen information
- Filter by priority, status, and complaint type
- Update complaint status with remarks
- Upload resolution proof images
- Override priority with mandatory reason logging

## Technology Stack

### Backend
- **Framework**: Flask 3.0+
- **Database**: MongoDB with PyMongo
- **Authentication**: PyJWT + bcrypt
- **CORS**: Flask-CORS

### Frontend
- **HTML5** with semantic markup
- **CSS3** with CSS variables and modern features
- **Vanilla JavaScript** (ES6+)
- **Leaflet.js** for interactive maps
- **Font Awesome** for icons
- **Google Fonts** (Inter)

### System Requirements
- Python 3.8+
- MongoDB 4.0+
- Modern web browser with geolocation support

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/civicfix.git
cd civicfix
```

### 2. Create Virtual Environment
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 4. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 5. Start MongoDB
```bash
# Windows
net start MongoDB

# Linux
sudo systemctl start mongod

# macOS
brew services start mongodb-community
```

### 6. Run the Application
```bash
python run.py
```

The application will be available at `http://localhost:5000`

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_ENV` | Environment mode (development/production/lan) | `development` |
| `SECRET_KEY` | Flask secret key | Random string |
| `JWT_SECRET_KEY` | JWT signing key | Random string |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/civicfix` |
| `HOST` | Server bind address | `0.0.0.0` |
| `PORT` | Server port | `5000` |
| `DEBUG` | Debug mode | `True` |

### Emergency Zones

Edit `backend/config.py` to customize emergency zone coordinates for your city:

```python
EMERGENCY_ZONES = {
    'schools': [
        (28.6139, 77.2090),  # Add your coordinates
    ],
    'hospitals': [
        (28.6129, 77.2295),
    ],
    'fire_stations': [
        (28.6229, 77.2195),
    ],
    'police_stations': [
        (28.6039, 77.1995),
    ]
}
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new citizen account.
```json
{
  "phone": "1234567890",
  "password": "securepassword",
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### POST /api/auth/register-admin
Register a new admin account (requires certification ID).
```json
{
  "phone": "1234567890",
  "password": "securepassword",
  "name": "Admin User",
  "admin_cert_id": "CIVICFIX-ADMIN-XXXXXX"
}
```

#### POST /api/auth/login
Login and receive JWT token.
```json
{
  "phone": "1234567890",
  "password": "securepassword"
}
```

### Complaint Endpoints

#### POST /api/complaints
Submit a new complaint (requires authentication).
- FormData with images
- Fields: `complaint_type`, `description`, `lat`, `lng`, `images`

#### GET /api/complaints/my
Get current user's complaints (requires authentication).

#### GET /api/complaints/<id>
Get single complaint details (requires authentication).

### Admin Endpoints

#### GET /api/admin/complaints
Get all complaints with filters (admin only).
- Query params: `priority`, `status`, `type`

#### PUT /api/admin/complaints/<id>/status
Update complaint status (admin only).
```json
{
  "status": "In Progress",
  "admin_remarks": "Assigned to road department"
}
```

#### PUT /api/admin/complaints/<id>/priority
Override complaint priority (admin only).
```json
{
  "priority": "HIGH",
  "reason": "Near school zone, urgent attention needed"
}
```

### Statistics Endpoints

#### GET /api/stats
Get public statistics (no authentication required).

## Deployment

### LAN Deployment

1. Set environment variables:
```bash
export FLASK_ENV=lan
export DEBUG=False
```

2. Run the application:
```bash
python run.py
```

3. Access from other devices on the network:
```
http://<server-ip>:5000
```

### Production Deployment

1. Use a production WSGI server (Gunicorn):
```bash
gunicorn -w 4 -b 0.0.0.0:5000 backend.app:app
```

2. Set up a reverse proxy (Nginx/Apache)

3. Configure SSL certificates

4. Set environment variables:
```bash
export FLASK_ENV=production
export SECRET_KEY=your-secure-secret-key
export JWT_SECRET_KEY=your-secure-jwt-key
export DEBUG=False
```

### Docker Deployment (Optional)

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "run.py"]
```

## Security Features

- Password hashing with bcrypt
- JWT-based authentication with expiration
- Input validation and sanitization
- File upload validation (type, size)
- CORS configuration
- XSS protection through HTML escaping
- Role-based access control

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
- Mobile browsers with geolocation support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@civicfix.local or join our Slack channel.

## Acknowledgments

- OpenStreetMap for map tiles
- Leaflet.js for interactive maps
- Flask community for the excellent framework
- MongoDB team for the database

---

**CivicFix** - Making cities better, one report at a time.
