"""
CivicFix Priority Calculator
============================
Calculates complaint priority based on location proximity to emergency zones
and severity level using weighted scoring algorithm.
"""
import math
from typing import Dict, List, Tuple


class PriorityCalculator:
    """Priority calculation using Haversine formula and weighted scoring."""
    
    # Earth's radius in kilometers
    EARTH_RADIUS_KM = 6371
    
    # Emergency zone types and their criticality weights
    ZONE_CRITICALITY = {
        'schools': 1.0,
        'hospitals': 1.0,
        'fire_stations': 0.9,
        'police_stations': 0.8
    }
    
    # Severity scores for complaint types
    SEVERITY_SCORES = {
        'streetlight': 0.9,    # Safety critical
        'drainage': 0.8,       # Health hazard
        'road_damage': 0.7,    # Accident risk
        'pothole': 0.6,        # Vehicle damage risk
        'garbage': 0.5,        # Environmental
        'other': 0.4           # General
    }
    
    def __init__(self, config):
        """Initialize with configuration."""
        self.location_weight = getattr(config, 'LOCATION_WEIGHT', 0.6)
        self.severity_weight = getattr(config, 'SEVERITY_WEIGHT', 0.4)
        self.critical_distance = getattr(config, 'CRITICAL_DISTANCE', 0.5)
        self.high_distance = getattr(config, 'HIGH_DISTANCE', 1.0)
        self.medium_distance = getattr(config, 'MEDIUM_DISTANCE', 3.0)
        self.emergency_zones = getattr(config, 'EMERGENCY_ZONES', {})
    
    def haversine_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Calculate the great circle distance between two points on Earth.
        Uses the Haversine formula for accuracy.
        
        Args:
            lat1, lng1: Coordinates of first point (degrees)
            lat2, lng2: Coordinates of second point (degrees)
        
        Returns:
            Distance in kilometers
        """
        # Convert to radians
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        
        # Haversine formula
        a = (math.sin(delta_lat / 2) ** 2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return self.EARTH_RADIUS_KM * c
    
    def calculate_location_score(self, lat: float, lng: float) -> float:
        """
        Calculate location score based on proximity to emergency zones.
        Higher score = closer to critical infrastructure.
        
        Args:
            lat, lng: Complaint location coordinates
        
        Returns:
            Location score (0.0 to 1.0)
        """
        max_score = 0.0
        
        for zone_type, locations in self.emergency_zones.items():
            criticality = self.ZONE_CRITICALITY.get(zone_type, 0.5)
            
            for zone_lat, zone_lng in locations:
                distance = self.haversine_distance(lat, lng, zone_lat, zone_lng)
                
                # Score inversely proportional to distance
                if distance <= self.critical_distance:
                    # Very close - maximum score for this zone type
                    zone_score = 1.0 * criticality
                elif distance <= self.high_distance:
                    # Close - high score
                    zone_score = 0.8 * criticality
                elif distance <= self.medium_distance:
                    # Moderately close - medium score
                    zone_score = 0.5 * criticality
                else:
                    # Far - low score but not zero
                    zone_score = 0.2 * criticality
                
                max_score = max(max_score, zone_score)
        
        return min(max_score, 1.0)
    
    def calculate_severity_score(self, complaint_type: str) -> float:
        """
        Get severity score for complaint type.
        
        Args:
            complaint_type: Type of complaint
        
        Returns:
            Severity score (0.0 to 1.0)
        """
        return self.SEVERITY_SCORES.get(complaint_type, 0.4)
    
    def calculate_priority(self, lat: float, lng: float, complaint_type: str) -> Tuple[str, float]:
        """
        Calculate complaint priority using weighted scoring.
        
        Formula: Priority Score = (Location Weight × Location Score) + 
                                 (Severity Weight × Severity Score)
        
        Args:
            lat, lng: Complaint location coordinates
            complaint_type: Type of complaint
        
        Returns:
            Tuple of (priority_level, priority_score)
            priority_level: 'HIGH', 'MEDIUM', or 'NORMAL'
            priority_score: Float between 0.0 and 1.0
        """
        # Calculate individual scores
        location_score = self.calculate_location_score(lat, lng)
        severity_score = self.calculate_severity_score(complaint_type)
        
        # Weighted scoring
        priority_score = (
            self.location_weight * location_score +
            self.severity_weight * severity_score
        )
        
        # Classify priority
        if priority_score >= 0.7:
            priority_level = 'HIGH'
        elif priority_score >= 0.4:
            priority_level = 'MEDIUM'
        else:
            priority_level = 'NORMAL'
        
        return priority_level, round(priority_score, 3)
    
    def get_nearby_emergency_zones(self, lat: float, lng: float, 
                                    max_distance: float = 5.0) -> List[Dict]:
        """
        Get list of emergency zones within specified distance.
        
        Args:
            lat, lng: Center coordinates
            max_distance: Maximum distance in kilometers
        
        Returns:
            List of nearby zones with distance
        """
        nearby = []
        
        for zone_type, locations in self.emergency_zones.items():
            for zone_lat, zone_lng in locations:
                distance = self.haversine_distance(lat, lng, zone_lat, zone_lng)
                
                if distance <= max_distance:
                    nearby.append({
                        'type': zone_type,
                        'distance_km': round(distance, 3),
                        'coordinates': {'lat': zone_lat, 'lng': zone_lng}
                    })
        
        # Sort by distance
        nearby.sort(key=lambda x: x['distance_km'])
        return nearby


# Global calculator instance
_calculator = None

def init_calculator(config):
    """Initialize the global priority calculator."""
    global _calculator
    _calculator = PriorityCalculator(config)
    return _calculator

def get_calculator():
    """Get the global priority calculator instance."""
    global _calculator
    if _calculator is None:
        raise RuntimeError("Priority calculator not initialized. Call init_calculator first.")
    return _calculator
