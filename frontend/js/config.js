/**
 * CivicFix - Configuration
 * ========================
 * Central configuration for API endpoints and app settings.
 */

const CONFIG = {
    // API Base URL - Change this for production deployment
    API_BASE_URL: ['localhost', '127.0.0.1'].includes(window.location.hostname)
        ? `https://${window.location.hostname}:5000/api`
        : '/api',

    // App Settings
    APP_NAME: 'CivicFix',
    APP_VERSION: '1.0.0',

    // Map Settings - Leaflet with OpenStreetMap
    MAP: {
        DEFAULT_LAT: 28.6139,
        DEFAULT_LNG: 77.2090,
        DEFAULT_ZOOM: 13,
        MARKER_ZOOM_LEVEL: 17,
        TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },

    // Complaint Types
    COMPLAINT_TYPES: [
        { value: 'pothole', label: 'Pothole', icon: 'fa-road' },
        { value: 'drainage', label: 'Drainage Problem', icon: 'fa-water' },
        { value: 'road_damage', label: 'Road Damage', icon: 'fa-car-crash' },
        { value: 'streetlight', label: 'Streetlight Issue', icon: 'fa-lightbulb' },
        { value: 'garbage', label: 'Garbage Accumulation', icon: 'fa-trash' },
        { value: 'other', label: 'Other Issue', icon: 'fa-ellipsis-h' }
    ],

    // Status Options
    STATUSES: [
        { value: 'Pending', label: 'Pending', color: '#f59e0b' },
        { value: 'In Progress', label: 'In Progress', color: '#2563eb' },
        { value: 'Solved', label: 'Solved', color: '#10b981' }
    ],

    // Priority Options
    PRIORITIES: [
        { value: 'HIGH', label: 'High Priority', class: 'badge-high' },
        { value: 'MEDIUM', label: 'Medium Priority', class: 'badge-medium' },
        { value: 'NORMAL', label: 'Normal Priority', class: 'badge-normal' }
    ],

    // Validation
    VALIDATION: {
        PHONE_REGEX: /^\d{10}$/,
        MIN_PASSWORD_LENGTH: 6,
        MAX_IMAGES: 5,
        MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    },

    // Storage Keys
    STORAGE: {
        TOKEN: 'civicfix_token',
        USER: 'civicfix_user'
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
