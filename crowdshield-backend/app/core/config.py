"""
Application settings loaded from environment variables via pydantic-settings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """CrowdShield backend configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore", 
    )

    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost/crowdshield"

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    SECRET_KEY: str = "supersecretkey_please_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    GEMINI_API_KEY: str = ""
    SARVAM_API_KEY: str = ""

    DEFAULT_VENUE_ID: str = "v-1"
    DEFAULT_VENUE_NAME: str = "Standard Venue"
    DEFAULT_VENUE_LOCATION: str = "Global"
    DEFAULT_VENUE_LAT: str = "0.0"
    DEFAULT_VENUE_LNG: str = "0.0"
    DEFAULT_VENUE_CAPACITY: str = "10000"
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

settings = Settings()