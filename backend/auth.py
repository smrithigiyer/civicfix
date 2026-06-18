"""
CivicFix Authentication Module
==============================
JWT-based authentication with role-based access control.
"""
from functools import wraps
from flask import request, jsonify, current_app
import jwt
from datetime import datetime, timedelta
from database import User, get_ist_now


def generate_token(user_id: str, role: str, phone: str) -> str:
    """
    Generate JWT token for authenticated user.
    
    Args:
        user_id: User's MongoDB ID
        role: User role ('citizen' or 'admin')
        phone: User's phone number
    
    Returns:
        JWT token string
    """
    now_ist = get_ist_now()
    payload = {
        'user_id': user_id,
        'role': role,
        'phone': phone,
        'exp': now_ist + timedelta(hours=24),
        'iat': now_ist
    }
    
    return jwt.encode(
        payload,
        current_app.config['JWT_SECRET_KEY'],
        algorithm='HS256'
    )


def decode_token(token: str) -> dict:
    """
    Decode and validate JWT token.
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(
            token,
            current_app.config['JWT_SECRET_KEY'],
            algorithms=['HS256']
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_token_from_header() -> str:
    """Extract token from Authorization header."""
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        return None
    
    parts = auth_header.split()
    
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None
    
    return parts[1]


def login_required(f):
    """Decorator to require authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_header()
        
        if not token:
            return jsonify({
                'success': False,
                'message': 'Authentication required. Please provide a valid token.'
            }), 401
        
        payload = decode_token(token)
        
        if not payload:
            return jsonify({
                'success': False,
                'message': 'Invalid or expired token. Please login again.'
            }), 401
        
        # Get current user
        user = User.find_by_id(payload['user_id'])
        
        if not user or not user.get('is_active', True):
            return jsonify({
                'success': False,
                'message': 'User not found or inactive.'
            }), 401
        
        # Add user info to request context
        request.current_user = User.to_dict(user)
        
        return f(*args, **kwargs)
    
    return decorated_function


def admin_required(f):
    """Decorator to require admin role."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_header()
        
        if not token:
            return jsonify({
                'success': False,
                'message': 'Authentication required.'
            }), 401
        
        payload = decode_token(token)
        
        if not payload:
            return jsonify({
                'success': False,
                'message': 'Invalid or expired token.'
            }), 401
        
        # Check admin role
        if payload.get('role') != 'admin':
            return jsonify({
                'success': False,
                'message': 'Admin access required.'
            }), 403
        
        # Get current user
        user = User.find_by_id(payload['user_id'])
        
        if not user or not user.get('is_active', True):
            return jsonify({
                'success': False,
                'message': 'User not found or inactive.'
            }), 401
        
        request.current_user = User.to_dict(user)
        
        return f(*args, **kwargs)
    
    return decorated_function


def citizen_required(f):
    """Decorator to require citizen role."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_header()
        
        if not token:
            return jsonify({
                'success': False,
                'message': 'Authentication required.'
            }), 401
        
        payload = decode_token(token)
        
        if not payload:
            return jsonify({
                'success': False,
                'message': 'Invalid or expired token.'
            }), 401
        
        # Check citizen role
        if payload.get('role') != 'citizen':
            return jsonify({
                'success': False,
                'message': 'Citizen access required.'
            }), 403
        
        # Get current user
        user = User.find_by_id(payload['user_id'])
        
        if not user or not user.get('is_active', True):
            return jsonify({
                'success': False,
                'message': 'User not found or inactive.'
            }), 401
        
        request.current_user = User.to_dict(user)
        
        return f(*args, **kwargs)
    
    return decorated_function


def optional_auth(f):
    """Decorator for optional authentication (adds user info if available)."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_header()
        request.current_user = None
        
        if token:
            payload = decode_token(token)
            if payload:
                user = User.find_by_id(payload['user_id'])
                if user and user.get('is_active', True):
                    request.current_user = User.to_dict(user)
        
        return f(*args, **kwargs)
    
    return decorated_function
