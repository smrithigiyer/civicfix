/**
 * CivicFix - API Module
 * =====================
 * Handles all API requests to the backend.
 */

class APIManager {
    /**
     * Make authenticated GET request
     */
    async get(endpoint) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...auth.getAuthHeaders()
            };
            
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers
            });
            
            const data = await response.json();
            
            // Handle unauthorized
            if (response.status === 401) {
                auth.clearAuth();
                if (window.navigateWithTransition) {
                    window.navigateWithTransition('index.html');
                } else {
                    window.location.href = 'index.html';
                }
                return { success: false, message: 'Session expired. Please login again.' };
            }
            
            return data;
        } catch (error) {
            console.error('API GET error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }
    
    /**
     * Make authenticated POST request with JSON body
     */
    async post(endpoint, body) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...auth.getAuthHeaders()
            };
            
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });
            
            const data = await response.json();
            
            if (response.status === 401) {
                auth.clearAuth();
                if (window.navigateWithTransition) {
                    window.navigateWithTransition('index.html');
                } else {
                    window.location.href = 'index.html';
                }
                return { success: false, message: 'Session expired. Please login again.' };
            }
            
            return data;
        } catch (error) {
            console.error('API POST error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }
    
    /**
     * Make authenticated POST request with FormData (for file uploads)
     */
    async postFormData(endpoint, formData) {
        try {
            const headers = auth.getAuthHeaders();
            // Don't set Content-Type for FormData - browser will set it with boundary
            
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers,
                body: formData
            });
            
            const data = await response.json();
            
            if (response.status === 401) {
                auth.clearAuth();
                if (window.navigateWithTransition) {
                    window.navigateWithTransition('index.html');
                } else {
                    window.location.href = 'index.html';
                }
                return { success: false, message: 'Session expired. Please login again.' };
            }
            
            return data;
        } catch (error) {
            console.error('API POST FormData error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }
    
    /**
     * Make authenticated PUT request
     */
    async put(endpoint, body = null) {
        try {
            const headers = auth.getAuthHeaders();
            const options = {
                method: 'PUT',
                headers
            };
            
            if (body) {
                if (body instanceof FormData) {
                    options.body = body;
                } else {
                    headers['Content-Type'] = 'application/json';
                    options.body = JSON.stringify(body);
                }
            }
            
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, options);
            
            const data = await response.json();
            
            if (response.status === 401) {
                auth.clearAuth();
                if (window.navigateWithTransition) {
                    window.navigateWithTransition('index.html');
                } else {
                    window.location.href = 'index.html';
                }
                return { success: false, message: 'Session expired. Please login again.' };
            }
            
            return data;
        } catch (error) {
            console.error('API PUT error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }
    
    /**
     * Make authenticated DELETE request
     */
    async delete(endpoint) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...auth.getAuthHeaders()
            };
            
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                method: 'DELETE',
                headers
            });
            
            const data = await response.json();
            
            if (response.status === 401) {
                auth.clearAuth();
                if (window.navigateWithTransition) {
                    window.navigateWithTransition('index.html');
                } else {
                    window.location.href = 'index.html';
                }
                return { success: false, message: 'Session expired. Please login again.' };
            }
            
            return data;
        } catch (error) {
            console.error('API DELETE error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }
    
    // ==================== Complaint APIs ====================
    
    /**
     * Submit a new complaint
     */
    async submitComplaint(formData) {
        return this.postFormData('/complaints', formData);
    }
    
    /**
     * Get current citizen's complaints
     */
    async getMyComplaints() {
        return this.get('/complaints/my');
    }
    
    /**
     * Get single complaint details
     */
    async getComplaint(complaintId) {
        return this.get(`/complaints/${complaintId}`);
    }
    
    // ==================== Admin APIs ====================
    
    /**
     * Get all complaints (admin only)
     */
    async getAllComplaints(filters = {}) {
        const params = new URLSearchParams();
        
        if (filters.priority) params.append('priority', filters.priority);
        if (filters.status) params.append('status', filters.status);
        if (filters.type) params.append('type', filters.type);
        
        const queryString = params.toString();
        const endpoint = queryString ? `/admin/complaints?${queryString}` : '/admin/complaints';
        
        return this.get(endpoint);
    }
    
    /**
     * Update complaint status (admin only)
     */
    async updateComplaintStatus(complaintId, status, adminRemarks = null, resolutionProof = null) {
        const formData = new FormData();
        formData.append('status', status);
        
        if (adminRemarks) {
            formData.append('admin_remarks', adminRemarks);
        }
        
        if (resolutionProof) {
            formData.append('resolution_proof', resolutionProof);
        }
        
        return this.put(`/admin/complaints/${complaintId}/status`, formData);
    }
    
    /**
     * Override complaint priority (admin only)
     */
    async overridePriority(complaintId, priority, reason) {
        return this.put(`/admin/complaints/${complaintId}/priority`, {
            priority,
            reason
        });
    }
    
    // ==================== Statistics APIs ====================
    
    /**
     * Get public statistics
     */
    async getStatistics() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/stats`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            return await response.json();
        } catch (error) {
            console.error('Stats API error:', error);
            return { success: false, message: 'Network error. Please try again.' };
        }
    }
}

// Create global API instance
const api = new APIManager();
