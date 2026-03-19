from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Authentication
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Amadeus API
    AMADEUS_API_KEY: str
    AMADEUS_API_SECRET: str
    AMADEUS_API_URL: str = "https://test.api.amadeus.com"  # Use test endpoint for development
    
    # RapidAPI (Hotels)
    RAPID_API_KEY: str = ""
    RAPID_API_HOST: str = ""
    
    # API Configuration
    USE_MOCK_APIS: bool = True  # Use mock/dummy data only
    API_REQUEST_TIMEOUT: int = 30
    MAX_RETRIES: int = 3
    RETRY_BACKOFF: float = 1.0
    LOG_API_CALLS: bool = True
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
