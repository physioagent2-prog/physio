from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)

class NotificationService(ABC):
    """
    Abstract base class for all notification services.
    Enables scalable integration of Email, WhatsApp, SMS, etc.
    """
    
    @abstractmethod
    async def send_reminder(self, to: str, message: str):
        pass

    @abstractmethod
    async def send_confirmation(self, to: str, data: dict):
        pass

class WhatsAppService(NotificationService):
    async def send_reminder(self, to: str, message: str):
        # TODO: Integrate with e.g. Twilio WhatsApp API
        logger.info(f"WHATSAPP: Sending reminder to {to}: {message}")
        return {"status": "success", "provider": "placeholder"}

    async def send_confirmation(self, to: str, data: dict):
        logger.info(f"WHATSAPP: Sending confirmation to {to}")
        return {"status": "success"}

class EmailService(NotificationService):
    async def send_reminder(self, to: str, message: str):
        # TODO: Integrate with e.g. SendGrid or Amazon SES
        logger.info(f"EMAIL: Sending reminder to {to}: {message}")
        return {"status": "success", "provider": "placeholder"}

    async def send_confirmation(self, to: str, data: dict):
        logger.info(f"EMAIL: Sending confirmation to {to}")
        return {"status": "success"}

# Global instances (to be used via dependency injection)
whatsapp = WhatsAppService()
email = EmailService()
