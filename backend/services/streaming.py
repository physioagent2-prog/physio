import json
import logging
from typing import AsyncGenerator

logger = logging.getLogger(__name__)

class StreamingService:
    @staticmethod
    async def stream_bedrock_response(response) -> AsyncGenerator[str, None]:
        """
        Parses the AWS Bedrock streaming response (Anthropic Claude 3 messages format)
        and yields SSE (Server-Sent Events) formatted strings.
        """
        try:
            # response['body'] is an EventStream
            for event in response.get("body"):
                chunk = json.loads(event.get("chunk").get("bytes").decode())
                
                # Claude 3 Messages API format on Bedrock
                if chunk.get("type") == "content_block_delta":
                    text = chunk.get("delta", {}).get("text", "")
                    if text:
                        # Format as SSE
                        yield f"data: {json.dumps({'text': text})}\n\n"
                
                elif chunk.get("type") == "message_stop":
                    # End of stream signaled
                    yield "data: [DONE]\n\n"
                    break
                
                # Note: 'metadata' and 'message_start/delta' events are ignored for simple text streaming
                
        except Exception as e:
            logger.error(f"Bedrock streaming error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

streaming_service = StreamingService()
