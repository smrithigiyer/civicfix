/**
 * CivicFix - Admin Registration Module
 * ===================================
 * Handles admin registration with multi-step form and validation.
 */

class AdminRegistration {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 3;
        this.formData = {};
        this.init();
    }
    
    /**
     * Initialize the registration form
     */
    init() {
        this.setupEventListeners();
        this.initDarkMode();
    }
    
    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        const form = document.getElementById('adminRegisterForm');
        
        // Form submission
        form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Next buttons
        document.querySelectorAll('.btn-next').forEach(btn => {
            btn.addEventListener('click', (e) => this.nextStep(e));
        });
        
        // Previous buttons
        document.querySelectorAll('.btn-prev').forEach(btn => {
            btn.addEventListener('click', (e) => this.previousStep(e));
        });
        
        // Password visibility toggle
        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => this.togglePasswordVisibility(e));
        });
        
        // Password input - real-time validation
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => this.validatePassword(e.target.value));
        }
        
        // Phone number formatting
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => this.formatPhoneNumber(e));
        }
        
        // Tab item click
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const step = parseInt(tab.dataset.step);
                if (step < this.currentStep && this.validateStep(this.currentStep)) {
                    this.goToStep(step);
                }
            });
        });
    }
    
    /**
     * Validate current step before proceeding
     */
    validateStep(step) {
        const errors = [];
        
        if (step === 1) {
            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const department = document.getElementById('department').value.trim();
            
            if (!name) errors.push('Full name is required');
            if (!phone || phone.length !== 10) errors.push('Valid 10-digit phone number is required');
            if (!department) errors.push('Department/Organization is required');
            
            if (errors.length === 0) {
                this.formData.name = name;
                this.formData.phone = phone;
                this.formData.email = document.getElementById('email').value.trim();
                this.formData.department = department;
            }
        } else if (step === 2) {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            if (!password) errors.push('Password is required');
            if (!confirmPassword) errors.push('Please confirm your password');
            if (password !== confirmPassword) errors.push('Passwords do not match');
            if (password.length < 8) errors.push('Password must be at least 8 characters');
            if (!this.isPasswordStrong(password)) {
                errors.push('Password must contain uppercase, lowercase, numbers, and special characters');
            }
            
            if (errors.length === 0) {
                this.formData.password = password;
            }
        } else if (step === 3) {
            const certId = document.getElementById('admin-cert-id').value.trim();
            const terms = document.getElementById('terms').checked;
            
            if (!certId) errors.push('Admin Certification ID is required');
            if (!certId.startsWith('CIVICFIX-ADMIN-')) {
                errors.push('Invalid certification ID format. Must start with "CIVICFIX-ADMIN-"');
            }
            if (!terms) errors.push('You must agree to the terms of service');
            
            if (errors.length === 0) {
                this.formData.admin_cert_id = certId;
            }
        }
        
        if (errors.length > 0) {
            this.showAlert(errors.join('<br>'), 'error');
            return false;
        }
        
        return true;
    }
    
    /**
     * Move to next step
     */
    nextStep(e) {
        e.preventDefault();
        const nextStep = parseInt(e.target.dataset.next);
        
        if (this.validateStep(this.currentStep)) {
            this.goToStep(nextStep);
        }
    }
    
    /**
     * Move to previous step
     */
    previousStep(e) {
        e.preventDefault();
        const prevStep = parseInt(e.target.dataset.prev);
        this.goToStep(prevStep);
    }
    
    /**
     * Go to specific step
     */
    goToStep(step) {
        if (step < 1 || step > this.totalSteps) return;
        
        // Hide current step
        document.getElementById(`step${this.currentStep}`).classList.remove('active');
        document.querySelector(`[data-step="${this.currentStep}"]`).classList.remove('active');
        
        // Show new step
        this.currentStep = step;
        document.getElementById(`step${this.currentStep}`).classList.add('active');
        document.querySelector(`.tab-item[data-step="${this.currentStep}"]`).classList.add('active');
        
        // Scroll to top of form
        document.querySelector('.auth-body').scrollTop = 0;
        
        // Update completed tabs
        this.updateTabStatus();
    }
    
    /**
     * Update tab completion status
     */
    updateTabStatus() {
        document.querySelectorAll('.tab-item').forEach(tab => {
            const step = parseInt(tab.dataset.step);
            if (step < this.currentStep) {
                tab.classList.add('completed');
            } else {
                tab.classList.remove('completed');
            }
        });
    }
    
    /**
     * Validate password strength
     */
    validatePassword(password) {
        const strength = this.getPasswordStrength(password);
        const strengthDiv = document.getElementById('passwordStrength');
        
        // Clear previous classes
        strengthDiv.className = 'password-strength';
        
        if (password.length === 0) {
            strengthDiv.textContent = '';
            return;
        }
        
        strengthDiv.classList.add(strength.level);
        strengthDiv.title = strength.message;
        
        // Update requirements
        this.updatePasswordRequirements(password);
    }
    
    /**
     * Get password strength level
     */
    getPasswordStrength(password) {
        let strength = 0;
        const checks = {
            hasLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };
        
        Object.values(checks).forEach(check => {
            if (check) strength++;
        });
        
        let level = 'weak';
        let message = 'Weak';
        
        if (strength >= 4) {
            level = 'strong';
            message = 'Strong';
        } else if (strength === 3) {
            level = 'good';
            message = 'Good';
        } else if (strength === 2) {
            level = 'fair';
            message = 'Fair';
        }
        
        return { level, message, checks };
    }
    
    /**
     * Check if password is strong
     */
    isPasswordStrong(password) {
        const { checks } = this.getPasswordStrength(password);
        return Object.values(checks).every(v => v === true);
    }
    
    /**
     * Update password requirements checklist
     */
    updatePasswordRequirements(password) {
        const { checks } = this.getPasswordStrength(password);
        
        const requirements = {
            'req-length': checks.hasLength,
            'req-uppercase': checks.hasUppercase,
            'req-lowercase': checks.hasLowercase,
            'req-number': checks.hasNumber,
            'req-special': checks.hasSpecial
        };
        
        Object.entries(requirements).forEach(([id, met]) => {
            const elem = document.getElementById(id);
            if (elem) {
                if (met) {
                    elem.classList.add('met');
                } else {
                    elem.classList.remove('met');
                }
            }
        });
    }
    
    /**
     * Toggle password visibility
     */
    togglePasswordVisibility(e) {
        e.preventDefault();
        const targetId = e.currentTarget.dataset.target;
        const input = document.getElementById(targetId);
        const icon = e.currentTarget.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
    
    /**
     * Format phone number input
     */
    formatPhoneNumber(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        e.target.value = value;
    }
    
    /**
     * Handle form submission
     */
    async handleSubmit(e) {
        e.preventDefault();
        
        // Validate final step
        if (!this.validateStep(3)) return;
        
        const submitBtn = document.getElementById('submitBtn');
        const originalContent = submitBtn.innerHTML;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            const response = await API.post('/auth/register-admin', this.formData);
            
            if (response.success) {
                this.showAlert('Admin registration successful! Redirecting to login...', 'success');
                
                setTimeout(() => {
                    if (window.navigateWithTransition) {
                        window.navigateWithTransition('admin-login.html');
                    } else {
                        window.location.href = 'admin-login.html';
                    }
                }, 2000);
            } else {
                this.showAlert(response.message, 'error');
            }
        } catch (error) {
            this.showAlert(error.message || 'Registration failed. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalContent;
        }
    }
    
    /**
     * Show alert message
     */
    showAlert(message, type = 'info') {
        const container = document.getElementById('alertContainer');
        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-warning',
            info: 'fa-info-circle'
        };
        
        alert.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <div>${message}</div>
        `;
        
        container.innerHTML = '';
        container.appendChild(alert);
        
        // Auto-remove success alerts
        if (type === 'success') {
            setTimeout(() => {
                alert.remove();
            }, 4000);
        }
    }
    
    /**
     * Initialize dark mode toggle
     */
    initDarkMode() {
        const toggleBtn = document.getElementById('darkModeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleDarkMode());
            
            // Load saved preference
            const isDarkMode = localStorage.getItem('darkMode') === 'true';
            if (isDarkMode) {
                document.body.classList.add('dark-mode');
            }
        }
    }
    
    /**
     * Toggle dark mode
     */
    toggleDarkMode() {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AdminRegistration();
});
