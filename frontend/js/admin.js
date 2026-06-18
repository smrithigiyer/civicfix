/**
 * CivicFix - Admin Dashboard JavaScript
 * =====================================
 * Handles admin dashboard functionality.
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
    // Check admin authentication
    if (!auth.isAuthenticated()) {
        if (window.navigateWithTransition) {
            window.navigateWithTransition('admin-login.html');
        } else {
            window.location.href = 'admin-login.html';
        }
        return;
    }
    
    if (!auth.isAdmin()) {
        showAlert('Access denied. Admin privileges required.', 'error');
        auth.logout();
        return;
    }
    
    // Load complaints
    loadComplaints();
    
    // Setup filters
    setupFilters();
    
    // Setup modals
    setupModals();
});

/**
 * Load all complaints
 */
async function loadComplaints() {
    const loadingState = document.getElementById('loadingState');
    const table = document.getElementById('complaintsTable');
    const emptyState = document.getElementById('emptyState');
    
    if (loadingState) loadingState.style.display = 'block';
    if (table) table.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    
    try {
        const result = await api.getAllComplaints();
        
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
    const high = allComplaints.filter(c => c.priority === 'HIGH').length;
    const pending = allComplaints.filter(c => c.status === 'Pending').length;
    const solved = allComplaints.filter(c => c.status === 'Solved').length;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('highCount').textContent = high;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('solvedCount').textContent = solved;
}

/**
 * Render complaints table
 */
function renderComplaints(complaints) {
    const tbody = document.getElementById('complaintsTableBody');
    const table = document.getElementById('complaintsTable');
    const emptyState = document.getElementById('emptyState');
    const complaintsCount = document.getElementById('complaintsCount');
    
    if (!tbody) return;
    
    // Update count
    if (complaintsCount) {
        complaintsCount.textContent = `${complaints.length} complaint${complaints.length !== 1 ? 's' : ''}`;
    }
    
    // Show empty state if no complaints
    if (complaints.length === 0) {
        if (table) table.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    // Render table
    if (table) table.style.display = 'table';
    if (emptyState) emptyState.style.display = 'none';
    
    tbody.innerHTML = complaints.map(complaint => createTableRowHTML(complaint)).join('');
    
    // Add action handlers
    tbody.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => showComplaintDetail(btn.dataset.id));
    });
    
    tbody.querySelectorAll('.btn-status').forEach(btn => {
        btn.addEventListener('click', () => openStatusModal(btn.dataset.id));
    });
    
    tbody.querySelectorAll('.btn-priority').forEach(btn => {
        btn.addEventListener('click', () => openPriorityModal(btn.dataset.id));
    });
}

/**
 * Create table row HTML
 */
