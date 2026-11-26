import boto3
import json
import whisper
import os
import tempfile
from backend.config import settings
import logging
from backend.services.patient_context import patient_context_service
from backend.services.prompt_builder import prompt_builder
from backend.services.streaming import streaming_service

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        # Initialize AWS Bedrock client
        self.bedrock = boto3.client(
            service_name='bedrock-runtime',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        
        # Initialize Whisper (load on demand to save memory if needed)
        self._whisper_model = None

    def get_whisper_model(self):
        if self._whisper_model is None:
            logger.info(f"Loading Whisper model: {settings.WHISPER_MODEL}")
            self._whisper_model = whisper.load_model(settings.WHISPER_MODEL)
        return self._whisper_model

    async def transcribe_audio(self, file_path: str) -> str:
        """Transcribes audio using local Whisper model."""
        try:
            model = self.get_whisper_model()
            result = model.transcribe(file_path)
            return result.get("text", "")
        except Exception as e:
            logger.error(f"Whisper transcription error: {e}")
            raise Exception(f"Transcription failed: {str(e)}")

    async def generate_clinical_summary(self, transcript: str) -> str:
        """Uses AWS Bedrock (Claude 3.5) to summarize clinical audio."""
        prompt = f"""
        You are an expert Physical Therapy Assistant. 
        Given the following clinical session transcript, extract the key points and format them into professional clinical notes.
        Include: Chief Complaint, Assessment Observations, and suggested next steps.
        
        Transcript: 
        {transcript}
        
        Clinical Notes:
        """
        return await self._invoke_claude(prompt)

    async def chat_with_assistant(self, message: str, context: str = "") -> str:
        """General clinical chat using AWS Bedrock (Claude 3.5)."""
        prompt = f"""
        You are 'Move Better AI', a specialized physiotherapy assistant. 
        Patient Context: {context}
        User Message: {message}
        
        Provide professional, empathetic, and evidence-based clinical advice.
        """
        return await self._invoke_claude(prompt)

        return await self._invoke_claude(prompt)


    async def chat_with_patient_context(self, patient_id: str, message: str, session_number: int = None):
        """
        Upgraded chatbot that loads patient context automatically.
        """
        # 1. Get context (possibly filtered by session)
        context = await patient_context_service.get_full_patient_context(patient_id, session_number=session_number)
        
        # 2. Build prompt
        prompt = prompt_builder.build_chat_prompt(message, context)
        
        # 3. Get response
        return await self._invoke_claude(prompt)

    async def chat_with_patient_context_stream(self, patient_id: str, message: str, session_number: int = None, chat_history: list = None):
        """
        SSE-enabled chatbot with optional consultation history injection.
        """
        # 1. Get clinical context (isolated to session if requested)
        context = await patient_context_service.get_full_patient_context(patient_id, session_number=session_number)
        
        # 2. Build personalized Co-pilot prompt
        prompt = prompt_builder.build_chat_prompt(message, context)
        
        # 3. Stream from Bedrock
        return await self._invoke_claude_stream(prompt)

    async def generate_streaming_treatment_plan(self, patient_id: str, appointment_id: str = None, session_number: int = None, chat_history: list = None):
        """
        SSE-enabled detailed treatment plan generator.
        Supports consultative context and session isolation.
        """
        # 1. Get context
        context = await patient_context_service.get_full_patient_context(patient_id, session_number=session_number, appointment_id=appointment_id)
        
        # 2. Build prompt (including consultation discussion if provided)
        prompt = prompt_builder.build_treatment_plan_prompt(context, chat_history)

        return await self._invoke_claude_stream(prompt)

    async def analyze_patient_case_stream(self, patient_id: str, appointment_id: str = None, session_number: int = None):
        """
        SSE-enabled case analysis. Audits context for Dr. Kajal.
        """
        # 1. Get clinical context (isolated to session if requested)
        context = await patient_context_service.get_full_patient_context(patient_id, session_number=session_number, appointment_id=appointment_id)
        
        # 2. Build analysis prompt
        prompt = prompt_builder.build_case_analysis_prompt(context)
        
        # 3. Stream from Bedrock
        return await self._invoke_claude_stream(prompt)

    async def _invoke_claude_stream(self, prompt: str):
        """Invoke Claude 3 with streaming response."""
        if not settings.AWS_ACCESS_KEY_ID:
            raise Exception("AWS Credentials not configured")
            
        try:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 2000,
                "temperature": 0.7,
                "messages": [
                    {
                        "role": "user",
                        "content": [{"type": "text", "text": prompt}]
                    }
                ]
            })

            response = self.bedrock.invoke_model_with_response_stream(
                modelId=settings.BEDROCK_MODEL_ID,
                body=body
            )
            
            return streaming_service.stream_bedrock_response(response)
            
        except Exception as e:
            logger.error(f"Bedrock streaming invocation error: {e}")
            raise e

    async def _invoke_claude(self, prompt: str) -> str:
        """Core logic to invoke Anthropic Claude on AWS Bedrock."""
        if not settings.AWS_ACCESS_KEY_ID:
            return "AI Error: AWS Credentials not configured in .env"
            
        try:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1024,
                "messages": [
                    {
                        "role": "user",
                        "content": [{"type": "text", "text": prompt}]
                    }
                ]
            })

            response = self.bedrock.invoke_model(
                modelId=settings.BEDROCK_MODEL_ID,
                body=body
            )

            response_body = json.loads(response.get('body').read())
            return response_body.get('content')[0].get('text')
            
        except Exception as e:
            logger.error(f"Bedrock invocation error: {e}")
            return f"AI Error: Failed to generate response from Claude ({str(e)})"

# Global instance
ai_service = AIService()
