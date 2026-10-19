from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    supabase_url: str
    supabase_anon_key: str
    supabase_jwt_secret: str
    supabase_service_role_key: str
    # Alternate names Supabase uses for the token signing key
    # ("JWT Secret" legacy / "JWT signing key" SB_JWT_SECRET). The auth
    # dependency tries each configured value so the project's current signing
    # key works no matter which env name it was saved under.
    jwt_secret: str | None = None
    sb_jwt_secret: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()