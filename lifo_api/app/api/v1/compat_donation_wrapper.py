"""
Compatibility wrapper for the simplified donation engine
Provides backward compatibility for existing API endpoints
"""

from datetime import datetime
from typing import Any, Dict
from app.core.donation_engine import (
    SimplifiedDonationEngine, 
    SimpleActionRecommendation,
    ActionType,
    DonationPriority
)

class CompatibilityDecision:
    """Compatibility wrapper for decision"""
    def __init__(self, action: ActionType):
        self.value = action.value

class CompatibilityPriority:
    """Compatibility wrapper for priority"""
    def __init__(self, priority: DonationPriority):
        self.value = priority.value

class CompatibilityCompliance:
    """Compatibility wrapper for compliance result"""
    def __init__(self):
        self.eligibility_status = type('obj', (object,), {'value': 'simplified_check'})()
        self.compliance_score = 0.8
        self.regulatory_notes = ["Simplified compliance check"]
        self.temperature_requirements = None

class CompatibilityRecommendation:
    """Compatibility wrapper that provides old interface for new recommendation"""
    
    def __init__(self, simple_rec: SimpleActionRecommendation):
        self.simple_rec = simple_rec
        
        # Map new fields to old interface
        self.eu_compliant = simple_rec.recommended_action != ActionType.DISPOSE
        self.decision = CompatibilityDecision(simple_rec.recommended_action)
        self.priority = CompatibilityPriority(simple_rec.priority)
        self.compliance_result = CompatibilityCompliance()
        self.confidence_score = simple_rec.ai_score
        self.recommended_action_by = simple_rec.recommended_action_by
        
        # Additional compatibility fields
        self.estimated_donation_value = simple_rec.estimated_recovered_value
        self.decision_factors = simple_rec.decision_factors

def create_simplified_donation_engine_compat():
    """Create a compatibility wrapper for the simplified donation engine"""
    
    class CompatEngine:
        def __init__(self):
            self.engine = SimplifiedDonationEngine()
        
        def evaluate_action_recommendation(self, 
                                         batch_data: Dict[str, Any], 
                                         **kwargs) -> CompatibilityRecommendation:
            """Compatibility method that wraps the new simplified engine"""
            
            # Extract AI score from batch data or use default
            ai_score = batch_data.get('composite_score', 0.5)
            if ai_score is None:
                # Calculate a simple score based on days to expiry
                days_to_expiry = batch_data.get('days_to_expiry', 0)
                if days_to_expiry <= 0:
                    ai_score = 1.0
                elif days_to_expiry <= 1:
                    ai_score = 0.9
                elif days_to_expiry <= 3:
                    ai_score = 0.7
                else:
                    ai_score = 0.4
            
            # Call the new simplified engine
            simple_rec = self.engine.evaluate_action_recommendation(batch_data, ai_score)
            
            # Wrap in compatibility layer
            return CompatibilityRecommendation(simple_rec)
    
    return CompatEngine()