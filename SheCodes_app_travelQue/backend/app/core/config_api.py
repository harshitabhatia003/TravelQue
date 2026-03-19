"""
Configuration management for API keys and external service integration
Imports from the main settings configuration
"""

from functools import lru_cache
from app.core.config import settings as main_settings


@lru_cache()
def get_settings():
    """Get cached settings instance - uses main config"""
    return main_settings


def validate_api_configuration() -> dict:
    """
    Validate that required API keys are configured
    Returns dict with status
    """
    settings = get_settings()
    
    # Check Amadeus API
    amadeus_configured = bool(settings.AMADEUS_API_KEY and settings.AMADEUS_API_SECRET)
    
    return {
        "use_mock": settings.USE_MOCK_APIS,
        "amadeus_configured": amadeus_configured,
        "amadeus_api_key": "configured" if settings.AMADEUS_API_KEY else "missing",
        "amadeus_api_secret": "configured" if settings.AMADEUS_API_SECRET else "missing"
    }
    return {
        "use_mock": settings.USE_MOCK_APIS,
        "amadeus_configured": amadeus_configured,
        "amadeus_api_key": "configured" if settings.AMADEUS_API_KEY else "missing",
        "amadeus_api_secret": "configured" if settings.AMADEUS_API_SECRET else "missing"
    }
