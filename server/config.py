from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Required environment variables:
    - SUPABASE_URL: Your Supabase project URL
    - SUPABASE_JWT_SECRET: JWT secret from Supabase dashboard
    - DATABASE_URL: PostgreSQL connection string
    """
    
    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    SUPABASE_JWT_SECRET: str
    RESEND_API_KEY: str | None = None
    
    # Database Configuration
    DATABASE_URL: str
    
    # Application Settings
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    
    # Optional: JWKS URL for future migration to asymmetric keys
    SUPABASE_JWKS_URL: str | None = None
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )
    
    @property
    def cors_origins(self) -> list[str]:
        """Parse ALLOWED_ORIGINS into a list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


# Global settings instance
settings = Settings()

print(f"DEBUG: Loaded JWT Secret: {settings.SUPABASE_JWT_SECRET[:5]}...") 
print(f"DEBUG: Allowed Origins: {settings.cors_origins}")