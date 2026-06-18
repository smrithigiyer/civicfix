/**
 * CivicFix - Home Page JavaScript
 * ===============================
 * Handles homepage-specific functionality.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Load statistics
    await loadStatistics();
    
    // Load impact metrics
    await loadImpactMetrics();
});

/**
 * Load and display statistics
 */
async function loadStatistics() {
    const totalEl = document.getElementById('totalComplaints');
    const solvedEl = document.getElementById('solvedComplaints');
    const recentEl = document.getElementById('recentComplaints');
    
    if (!totalEl || !solvedEl || !recentEl) return;
    
    try {
        const result = await api.getStatistics();
        
        if (result.success) {
            const stats = result.data;
            
            // Animate numbers
            animateNumber(totalEl, stats.total_complaints || 0);
            animateNumber(solvedEl, stats.by_status?.Solved || 0);
            animateNumber(recentEl, stats.recent_complaints || 0);
        } else {
            // Set default values if API fails
            totalEl.textContent = '-';
            solvedEl.textContent = '-';
            recentEl.textContent = '-';
        }
    } catch (error) {
        console.error('Failed to load statistics:', error);
        totalEl.textContent = '-';
        solvedEl.textContent = '-';
        recentEl.textContent = '-';
    }
}

/**
 * Load and display impact metrics
 */
async function loadImpactMetrics() {
    const avgResolutionEl = document.getElementById('avgResolutionTime');
    const activeAdminsEl = document.getElementById('activeAdmins');
    const resolutionRateEl = document.getElementById('resolutionRate');
    
    if (!avgResolutionEl || !activeAdminsEl || !resolutionRateEl) return;
    
    try {
        const result = await api.getStatistics();
        
        if (result.success) {
            const stats = result.data;
            
            // Calculate average resolution time (days)
            const avgTime = stats.avg_resolution_time ? Math.ceil(stats.avg_resolution_time / (24 * 60)) : 0;
            animateNumber(avgResolutionEl, avgTime);
            
            // Get active admins count
            const admins = stats.active_admins || 0;
            animateNumber(activeAdminsEl, admins);
            
            // Calculate resolution rate percentage
            const total = stats.total_complaints || 1;
            const resolved = stats.by_status?.Solved || 0;
            const rate = Math.round((resolved / total) * 100);
            animateNumber(resolutionRateEl, rate);
        } else {
            // Set default values
            avgResolutionEl.textContent = '-';
            activeAdminsEl.textContent = '-';
            resolutionRateEl.textContent = '-';
        }
    } catch (error) {
        console.error('Failed to load impact metrics:', error);
        avgResolutionEl.textContent = '-';
        activeAdminsEl.textContent = '-';
        resolutionRateEl.textContent = '-';
    }
}

/**
 * Animate number counting
 */
function animateNumber(element, target) {
    const duration = 1000;
    const start = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(start + (target - start) * easeOutQuart);
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}
