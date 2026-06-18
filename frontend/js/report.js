/**
 * CivicFix - Report Page JavaScript
 * =================================
 * Handles complaint submission and image upload.
 * Map and geolocation managed by GeolocationManager class.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!auth.isAuthenticated()) {
        showLoginModal();
        return;
    }

    // Initialize geolocation and map
    if (!geolocationManager.initialize()) {
        console.warn('Geolocation manager initialization had issues');
    }

    // Setup image upload
    setupImageUpload();

    // Setup location detection button
    setupLocationDetection();

    // Setup form submission
    setupFormSubmission();

    // Setup map resize on window resize
    window.addEventListener('resize', () => {
        geolocationManager.resizeMap();
    });

    // Handle tab visibility change to resize map when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            setTimeout(() => {
                geolocationManager.resizeMap();
            }, 100);
        }
    });
});

/**
 * Show login modal if user not authenticated
 */
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('active');
    }

    const closeBtn = document.getElementById('closeLoginModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (window.navigateWithTransition) {
                window.navigateWithTransition('index.html');
            } else {
                window.location.href = 'index.html';
            }
        });
    }
}

/**
 * Setup location detection button
 */
function setupLocationDetection() {
    const detectBtn = document.getElementById('detectLocation');
    const recenterBtn = document.getElementById('recenterMap');

    if (detectBtn) {
        detectBtn.addEventListener('click', (e) => {
            e.preventDefault();
            geolocationManager.requestGeolocation();
        });
    }

    if (recenterBtn) {
        recenterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            geolocationManager.recenterMap();
        });
    }
}

/**
 * Global variables for image upload
 */
let uploadedFiles = [];

/**
 * Setup image upload functionality
 */
function setupImageUpload() {
    const uploadZone = document.getElementById('uploadZone');
    const imageInput = document.getElementById('imageInput');
    const previewsContainer = document.getElementById('imagePreviews');

    if (!uploadZone || !imageInput) {
        console.warn('Image upload elements not found');
        return;
    }

    // Click to browse
    uploadZone.addEventListener('click', () => {
        imageInput.click();
    });

    // File selection
    imageInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    /**
     * Handle dropped/selected files
     */
    function handleFiles(files) {
        Array.from(files).forEach(file => {
            // Check max images
            const maxImages = 5;
            if (uploadedFiles.length >= maxImages) {
                showAlert(`Maximum ${maxImages} images allowed.`, 'warning');
                return;
            }

            // Validate image
            const validation = validateImage(file);
            if (!validation.valid) {
                showAlert(validation.error, 'error');
                return;
            }

            // Add to uploaded files
            uploadedFiles.push(file);

            // Create preview
            const preview = createImagePreview(file, () => {
                uploadedFiles = uploadedFiles.filter(f => f !== file);
            });

            previewsContainer.appendChild(preview);
        });
    }
}

/**
 * Validate image file
 */
function validateImage(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Only JPG, PNG, GIF, and WebP images are allowed'
        };
    }

    if (file.size > maxSize) {
        return {
            valid: false,
            error: `Image size must be less than 5MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
        };
    }

    return { valid: true };
}

/**
 * Create image preview element
 */
function createImagePreview(file, onRemove) {
    const preview = document.createElement('div');
    preview.className = 'image-preview';

    const reader = new FileReader();
    reader.onload = (e) => {
        preview.innerHTML = `
            <img src="${e.target.result}" alt="Preview">
            <button type="button" class="remove-image" title="Remove image">
                <i class="fas fa-trash"></i>
            </button>
        `;

        const removeBtn = preview.querySelector('.remove-image');
        removeBtn.addEventListener('click', (event) => {
            event.preventDefault();
            preview.remove();
            onRemove();
        });
    };

    reader.readAsDataURL(file);
    return preview;
}

/**
 * Setup form submission
 */
function setupFormSubmission() {
    const form = document.getElementById('reportForm');
    const submitBtn = document.getElementById('submitBtn');

    if (!form) {
        console.warn('Report form not found');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate location
        const coords = geolocationManager.getCoordinates();
        if (!coords) {
            showAlert('Please set the location on the map.', 'error');
            return;
        }

        // Create form data
        const formData = new FormData(form);

        // Ensure coordinates are set
        formData.set('lat', coords.lat);
        formData.set('lng', coords.lng);

        // Add images
        uploadedFiles.forEach(file => {
            formData.append('images', file);
        });

        // Show loading
        showButtonLoading(submitBtn, 'Submitting...');

        try {
            const result = await api.submitComplaint(formData);

            if (result.success) {
                showAlert(
                    `✓ Complaint submitted successfully! Priority: ${result.data.priority}`,
                    'success'
                );

                // Redirect to dashboard after delay
                setTimeout(() => {
                    if (window.navigateWithTransition) {
                        window.navigateWithTransition('dashboard.html');
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }, 2000);
            } else {
                showAlert(result.message || 'Failed to submit complaint', 'error');
            }
        } catch (error) {
            console.error('Submission error:', error);
            showAlert('Failed to submit complaint. Please try again.', 'error');
        } finally {
            hideButtonLoading(submitBtn);
        }
    });
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alertEl = document.createElement('div');
    const iconMap = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };

    const icon = iconMap[type] || 'fa-info-circle';
    alertEl.className = `alert alert-${type}`;
    alertEl.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    alertContainer.insertBefore(alertEl, alertContainer.firstChild);

    // Auto-remove after 6 seconds
    setTimeout(() => {
        alertEl.remove();
    }, 6000);
}

/**
 * Show button loading state
 */
function showButtonLoading(btn, text = 'Loading...') {
    if (!btn) return;
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
}

/**
 * Hide button loading state
 */
function hideButtonLoading(btn) {
    if (!btn) return;
    btn.disabled = false;
    if (btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
    }
}
