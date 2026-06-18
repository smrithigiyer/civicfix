# CivicFix Project Structure

## Overview

```
civicfix/
├── backend/                    # Flask backend application
│   ├── app.py                 # Main Flask application
│   ├── auth.py                # JWT authentication module
│   ├── config.py              # Configuration management
│   ├── database.py            # MongoDB models and operations
│   ├── priority_calculator.py # Haversine formula and priority scoring
│   └── requirements.txt       # Python dependencies
│
├── frontend/                   # Frontend HTML/CSS/JS
│   ├── index.html             # Homepage with login modal
│   ├── register.html          # Citizen registration page
│   ├── admin-login.html       # Admin login page
│   ├── report.html            # Complaint submission page
│   ├── dashboard.html         # Citizen dashboard
│   ├── admin.html             # Admin dashboard
│   ├── css/                   # Stylesheets
│   │   ├── styles.css         # Main styles
│   │   ├── auth.css           # Authentication pages
│   │   ├── report.css         # Report page
│   │   ├── dashboard.css      # Dashboard pages
│   │   └── admin.css          # Admin dashboard
│   └── js/                    # JavaScript modules
│       ├── config.js          # Configuration constants
│       ├── auth.js            # Authentication handling
│       ├── api.js             # API request module
│       ├── main.js            # Common utilities
│       ├── home.js            # Homepage functionality
│       ├── report.js          # Report page functionality
│       ├── dashboard.js       # Citizen dashboard
│       └── admin.js           # Admin dashboard
│
├── uploads/                    # File storage (created at runtime)
│   ├── complaints/            # Complaint images
│   └── resolutions/           # Resolution proof images
│
├── .env                        # Environment variables
├── .env.example                # Example environment file
├── run.py                      # Application entry point
├── setup.py                    # Automated setup script
└── README.md                   # Project documentation
```

## Backend Architecture

### app.py
- Flask application factory
- REST API endpoints
- Static file serving
- Error handlers

### auth.py
- JWT token generation/validation
- Authentication decorators:
  - `@login_required`
  - `@admin_required`
  - `@citizen_required`

### database.py
- MongoDB connection via PyMongo
- Data models:
  - `User` (citizens and admins)
  - `Complaint`
  - `PriorityLog`

### priority_calculator.py
- Haversine formula implementation
- Emergency zone proximity scoring
- Weighted priority calculation

### config.py
- Environment-based configuration
- LAN and cloud deployment settings
- Emergency zone coordinates

## Frontend Architecture

### HTML Pages
- **index.html**: Landing page with statistics, features, login modal
- **register.html**: Citizen registration form
- **admin-login.html**: Admin login with certification ID
- **report.html**: Complaint submission with map and image upload
- **dashboard.html**: Citizen complaint tracking
- **admin.html**: Admin complaint management

### JavaScript Modules
- **config.js**: App constants, validation rules
- **auth.js**: Auth state management, login/logout
- **api.js**: API client for all endpoints
- **main.js**: Shared utilities, map helpers
- **Page-specific JS**: home.js, report.js, dashboard.js, admin.js

### CSS Structure
- **styles.css**: Base styles, components, responsive design
- **auth.css**: Authentication page layouts
- **report.css**: Complaint submission form
- **dashboard.css**: Dashboard grids and cards
- **admin.css**: Admin table and management UI

## API Endpoints

### Authentication
- `POST /api/auth/register` - Citizen registration
- `POST /api/auth/register-admin` - Admin registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Current user info

### Complaints (Citizen)
- `POST /api/complaints` - Submit complaint
- `GET /api/complaints/my` - Get my complaints
- `GET /api/complaints/<id>` - Get complaint details

### Complaints (Admin)
- `GET /api/admin/complaints` - Get all complaints
- `PUT /api/admin/complaints/<id>/status` - Update status
- `PUT /api/admin/complaints/<id>/priority` - Override priority

### Statistics
- `GET /api/stats` - Public statistics

## Database Schema

### users Collection
```javascript
{
  _id: ObjectId,
  phone: String (unique),
  password_hash: Binary,
  name: String,
  email: String (optional),
  role: String ('citizen' | 'admin'),
  admin_cert_id: String (admin only),
  is_active: Boolean,
  created_at: DateTime,
  updated_at: DateTime
}
```

### complaints Collection
```javascript
{
  _id: ObjectId,
  citizen_id: String,
  complaint_type: String,
  description: String,
  images: [String],
  location: {
    type: 'Point',
    coordinates: [lng, lat]
  },
  priority: String ('HIGH' | 'MEDIUM' | 'NORMAL'),
  priority_score: Number,
  status: String ('Pending' | 'In Progress' | 'Solved'),
  admin_remarks: String,
  resolution_proof: String,
  priority_override_reason: String,
  created_at: DateTime,
  updated_at: DateTime,
  resolved_at: DateTime
}
```

### priority_logs Collection
```javascript
{
  _id: ObjectId,
  complaint_id: String,
  admin_id: String,
  old_priority: String,
  new_priority: String,
  reason: String,
  created_at: DateTime
}
```

## Security Features

1. **Authentication**
   - bcrypt password hashing
   - JWT tokens with expiration
   - Role-based access control

2. **Input Validation**
   - Phone number format (10 digits)
   - Password minimum length (6 chars)
   - Image type and size validation
   - Coordinate validation

3. **XSS Protection**
   - HTML escaping in templates
   - Content Security Policy ready

4. **File Upload Security**
   - Extension whitelist
   - Size limits (5MB per image)
   - Unique filename generation (UUID)

## Deployment Modes

### Development
```bash
FLASK_ENV=development
DEBUG=True
```

### LAN Deployment
```bash
FLASK_ENV=lan
DEBUG=False
HOST=0.0.0.0
```

### Production
```bash
FLASK_ENV=production
DEBUG=False
# Use Gunicorn or similar WSGI server
```

## Priority Calculation Algorithm

```
Priority Score = (Location Weight × Location Score) + (Severity Weight × Severity Score)

Where:
- Location Weight = 0.6 (60%)
- Severity Weight = 0.4 (40%)

Location Score:
- Distance ≤ 500m from emergency zone: 1.0 × criticality
- Distance ≤ 1km: 0.8 × criticality
- Distance ≤ 3km: 0.5 × criticality
- Distance > 3km: 0.2 × criticality

Emergency Zone Criticality:
- Schools: 1.0
- Hospitals: 1.0
- Fire Stations: 0.9
- Police Stations: 0.8

Severity Scores:
- Streetlight: 0.9
- Drainage: 0.8
- Road Damage: 0.7
- Pothole: 0.6
- Garbage: 0.5
- Other: 0.4

Priority Classification:
- Score ≥ 0.7: HIGH
- Score ≥ 0.4: MEDIUM
- Score < 0.4: NORMAL
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
- Mobile browsers with geolocation

## License

MIT License - See README.md for details