function createTableRowHTML(complaint) {
    const shortId = complaint.id.slice(-8).toUpperCase();
    const shortDesc = complaint.description.length > 50 
        ? complaint.description.substring(0, 50) + '...' 
        : complaint.description;
    
    return `
        <tr>
            <td><span class="complaint-id">#${shortId}</span></td>
            <td>
                <div class="complaint-type-cell">
                    <i class="fas ${getComplaintTypeIcon(complaint.complaint_type)}"></i>
                    <span>${getComplaintTypeLabel(complaint.complaint_type)}</span>
                </div>
            </td>
            <td><span class="complaint-desc" title="${escapeHtml(complaint.description)}">${escapeHtml(shortDesc)}</span></td>
            <td>
                <div class="citizen-info">
                    <span class="citizen-name">${escapeHtml(complaint.citizen_info?.name || 'Unknown')}</span>
                    <span class="citizen-phone">${complaint.citizen_info?.phone || ''}</span>
                </div>
            </td>
            <td>${getPriorityBadge(complaint.priority)}</td>
            <td>${getStatusBadge(complaint.status)}</td>
            <td>${formatRelativeTime(complaint.created_at)}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn btn-small btn-primary btn-view" data-id="${complaint.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-small btn-secondary btn-status" data-id="${complaint.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-outline btn-priority" data-id="${complaint.id}">
                        <i class="fas fa-flag"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Setup filter handlers
 */
function setupFilters() {
    const filterStatus = document.getElementById('filterStatus');
    const filterPriority = document.getElementById('filterPriority');
    const filterType = document.getElementById('filterType');
    const clearFilters = document.getElementById('clearFilters');
    const refreshBtn = document.getElementById('refreshBtn');
    
    function applyFilters() {
        let filtered = [...allComplaints];
        
        if (filterStatus && filterStatus.value) {
            filtered = filtered.filter(c => c.status === filterStatus.value);
        }
        
        if (filterPriority && filterPriority.value) {
            filtered = filtered.filter(c => c.priority === filterPriority.value);
        }
        
        if (filterType && filterType.value) {
            filtered = filtered.filter(c => c.complaint_type === filterType.value);
        }
        
        renderComplaints(filtered);
    }
    
    if (filterStatus) filterStatus.addEventListener('change', applyFilters);
    if (filterPriority) filterPriority.addEventListener('change', applyFilters);
    if (filterType) filterType.addEventListener('change', applyFilters);
    
    if (clearFilters) {
        clearFilters.addEventListener('click', () => {
            if (filterStatus) filterStatus.value = '';
            if (filterPriority) filterPriority.value = '';
            if (filterType) filterType.value = '';
            renderComplaints(allComplaints);
        });
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadComplaints();
        });
    }
}

/**
 * Setup modal handlers
 */
function setupModals() {
    // Status modal
    const statusModal = document.getElementById('statusModal');
    const closeStatusModal = document.getElementById('closeStatusModal');
    const statusForm = document.getElementById('statusForm');
    const newStatus = document.getElementById('newStatus');
    const resolutionProofGroup = document.getElementById('resolutionProofGroup');
    
    if (closeStatusModal) {
        closeStatusModal.addEventListener('click', () => {
            statusModal.classList.remove('active');
        });
    }
    
    if (newStatus) {
        newStatus.addEventListener('change', () => {
            resolutionProofGroup.style.display = newStatus.value === 'Solved' ? 'block' : 'none';
        });
    }
    
    if (statusForm) {
        statusForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const complaintId = document.getElementById('statusComplaintId').value;
            const status = document.getElementById('newStatus').value;
            const remarks = document.getElementById('adminRemarks').value;
            const proofFile = document.getElementById('resolutionProof').files[0];
            
            // Validate inputs
            if (!status) {
                showAlert('Please select a status.', 'warning');
                return;
            }
            
            // Require resolution proof for Solved status
            if (status === 'Solved' && !proofFile) {
                showAlert('Resolution proof image is required when marking as Solved.', 'warning');
                return;
            }
            
            // Validate proof file if provided
            if (proofFile) {
                const maxSize = 5 * 1024 * 1024; // 5MB
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                
                if (!allowedTypes.includes(proofFile.type)) {
                    showAlert('Resolution proof must be an image (JPG, PNG, GIF, or WebP).', 'warning');
                    return;
                }
                
                if (proofFile.size > maxSize) {
                    showAlert('Resolution proof image must be less than 5MB.', 'warning');
                    return;
                }
            }
            
            // Show loading state
            const submitBtn = statusForm.querySelector('button[type="submit"]');
            showButtonLoading(submitBtn, 'Updating...');
            
            try {
                const result = await api.updateComplaintStatus(complaintId, status, remarks, proofFile);
                
                if (result.success) {
                    showAlert('✓ Status updated successfully!', 'success');
                    setTimeout(() => {
                        statusModal.classList.remove('active');
                        loadComplaints();
                    }, 1000);
                } else {
                    showAlert(result.message || 'Failed to update status.', 'error');
                }
            } catch (error) {
                console.error('Status update error:', error);
                showAlert('An error occurred while updating status. Please try again.', 'error');
            } finally {
                hideButtonLoading(submitBtn);
            }
        });
    }
    
    // Priority modal
    const priorityModal = document.getElementById('priorityModal');
    const closePriorityModal = document.getElementById('closePriorityModal');
    const priorityForm = document.getElementById('priorityForm');
    
    if (closePriorityModal) {
        closePriorityModal.addEventListener('click', () => {
            priorityModal.classList.remove('active');
        });
    }
    
    if (priorityForm) {
        priorityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const complaintId = document.getElementById('priorityComplaintId').value;
            const priority = document.getElementById('newPriority').value;
            const reason = document.getElementById('priorityReason').value;
            
            if (reason.length < 10) {
                showAlert('Reason must be at least 10 characters.', 'error');
                return;
            }
            
            const result = await api.overridePriority(complaintId, priority, reason);
            
            if (result.success) {
                showAlert('Priority overridden successfully!', 'success');
                priorityModal.classList.remove('active');
                loadComplaints();
            } else {
                showAlert(result.message, 'error');
            }
        });
    }
    
    // Detail modal
    const closeDetailModal = document.getElementById('closeDetailModal');
    if (closeDetailModal) {
        closeDetailModal.addEventListener('click', () => {
            document.getElementById('detailModal').classList.remove('active');
        });
    }
}

/**
 * Open status update modal
 */
function openStatusModal(complaintId) {
    const complaint = allComplaints.find(c => c.id === complaintId);
    if (!complaint) return;
    
    document.getElementById('statusComplaintId').value = complaintId;
    document.getElementById('newStatus').value = complaint.status;
    document.getElementById('adminRemarks').value = complaint.admin_remarks || '';
    document.getElementById('resolutionProofGroup').style.display = 'none';
    document.getElementById('resolutionProof').value = '';
    
    document.getElementById('statusModal').classList.add('active');
}

/**
 * Open priority override modal
 */
function openPriorityModal(complaintId) {
    const complaint = allComplaints.find(c => c.id === complaintId);
    if (!complaint) return;
    
    document.getElementById('priorityComplaintId').value = complaintId;
    document.getElementById('newPriority').value = complaint.priority;
    document.getElementById('priorityReason').value = '';
    
    document.getElementById('priorityModal').classList.add('active');
}

/**
 * Show complaint detail modal
 */
function showComplaintDetail(complaintId) {
    const complaint = allComplaints.find(c => c.id === complaintId);
    if (!complaint) return;
    
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');
    
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
                        <label>Citizen</label>
                        <span>${escapeHtml(complaint.citizen_info?.name || 'Unknown')} (${complaint.citizen_info?.phone || 'N/A'})</span>
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
                        <label>Last Updated</label>
                        <span>${formatRelativeTime(complaint.updated_at)}</span>
                    </div>
                    <div class="meta-item">
                        <label>Place</label>
                        <span>${escapeHtml(getPlaceName(complaint))}</span>
                    </div>
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
