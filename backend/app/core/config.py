import os
from pydantic_settings import BaseSettings  # Better than raw os.getenv

class Settings(BaseSettings):
    # Required - will raise clear error if missing
    DATABASE_URL: str
    SECRET_KEY: str                     # For JWT
    GOOGLE_API_KEY: str = None    # or whatever LLM key you use
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days default

    # Optional with sensible defaults
    ALGORITHM: str = "HS256"

    class Config:
        env_file = ".env"          # Only for local dev
        case_sensitive = True

# Global settings instance
settings = Settings()