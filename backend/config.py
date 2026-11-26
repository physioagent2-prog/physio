import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "Move Better Physiotherapy Clinic"
    DEBUG: bool = True
    
    # SUPABASE (Pydantic will automatically look for these in .env)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    
    # STORAGE
    AUDIO_BUCKET: str = "physio-audio"
    
    # AWS BEDROCK (For Claude 3.5 Sonnet)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    BEDROCK_MODEL_ID: str = "us.anthropic.claude-sonnet-4-20250514-v1:0"
    
    # WHISPER (Local Transcription)
    WHISPER_MODEL: str = "base" # base, small, medium, large
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["*"]
    
    # Configure Pydantic to load from .env file automatically
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

settings = Settings()
