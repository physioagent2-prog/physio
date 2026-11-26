import requests
import time
from backend.config import settings
import logging

logger = logging.getLogger(__name__)

class JWKSService:
    def __init__(self):
        self.jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        self._keys = []
        self._last_fetched = 0
        self._cache_duration = 3600 # 1 hour

    def get_public_key(self, kid: str):
        """
        Fetches the public key from the JWKS matching the kid.
        """
        keys = self._get_keys()
        for key in keys:
            if key.get('kid') == kid:
                return key
        return None

    def _get_keys(self):
        # Refresh cache if expired
        if not self._keys or (time.time() - self._last_fetched > self._cache_duration):
            try:
                logger.info(f"Fetching JWKS from {self.jwks_url}")
                resp = requests.get(self.jwks_url)
                resp.raise_for_status()
                self._keys = resp.json().get('keys', [])
                self._last_fetched = time.time()
            except Exception as e:
                logger.error(f"Failed to fetch JWKS: {e}")
                # Don't overwrite existing keys on failure
        return self._keys

# Global instance
jwks_service = JWKSService()
