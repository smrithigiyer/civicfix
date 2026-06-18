/**
 * CivicFix - Dashboard JavaScript
 * ===============================
 * Handles citizen dashboard functionality.
 */

let allComplaints = [];

function getPlaceName(complaint) {
    if (complaint.place_name && complaint.place_name.trim()) {
        return complaint.place_name.trim();
    }

    if (complaint.address && complaint.address.trim()) {
        const invalidAddressTexts = ['address lookup failed', 'address not found', 'lookup failed'];
        const lower = complaint.address.toLowerCase();
        if (invalidAddressTexts.some(text => lower.includes(text))) {
            return complaint.location
                ? `Near (${complaint.location.lat.toFixed(4)}, ${complaint.location.lng.toFixed(4)})`
                : 'Place unavailable';
        }

        const parts = complaint.address.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) return parts[1];
        if (parts.length >= 1) return parts[0];
    }

    if (complaint.location) {
        return `Near (${complaint.location.lat.toFixed(4)}, ${complaint.location.lng.toFixed(4)})`;
    }

    return 'Place unavailable';
}

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!auth.isAuthenticated()) {
        showLoginModal();
        return;
    }
    
    // Load complaints
    loadComplaints();
    
    // Setup filters
    setupFilters();
});

/**
 * Show login modal
 */
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Load user's complaints
 */
async function loadComplaints() {
    const loadingState = document.getElementById('loadingState');
    const complaintsList = document.getElementById('complaintsList');
    const emptyState = document.getElementById('emptyState');
    
    if (loadingState) loadingState.style.display = 'block';
    if (complaintsList) complaintsList.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    
    try {
        const result = await api.getMyComplaints();
        
        if (result.success) {
            allComplaints = result.data.complaints || [];
            updateStats();
            renderComplaints(allComplaints);
        } else {
            showAlert(result.message, 'error');
        }
    } catch (error) {
        console.error('Failed to load complaints:', error);
        showAlert('Failed to load complaints. Please try again.', 'error');
    } finally {
        if (loadingState) loadingState.style.display = 'none';
    }
}

/**
 * Update statistics cards
 */
function updateStats() {
    const total = allComplaints.length;
    const pending = allComplaints.filter(c => c.status === 'Pending').length;
    const inProgress = allComplaints.filter(c => c.status === 'In Progress').length;
    const solved = allComplaints.filter(c => c.status === 'Solved').length;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('inProgressCount').textContent = inProgress;
    document.getElementById('solvedCount').textContent = solved;
}

/**
 * Render complaints list
 */
function renderComplaints(complaints) {
    const complaintsList = document.getElementById('complaintsList');
    const emptyState = document.getElementById('emptyState');
    const complaintsCount = document.getElementById('complaintsCount');
    
    if (!complaintsList) return;
    
    // Update count
    if (complaintsCount) {
        complaintsCount.textContent = `${complaints.length} complaint${complaints.length !== 1 ? 's' : ''}`;
    }
    
    // Show empty state if no complaints
    if (complaints.length === 0) {
        complaintsList.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    // Render complaints
    complaintsList.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
    
    complaintsList.innerHTML = complaints.map(complaint => createComplaintCardHTML(complaint)).join('');
    
    // Add click handlers
    complaintsList.querySelectorAll('.complaint-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('a') && !e.target.closest('button')) {
                const complaintId = card.dataset.id;
                showComplaintDetail(complaintId);
            }
        });
    });

    complaintsList.querySelectorAll('.btn-view-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showComplaintDetail(btn.dataset.id);
        });
    });
}

/**
 * Create complaint card HTML
 */
function createComplaintCardHTML(complaint) {
    const imagesHtml = complaint.images && complaint.images.length > 0
        ? `<div class="complaint-images">
            ${complaint.images.slice(0, 3).map(img => 
                `<img src="/uploads/complaints/${img}" alt="Complaint image" loading="lazy">`
            ).join('')}
            ${complaint.images.length > 3 ? `<span class="more-images">+${complaint.images.length - 3}</span>` : ''}
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
                <p class="complaint-description">${escapeHtml(complaint.description)}</p>
                ${imagesHtml}
            </div>
            <div class="complaint-footer">
                <div class="complaint-meta">
                    <span><i class="fas fa-calendar"></i> ${formatRelativeTime(complaint.created_at)}</span>
                </div>
                <button class="btn btn-small btn-primary btn-view-details" data-id="${complaint.id}">View Details</button>
            </div>
        </div>
    `;
}

/**
 * Setup filter handlers
 */
