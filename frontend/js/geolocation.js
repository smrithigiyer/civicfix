/**
 * CivicFix Geolocation Manager
 * =============================
 * Handles map initialization, location detection, and reverse geocoding.
 */

class GeolocationManager {
    constructor(mapElementId, latInputId, lngInputId, addressInputId, placeNameInputId = null) {
        this.mapElementId = mapElementId;
        this.latInputId = latInputId;
        this.lngInputId = lngInputId;
        this.addressInputId = addressInputId;
        this.placeNameInputId = placeNameInputId;

        this.map = null;
        this.marker = null;
        this.isGeolocationLoading = false;
        this.locationWatchId = null;
        this.locationWatchTimeoutId = null;
        this.accuracyTargetMeters = 20;

        this.statusElement = document.getElementById('locationStatus');
    }

    /**
     * Initialize the map with Leaflet.
     */
    initialize() {
        try {
            this.map = L.map(this.mapElementId).setView(
                [CONFIG.MAP.DEFAULT_LAT, CONFIG.MAP.DEFAULT_LNG],
                CONFIG.MAP.DEFAULT_ZOOM
            );

            L.tileLayer(CONFIG.MAP.TILE_LAYER, {
                attribution: CONFIG.MAP.ATTRIBUTION,
                maxZoom: 19
            }).addTo(this.map);

            this.addMarker(CONFIG.MAP.DEFAULT_LAT, CONFIG.MAP.DEFAULT_LNG);

            this.map.on('click', (e) => {
                this.addMarker(e.latlng.lat, e.latlng.lng, true);
            });

            console.log('Leaflet map initialized successfully');
            this.updateLocationStatus('Click on the map or use "Detect My Location"', 'info');
            return true;
        } catch (error) {
            console.error('Failed to initialize map:', error);
            this.showError('Failed to initialize map. Please refresh the page.');
            return false;
        }
    }

    /**
     * Add or update marker on the map.
     */
    addMarker(lat, lng, isUserInteraction = false) {
        if (!this.map) return;

        if (this.marker) {
            this.map.removeLayer(this.marker);
        }

        this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
        this.updateCoordinates(lat, lng);
        this.map.setView([lat, lng], CONFIG.MAP.MARKER_ZOOM_LEVEL);

        this.marker.on('dragend', (e) => {
            const position = e.target.getLatLng();
            this.updateCoordinates(position.lat, position.lng);
            this.reverseGeocode(position.lat, position.lng);
            this.updateLocationStatus('Location updated', 'success');
        });

        this.marker.on('click', () => {
            this.updateLocationStatus('Location set', 'success');
        });

        if (isUserInteraction) {
            this.reverseGeocode(lat, lng);
            this.updateLocationStatus('Location set', 'success');
        }
    }

    /**
     * Update coordinate input fields.
     */
    updateCoordinates(lat, lng) {
        const latInput = document.getElementById(this.latInputId);
        const lngInput = document.getElementById(this.lngInputId);

        if (latInput) latInput.value = lat.toFixed(7);
        if (lngInput) lngInput.value = lng.toFixed(7);
    }

    /**
     * Reverse geocode coordinates to get address.
     */
    async reverseGeocode(lat, lng) {
        try {
            const data = await this.tryReverseGeocode(lat, lng);

            if (data && data.display_name) {
                const placeName = this.extractPlaceName(data);
                this.updateAddressField(data.display_name);
                this.updatePlaceNameField(placeName || this.fallbackPlaceName(lat, lng));
                console.log('Reverse geocoding successful:', data.display_name);
                return;
            }

            this.setFallbackLocationText(lat, lng);
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            this.setFallbackLocationText(lat, lng);
        }
    }

    /**
     * Try multiple reverse geocoding providers for better reliability.
     */
    async tryReverseGeocode(lat, lng) {
        const endpoints = [
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            `https://geocode.maps.co/reverse?lat=${lat}&lon=${lng}`
        ];

        for (const url of endpoints) {
            try {
                const response = await fetch(url);
                if (!response.ok) continue;

                const data = await response.json();
                if (data && data.display_name) {
                    return data;
                }
            } catch (error) {
                console.warn('Reverse geocode provider failed:', url, error);
            }
        }

        return null;
    }

    /**
     * Extract a human-readable place name from reverse geocode payload.
     */
    extractPlaceName(data) {
        const addr = data && data.address ? data.address : {};
        return (
            addr.road ||
            addr.hamlet ||
            addr.suburb ||
            addr.neighbourhood ||
            addr.city_district ||
            addr.city ||
            addr.town ||
            addr.village ||
            addr.county ||
            addr.state_district ||
            addr.state ||
            addr.country ||
            (data && data.name) ||
            ''
        );
    }

