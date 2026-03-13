from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase credentials
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    SUPABASE_JWT_SECRET: str

    # App settings
    APP_ENV: str = "development"  # development | production
    CORS_ORIGINS: str = "http://localhost:4200"  # Angular's default dev port

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
