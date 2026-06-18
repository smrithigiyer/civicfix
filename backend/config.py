"""
CivicFix Configuration
======================
Centralized configuration management for LAN and cloud deployment.
"""
import os
from datetime import timedelta

class Config:
    """Base configuration class."""
    
    # Secret key for JWT and session management
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'civicfix-dev-secret-key-change-in-production'
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'civicfix-jwt-secret-key'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    
    # MongoDB Configuration
    MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb://localhost:27017/civicfix'
    
    # File Upload Configuration
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER_COMPLAINTS = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'complaints')
    UPLOAD_FOLDER_RESOLUTIONS = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'resolutions')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    
    # Emergency Zone Coordinates (Default: Sample coordinates - update for your city)
    # Format: {'name': (latitude, longitude), ...}
    EMERGENCY_ZONES = {
        'schools': [
            (28.6139, 77.2090),  # Example: Delhi area
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
    
    # Priority Calculation Weights
    LOCATION_WEIGHT = 0.6
    SEVERITY_WEIGHT = 0.4
    
    # Distance thresholds (in kilometers)
    CRITICAL_DISTANCE = 0.5  # 500 meters
    HIGH_DISTANCE = 1.0      # 1 kilometer
    MEDIUM_DISTANCE = 3.0    # 3 kilometers
    
    # Server Configuration
    HOST = os.environ.get('HOST') or '0.0.0.0'
    PORT = int(os.environ.get('PORT') or 5000)
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    # In production, ensure all secrets come from environment variables
    SECRET_KEY = os.environ.get('SECRET_KEY')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')


class LANConfig(Config):
    """LAN deployment configuration."""
    HOST = '0.0.0.0'
    PORT = 5000
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'lan': LANConfig,
    'default': DevelopmentConfig
}

def get_config():
    """Get configuration based on environment."""
    env = os.environ.get('FLASK_ENV', 'default')
    return config.get(env, config['default'])
