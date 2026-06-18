/**
 * CivicFix - Main JavaScript
 * ==========================
 * Common functionality and utilities for all pages.
 */

// ==================== Server Time Synchronization ====================

/**
 * Server time offset (ms) - set by syncing with server
 * This ensures all relative time calculations use server time instead of client time
 */
let serverTimeOffset = 0;

/**
 * Sync client time with server time
 * Call this on page load to ensure accurate timestamps
 * Server uses IST (Indian Standard Time, UTC+5:30)
 */
async function syncServerTime() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/server-time`);
        const data = await response.json();
        
        if (data.success && data.timestamp) {
            // Calculate offset: server time - client time
            const clientTime = Date.now();
            serverTimeOffset = data.timestamp - clientTime;
            console.log(`✓ Server time synced (IST). Offset: ${serverTimeOffset}ms`);
            console.log(`  Server time: ${data.readable_format}`);
            console.log(`  Timezone: ${data.timezone}`);
            return true;
        }
    } catch (error) {
        console.warn('Failed to sync server time:', error);
        serverTimeOffset = 0; // Fallback to client time if sync fails
    }
    return false;
}

/**
 * Get current server time in milliseconds
 */
function getServerTime() {
    return Date.now() + serverTimeOffset;
}

// Sync server time on page load
document.addEventListener('DOMContentLoaded', () => {
    syncServerTime();
}, { once: true });

/**
 * Format date for display
 * Accepts either timestamp in milliseconds or ISO string
 */
function formatDate(dateInput) {
    if (!dateInput) return 'N/A';
    
    // Handle both milliseconds and ISO string formats
    const date = typeof dateInput === 'number' 
        ? new Date(dateInput) 
        : new Date(dateInput);
    
    if (isNaN(date.getTime())) return 'N/A';
    
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return date.toLocaleDateString('en-IN', options);
}

/**
 * Format relative time (e.g., "2 hours ago")
 * Accepts either timestamp in milliseconds or ISO string
 * Uses server time for accurate calculations instead of client time
 */
function formatRelativeTime(dateInput) {
    if (!dateInput) return 'N/A';
    
    // Handle both milliseconds and ISO string formats
    const date = typeof dateInput === 'number' 
        ? new Date(dateInput) 
        : new Date(dateInput);
    
    if (isNaN(date.getTime())) return 'N/A';
    
    // Use server time instead of client time for accurate relative time
    const now = new Date(getServerTime());
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    
    return formatDate(dateInput);
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info', container = null) {
    const alertContainer = container || document.getElementById('alertContainer');
    if (!alertContainer) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

/**
 * Show loading state on button
 */
function showButtonLoading(button, loadingText = 'Loading...') {
    button.dataset.originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<div class="spinner"></div> ${loadingText}`;
}

/**
 * Hide loading state on button
 */
function hideButtonLoading(button) {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || button.innerText;
}

/**
 * Validate phone number
 */
function validatePhone(phone) {
    return CONFIG.VALIDATION.PHONE_REGEX.test(phone);
}

/**
 * Validate password
 */
function validatePassword(password) {
    return password.length >= CONFIG.VALIDATION.MIN_PASSWORD_LENGTH;
}

/**
 * Validate email
 */
function validateEmail(email) {
    if (!email) return true; // Email is optional
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Get complaint type label
 */
function getComplaintTypeLabel(value) {
    const type = CONFIG.COMPLAINT_TYPES.find(t => t.value === value);
    return type ? type.label : value;
}

/**
 * Get complaint type icon
 */
function getComplaintTypeIcon(value) {
    const type = CONFIG.COMPLAINT_TYPES.find(t => t.value === value);
    return type ? type.icon : 'fa-question';
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
    const statusConfig = CONFIG.STATUSES.find(s => s.value === status);
    const className = status.toLowerCase().replace(' ', '-');
    
    return `<span class="badge badge-${className}">
        <span class="status-dot ${className}"></span>
        ${statusConfig ? statusConfig.label : status}
    </span>`;
}

/**
 * Get priority badge HTML
 */
function getPriorityBadge(priority) {
    const priorityConfig = CONFIG.PRIORITIES.find(p => p.value === priority);
    const className = priority.toLowerCase();
    
    return `<span class="badge badge-${className}">
        <i class="fas fa-flag"></i>
        ${priorityConfig ? priorityConfig.label : priority}
    </span>`;
}

/**
 * Create complaint card HTML
 */
function createComplaintCard(complaint, isAdmin = false) {
    const imagesHtml = complaint.images && complaint.images.length > 0
        ? `<div class="complaint-images">
            ${complaint.images.slice(0, 3).map(img => 
                `<img src="/uploads/complaints/${img}" alt="Complaint image" loading="lazy">`
            ).join('')}
            ${complaint.images.length > 3 ? `<span class="more-images">+${complaint.images.length - 3}</span>` : ''}
           </div>`
        : '';
    
    const citizenInfo = isAdmin && complaint.citizen_info
        ? `<div class="complaint-citizen">
            <i class="fas fa-user"></i>
            <span>${complaint.citizen_info.name} (${complaint.citizen_info.phone})</span>
           </div>`
        : '';
    
    return `
        <div class="complaint-card" data-id="${complaint.id}">
            <div class="complaint-header">
                <div class="complaint-type">
                    <i class="fas ${getComplaintTypeIcon(complaint.complaint_type)}"></i>
                    <span>${getComplaintTypeLabel(complaint.complaint_type)}</span>
                </div>
                <div class="complaint-badges">
                    ${getPriorityBadge(complaint.priority)}
                    ${getStatusBadge(complaint.status)}
                </div>
            </div>
            <div class="complaint-body">
                <p class="complaint-description">${complaint.description}</p>
                ${imagesHtml}
                ${citizenInfo}
            </div>
            <div class="complaint-footer">
                <div class="complaint-meta">
                    <span><i class="fas fa-calendar"></i> ${formatRelativeTime(complaint.created_at)}</span>
                    <span><i class="fas fa-map-marker-alt"></i> Location</span>
                </div>
                <a href="complaint-detail.html?id=${complaint.id}" class="btn btn-small btn-primary">
                    View Details
                </a>
            </div>
        </div>
    `;
}

// ==================== Page Transitions ====================

const PAGE_TRANSITION_MS = 220;

function navigateWithTransition(url) {
    if (!url || document.body.classList.contains('page-exit')) {
        return;
    }

    document.body.classList.add('page-exit');
    setTimeout(() => {
        window.location.href = url;
    }, PAGE_TRANSITION_MS);
}

function initPageTransitions() {
    if (!document.body) return;

    requestAnimationFrame(() => {
        document.body.classList.add('page-ready');
    });

    document.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        const anchor = event.target.closest('a[href]');
        if (!anchor) return;

        if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
        if (anchor.hasAttribute('data-no-transition')) return;

        const href = anchor.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
            return;
        }

        let targetUrl;
        try {
            targetUrl = new URL(anchor.href, window.location.href);
        } catch {
            return;
        }

        const current = new URL(window.location.href);
        if (targetUrl.origin !== current.origin) return;
        if (targetUrl.pathname === current.pathname && targetUrl.search === current.search) return;

        event.preventDefault();
        navigateWithTransition(targetUrl.href);
    });
}

