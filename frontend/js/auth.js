/**
 * CivicFix - Authentication Module
 * ================================
 * Handles user authentication, token management, and session.
 */

class AuthManager {
    constructor() {
        this.token = null;
        this.user = null;
        this.init();
    }
    
    /**
     * Initialize auth state from storage
     */
    init() {
        this.token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
        const userData = localStorage.getItem(CONFIG.STORAGE.USER);
        
        if (userData) {
            try {
                this.user = JSON.parse(userData);
            } catch (e) {
                console.error('Failed to parse user data:', e);
                this.clearAuth();
            }
        }
        
        this.updateUI();
    }
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.token && !!this.user;
    }
    
    /**
     * Check if current user is admin
     */
    isAdmin() {
        return this.isAuthenticated() && this.user.role === 'admin';
    }
    
    /**
     * Check if current user is citizen
     */
    isCitizen() {
        return this.isAuthenticated() && this.user.role === 'citizen';
    }
    
    /**
     * Get auth token
     */
    getToken() {
        return this.token;
    }
    
    /**
     * Get current user
     */
    getUser() {
        return this.user;
    }
    
    /**
     * Set authentication data
     */
    setAuth(token, user) {
        this.token = token;
        this.user = user;
        
        localStorage.setItem(CONFIG.STORAGE.TOKEN, token);
        localStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(user));
        
        this.updateUI();
    }
    
    /**
     * Clear authentication data
     */
    clearAuth() {
        this.token = null;
        this.user = null;
        
        localStorage.removeItem(CONFIG.STORAGE.TOKEN);
        localStorage.removeItem(CONFIG.STORAGE.USER);
        
        this.updateUI();
    }
    
    /**
     * Update UI based on auth state
     */
    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userName = document.getElementById('userName');
        const adminLinks = document.querySelectorAll('.admin-only');
        
        if (this.isAuthenticated()) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-flex';
            if (userName) {
                userName.textContent = this.user.name;
                userName.style.display = 'inline';
            }
            
            // Show admin links if admin
            adminLinks.forEach(link => {
                link.style.display = this.isAdmin() ? 'inline-block' : 'none';
            });
        } else {
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userName) userName.style.display = 'none';
            
            // Hide admin links
            adminLinks.forEach(link => {
                link.style.display = 'none';
            });
        }
    }
    
    /**
     * Login user
     */
    async login(phone, password) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phone, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.setAuth(data.data.token, data.data.user);
                return { success: true, message: data.message };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }
    
    /**
     * Register citizen
     */
    async register(phone, password, name, email = null) {
        try {
            const body = { phone, password, name };
            if (email) body.email = email;
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            
            const data = await response.json();
            
            return {
                success: data.success,
                message: data.message,
                data: data.data
            };
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }
    
    /**
     * Register admin
     */
    async registerAdmin(phone, password, name, adminCertId, email = null) {
        try {
            const body = { phone, password, name, admin_cert_id: adminCertId };
            if (email) body.email = email;
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register-admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            
            const data = await response.json();
            
            return {
                success: data.success,
                message: data.message,
                data: data.data
            };
        } catch (error) {
            console.error('Admin register error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }
    
    /**
     * Logout user
     */
    logout() {
        this.clearAuth();
        if (window.navigateWithTransition) {
            window.navigateWithTransition('index.html');
        } else {
            window.location.href = 'index.html';
        }
    }
    
    /**
     * Get auth headers for API requests
     */
    getAuthHeaders() {
        if (!this.token) {
            return {};
        }
        return {
            'Authorization': `Bearer ${this.token}`
        };
    }
    
    /**
     * Require authentication - redirect to login if not authenticated
     */
    requireAuth(redirectUrl = 'index.html') {
        if (!this.isAuthenticated()) {
            if (window.navigateWithTransition) {
                window.navigateWithTransition(redirectUrl);
            } else {
                window.location.href = redirectUrl;
            }
            return false;
        }
        return true;
    }
    
    /**
     * Require admin - redirect if not admin
     */
    requireAdmin(redirectUrl = 'index.html') {
        if (!this.isAdmin()) {
            if (window.navigateWithTransition) {
                window.navigateWithTransition(redirectUrl);
            } else {
                window.location.href = redirectUrl;
            }
            return false;
        }
        return true;
    }
    
    /**
     * Require citizen - redirect if not citizen
     */
    requireCitizen(redirectUrl = 'index.html') {
        if (!this.isCitizen()) {
            if (window.navigateWithTransition) {
                window.navigateWithTransition(redirectUrl);
            } else {
                window.location.href = redirectUrl;
            }
            return false;
        }
        return true;
    }
}

// Create global auth instance
const auth = new AuthManager();

// Setup logout button
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.logout();
        });
    }
});