    /**
     * Generate readable fallback when place lookup fails.
     */
    fallbackPlaceName(lat, lng) {
        return `Near (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }

    /**
     * Set fallback values without exposing raw lookup failures in UI.
     */
    setFallbackLocationText(lat, lng) {
        this.updateAddressField('');
        this.updatePlaceNameField(this.fallbackPlaceName(lat, lng));
    }

    /**
     * Update address input field.
     */
    updateAddressField(address) {
        const addressInput = document.getElementById(this.addressInputId);
        if (addressInput) {
            addressInput.value = address;
        }
    }

    /**
     * Update place name hidden field.
     */
    updatePlaceNameField(placeName) {
        if (!this.placeNameInputId) return;
        const placeInput = document.getElementById(this.placeNameInputId);
        if (placeInput) {
            placeInput.value = placeName || '';
        }
    }

    /**
     * Request user's current location.
     */
    async requestGeolocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by your browser');
            return;
        }

        if (this.isGeolocationLoading) return;
        this.isGeolocationLoading = true;
        this.clearAccuracyWatch();
        this.updateLocationStatus('Requesting location...', 'info');

        if (navigator.permissions && navigator.permissions.query) {
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
                console.log('Geolocation permission state:', permissionStatus.state);

                if (permissionStatus.state === 'denied') {
                    this.isGeolocationLoading = false;
                    this.updateLocationStatus('Location permission denied', 'error');
                    this.showError('Location permission is blocked. Enable location access in your browser settings and refresh the page.');
                    return;
                }
            } catch (err) {
                console.warn('Could not check permission state:', err);
            }
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.handleGeolocationSuccess(position.coords);
                this.isGeolocationLoading = false;
            },
            (error) => {
                this.handleGeolocationError(error);
                this.isGeolocationLoading = false;
            },
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 0
            }
        );
    }

    /**
     * Handle successful geolocation.
     */
    handleGeolocationSuccess(coords) {
        const lat = coords.latitude;
        const lng = coords.longitude;
        const accuracy = coords.accuracy;

        this.addMarker(lat, lng, true);

        const roundedAccuracy = accuracy ? Math.round(accuracy) : null;
        const accuracyText = roundedAccuracy ? ` (+/-${roundedAccuracy}m)` : '';
        this.updateLocationStatus(`Location detected${accuracyText}`, 'success');

        const recenterBtn = document.getElementById('recenterMap');
        if (recenterBtn) recenterBtn.style.display = 'inline-block';

        if (roundedAccuracy && roundedAccuracy > this.accuracyTargetMeters) {
            this.refineLocationAccuracy();
        }
    }

    /**
     * Improve location accuracy by tracking for a short period.
     */
    refineLocationAccuracy() {
        if (!navigator.geolocation) return;

        let bestAccuracy = Number.POSITIVE_INFINITY;
        this.updateLocationStatus('Improving GPS accuracy...', 'info');

        this.locationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                const roundedAccuracy = accuracy ? Math.round(accuracy) : null;
                if (!roundedAccuracy) return;

                if (roundedAccuracy < bestAccuracy) {
                    bestAccuracy = roundedAccuracy;
                    this.addMarker(latitude, longitude, true);
                    this.updateLocationStatus(`Location refined (+/-${roundedAccuracy}m)`, 'success');
                }

                if (roundedAccuracy <= this.accuracyTargetMeters) {
                    this.clearAccuracyWatch();
                }
            },
            (error) => {
                console.warn('Accuracy refinement stopped:', error);
                this.clearAccuracyWatch();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );

        this.locationWatchTimeoutId = setTimeout(() => {
            this.clearAccuracyWatch();
        }, 12000);
    }

    /**
     * Handle geolocation errors.
     */
    handleGeolocationError(error) {
        this.clearAccuracyWatch();

        let message = 'Unable to retrieve your location';
        let detailedMessage = '';

        if (error && typeof error.code !== 'undefined') {
            switch (error.code) {
                case 1:
                    message = 'Location access denied';
                    detailedMessage = 'Enable location access in your browser settings and try again.';
                    break;
                case 2:
                    message = 'Location unavailable';
                    detailedMessage = 'Your device could not determine your location. Ensure location services are enabled.';
                    break;
                case 3:
                    message = 'Location request timed out';
                    detailedMessage = 'The request took too long. Try again, or set location manually on the map.';
                    break;
            }
        }

        this.updateLocationStatus(message, 'error');
        this.showError(detailedMessage || message);
    }

    /**
     * Clear active high-accuracy watcher if running.
     */
    clearAccuracyWatch() {
        if (this.locationWatchId !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = null;
        }

        if (this.locationWatchTimeoutId) {
            clearTimeout(this.locationWatchTimeoutId);
            this.locationWatchTimeoutId = null;
        }
    }

    /**
     * Get current coordinates.
     */
    getCoordinates() {
        const latInput = document.getElementById(this.latInputId);
        const lngInput = document.getElementById(this.lngInputId);

        if (!latInput || !lngInput) {
            return null;
        }

        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);

        if (isNaN(lat) || isNaN(lng)) {
            return null;
        }

        return { lat, lng };
    }

    /**
     * Recenter map on current marker.
     */
    recenterMap() {
        if (this.marker && this.map) {
            const position = this.marker.getLatLng();
            this.map.setView([position.lat, position.lng], CONFIG.MAP.MARKER_ZOOM_LEVEL);
            this.updateLocationStatus('Map recentered', 'success');
        }
    }

    /**
     * Resize map (call after container size changes).
     */
    resizeMap() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }

    /**
     * Update location status message.
     */
    updateLocationStatus(message, type = 'info') {
        if (!this.statusElement) return;

        this.statusElement.textContent = message;
        this.statusElement.className = 'location-status';

        if (type === 'success') {
            this.statusElement.classList.add('success');
        } else if (type === 'error') {
            this.statusElement.classList.add('error');
        } else {
            this.statusElement.classList.add('info');
        }
    }

    /**
     * Show error alert.
     */
    showError(message) {
        if (window.showAlert) {
            window.showAlert(message, 'error');
        } else {
            console.error(message);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeolocationManager;
}

const geolocationManager = new GeolocationManager('map', 'latitude', 'longitude', 'address', 'placeName');