window.navigateWithTransition = navigateWithTransition;

// ==================== Navigation ====================

document.addEventListener('DOMContentLoaded', () => {
    initPageTransitions();
    // Mobile navigation toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    
    // Login modal
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const closeLoginModal = document.getElementById('closeLoginModal');
    
    if (loginBtn && loginModal) {
        loginBtn.addEventListener('click', () => {
            loginModal.classList.add('active');
        });
    }
    
    if (closeLoginModal && loginModal) {
        closeLoginModal.addEventListener('click', () => {
            loginModal.classList.remove('active');
        });
        
        // Close on outside click
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                loginModal.classList.remove('active');
            }
        });
    }
    
    // Password toggle
    const togglePassword = document.getElementById('togglePassword');
    const loginPassword = document.getElementById('loginPassword');
    
    if (togglePassword && loginPassword) {
        togglePassword.addEventListener('click', () => {
            const type = loginPassword.type === 'password' ? 'text' : 'password';
            loginPassword.type = type;
            togglePassword.innerHTML = `<i class="fas fa-eye${type === 'password' ? '' : '-slash'}"></i>`;
        });
    }
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const phone = document.getElementById('loginPhone').value.trim();
            const password = document.getElementById('loginPassword').value;
            const loginError = document.getElementById('loginError');
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            // Validate
            if (!validatePhone(phone)) {
                loginError.textContent = 'Please enter a valid 10-digit phone number.';
                loginError.classList.add('active');
                return;
            }
            
            if (!password) {
                loginError.textContent = 'Please enter your password.';
                loginError.classList.add('active');
                return;
            }
            
            loginError.classList.remove('active');
            showButtonLoading(submitBtn, 'Logging in...');
            
            const result = await auth.login(phone, password);
            
            hideButtonLoading(submitBtn);
            
            if (result.success) {
                loginModal.classList.remove('active');
                window.location.reload();
            } else {
                loginError.textContent = result.message;
                loginError.classList.add('active');
            }
        });
    }
    
    // Set active nav link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
});

// ==================== Dark Mode ====================

/**
 * Initialize dark mode support
 */
function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    if (!darkModeToggle) return;
    
    // Load saved preference from localStorage
    const isDarkMode = localStorage.getItem('civicfix-dark-mode') === 'true';
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        updateDarkModeIcon(true);
    }
    
    // Add click event listener
    darkModeToggle.addEventListener('click', toggleDarkMode);
}

/**
 * Toggle dark mode
 */
function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('civicfix-dark-mode', isDarkMode);
    updateDarkModeIcon(isDarkMode);
}

/**
 * Update dark mode icon
 */
function updateDarkModeIcon(isDarkMode) {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (!darkModeToggle) return;
    
    const icon = darkModeToggle.querySelector('i');
    if (isDarkMode) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

/**
 * Apply system dark mode preference on first visit
 */
function applySystemDarkModePreference() {
    const hasPreference = localStorage.getItem('civicfix-dark-mode');
    
    if (hasPreference === null) {
        // No preference saved, check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('civicfix-dark-mode', 'true');
            updateDarkModeIcon(true);
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    applySystemDarkModePreference();
    initDarkMode();
});

// ==================== Export ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatDate,
        formatRelativeTime,
        showAlert,
        showButtonLoading,
        hideButtonLoading,
        validatePhone,
        validatePassword,
        validateEmail,
        getComplaintTypeLabel,
        getComplaintTypeIcon,
        getStatusBadge,
        getPriorityBadge,
        createComplaintCard,
        validateImage,
        previewImage,
        createImagePreview,
        initDarkMode,
        toggleDarkMode
    };
}