function setupFilters() {
    const filterStatus = document.getElementById('filterStatus');
    const filterPriority = document.getElementById('filterPriority');
    const clearFilters = document.getElementById('clearFilters');
    
    function applyFilters() {
        let filtered = [...allComplaints];
        
        if (filterStatus && filterStatus.value) {
            filtered = filtered.filter(c => c.status === filterStatus.value);
        }
        
        if (filterPriority && filterPriority.value) {
            filtered = filtered.filter(c => c.priority === filterPriority.value);
        }
        
        renderComplaints(filtered);
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', applyFilters);
    }
    
    if (filterPriority) {
        filterPriority.addEventListener('change', applyFilters);
    }
    
    if (clearFilters) {
        clearFilters.addEventListener('click', () => {
            if (filterStatus) filterStatus.value = '';
            if (filterPriority) filterPriority.value = '';
            renderComplaints(allComplaints);
        });
    }
}

/**
 * Show complaint detail modal
 */
async function showComplaintDetail(complaintId) {
    let complaint = allComplaints.find(c => c.id === complaintId);
    if (!complaint) return;

    try {
        const result = await api.getComplaint(complaintId);
        if (result.success && result.data && result.data.complaint) {
            complaint = result.data.complaint;
            allComplaints = allComplaints.map(c => c.id === complaintId ? complaint : c);
        } else if (result.message && result.message.toLowerCase().includes('not found')) {
            showAlert('This solved complaint has been auto-removed.', 'info');
            await loadComplaints();
            return;
        }
    } catch (error) {
        console.warn('Failed to refresh complaint details:', error);
    }
    
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');
    
    // Build detail HTML
    const imagesHtml = complaint.images && complaint.images.length > 0
        ? `<div class="detail-section">
            <h4><i class="fas fa-images"></i> Photos</h4>
            <div class="detail-images">
                ${complaint.images.map(img => 
                    `<img src="/uploads/complaints/${img}" alt="Complaint photo" onclick="window.open(this.src, '_blank')">`
                ).join('')}
            </div>
           </div>`
        : '';
    
    const remarksHtml = complaint.admin_remarks
        ? `<div class="detail-section detail-remarks">
            <h4><i class="fas fa-comment"></i> Admin Remarks</h4>
            <p>${escapeHtml(complaint.admin_remarks)}</p>
           </div>`
        : '';
    
    const resolutionHtml = complaint.resolution_proof
        ? `<div class="detail-section resolution-proof">
            <h4><i class="fas fa-check-circle"></i> Resolution Proof</h4>
            <img src="/uploads/resolutions/${complaint.resolution_proof}" alt="Resolution proof" onclick="window.open(this.src, '_blank')">
           </div>`
        : '';
    
    content.innerHTML = `
        <div class="detail-content">
            <div class="detail-header">
                <div class="detail-title">
                    <i class="fas ${getComplaintTypeIcon(complaint.complaint_type)}"></i>
                    <h3>${getComplaintTypeLabel(complaint.complaint_type)}</h3>
                </div>
                <div class="detail-badges">
                    ${getPriorityBadge(complaint.priority)}
                    ${getStatusBadge(complaint.status)}
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-align-left"></i> Description</h4>
                <p>${escapeHtml(complaint.description)}</p>
            </div>
            
            ${imagesHtml}
            
            <div class="detail-section">
                <h4><i class="fas fa-info-circle"></i> Details</h4>
                <div class="detail-meta">
                    <div class="meta-item">
                        <label>Complaint ID</label>
                        <span>#${complaint.id.slice(-8).toUpperCase()}</span>
                    </div>
                    <div class="meta-item">
                        <label>Submitted On</label>
                        <span>${formatDate(complaint.created_at)}</span>
                    </div>
                    <div class="meta-item">
                        <label>Priority Score</label>
                        <span>${(complaint.priority_score * 100).toFixed(0)}%</span>
                    </div>
                    <div class="meta-item">
                        <label>Place</label>
                        <span>${escapeHtml(getPlaceName(complaint))}</span>
                    </div>
                    <div class="meta-item">
                        <label>Last Updated</label>
                        <span>${formatRelativeTime(complaint.updated_at)}</span>
                    </div>
                    ${complaint.status === 'Solved' && complaint.auto_delete_at ? `
                    <div class="meta-item">
                        <label>Auto Delete</label>
                        <span>${formatDate(complaint.auto_delete_at)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${remarksHtml}
            ${resolutionHtml}
            
            ${complaint.priority_override_reason ? `
                <div class="detail-section" style="background: #fee2e2; border: 1px solid #fecaca;">
                    <h4 style="color: #991b1b;"><i class="fas fa-exclamation-triangle"></i> Priority Override Reason</h4>
                    <p style="color: #991b1b;">${escapeHtml(complaint.priority_override_reason)}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    modal.classList.add('active');
    
    // Close handler
    document.getElementById('closeDetailModal').onclick = () => {
        modal.classList.remove('active');
    };
    
    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    };
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
