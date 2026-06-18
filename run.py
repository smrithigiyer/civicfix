#!/usr/bin/env python3
"""
CivicFix - Application Runner
=============================
Main entry point to run the CivicFix application.
"""
import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_path))

from backend.app import app
from backend.config import get_config

def check_mongodb():
    """Check if MongoDB is running."""
    try:
        from pymongo import MongoClient
        config = get_config()
        client = MongoClient(config.MONGO_URI, serverSelectionTimeoutMS=2000)
        client.server_info()
        print("✓ MongoDB connection successful")
        return True
    except Exception as e:
        print(f"✗ MongoDB connection failed: {e}")
        print("\nPlease ensure MongoDB is installed and running:")
        print("  - Windows: net start MongoDB")
        print("  - Linux: sudo systemctl start mongod")
        print("  - macOS: brew services start mongodb-community")
        return False

def setup_uploads():
    """Create upload directories if they don't exist."""
    config = get_config()
    
    uploads_dir = Path(__file__).parent / 'uploads'
    complaints_dir = uploads_dir / 'complaints'
    resolutions_dir = uploads_dir / 'resolutions'
    
    complaints_dir.mkdir(parents=True, exist_ok=True)
    resolutions_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"✓ Upload directories ready")

def print_banner():
    """Print startup banner."""
    banner = """
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ██████╗██╗██╗   ██╗██╗ ██████╗███████╗██╗██╗  ██╗        ║
║  ██╔════╝██║██║   ██║██║██╔════╝██╔════╝██║╚██╗██╔╝        ║
║  ██║     ██║██║   ██║██║██║     █████╗  ██║ ╚███╔╝         ║
║  ██║     ██║╚██╗ ██╔╝██║██║     ██╔══╝  ██║ ██╔██╗         ║
║  ╚██████╗██║ ╚████╔╝ ██║╚██████╗██║     ██║██╔╝ ██╗        ║
║   ╚═════╝╚═╝  ╚═══╝  ╚═╝ ╚═════╝╚═╝     ╚═╝╚═╝  ╚═╝        ║
║                                                              ║
║         Smart Public Issue Reporting Platform                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)

def main():
    """Main entry point."""
    print_banner()
    
    # HTTPS is enabled by default; pass --http only if needed for compatibility
    use_https = '--http' not in sys.argv
    
    # Load configuration
    config = get_config()
    
    print(f"Environment: {os.environ.get('FLASK_ENV', 'default')}")
    print(f"Debug Mode: {config.DEBUG}")
    print(f"HTTPS Mode: {'Enabled' if use_https else 'Disabled'}")
    print()
    
    # Setup uploads
    setup_uploads()
    
    # Check MongoDB
    if not check_mongodb():
        print("\n⚠ Warning: MongoDB is not running. The application may not work correctly.")
        # Only ask for input if running interactively
        if sys.stdin.isatty():
            response = input("Do you want to continue anyway? (y/N): ")
            if response.lower() != 'y':
                sys.exit(1)
        else:
            print("Continuing anyway (non-interactive mode)...")
    
    print()
    print(f"Starting CivicFix server...")
    
    protocol = "https" if use_https else "http"
    print(f"URL: {protocol}://{config.HOST}:{config.PORT}")
    
    if use_https:
        print("\n⚠ NOTE: You are running in HTTPS mode with a self-signed certificate.")
        print("⚠ Your browser will show a 'Not Secure' warning.")
        print("⚠ Click 'Advanced' -> 'Proceed to...' to access the site.")
        print("⚠ This allows Geolocation to work on other devices.")
    else:
        print("\n💡 Running in HTTP compatibility mode (--http).")
        
    print()
    
    # Run the application
    kwargs = {
        'host': config.HOST,
        'port': config.PORT,
        'debug': config.DEBUG
    }
    
    if use_https:
        # Requires: pip install pyopenssl
        try:
            kwargs['ssl_context'] = 'adhoc'
        except ImportError:
             print("❌ Error: HTTPS mode requires 'pyopenssl' library.")
             print("   Please install it with: pip install pyopenssl")
             sys.exit(1)
    
    app.run(**kwargs)

if __name__ == '__main__':
    main()
