"""MLLP Client — Send HL7 messages via MLLP protocol for testing"""

import asyncio
import structlog

logger = structlog.get_logger()

# MLLP framing characters
VT = b"\x0b"   # Vertical Tab (start block)
FS = b"\x1c"   # File Separator (end block)
CR = b"\x0d"   # Carriage Return


class MLLPClient:
    """Async MLLP client for sending HL7 test messages.

    MLLP Frame format: VT + message + FS + CR
    - VT = 0x0B (start block)
    - FS = 0x1C (end block)
    - CR = 0x0D (carriage return)
    """

    def __init__(self, host: str, port: int, timeout: float = 30.0):
        self.host = host
        self.port = port
        self.timeout = timeout

    async def send_message(self, hl7_message: str) -> dict:
        """Send an HL7 message via MLLP and return the response.

        Args:
            hl7_message: Raw HL7 message string (segments separated by \\r)

        Returns:
            dict with: success, response, ack_code, response_time_ms, error
        """
        import time

        start_time = time.monotonic()

        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(self.host, self.port),
                timeout=self.timeout,
            )

            # Frame the message
            message_bytes = hl7_message.encode("utf-8")
            frame = VT + message_bytes + FS + CR

            # Send
            writer.write(frame)
            await writer.drain()

            # Read response
            response_data = await asyncio.wait_for(
                reader.read(65536),
                timeout=self.timeout,
            )

            writer.close()
            await writer.wait_closed()

            elapsed_ms = int((time.monotonic() - start_time) * 1000)

            # Parse response (strip MLLP framing)
            response_text = response_data.decode("utf-8", errors="replace")
            if response_text.startswith("\x0b"):
                response_text = response_text[1:]
            if response_text.endswith("\x1c\x0d"):
                response_text = response_text[:-2]
            elif response_text.endswith("\x1c"):
                response_text = response_text[:-1]

            # Extract ACK code from MSA segment
            ack_code = self._extract_ack_code(response_text)

            return {
                "success": True,
                "response": response_text,
                "ack_code": ack_code,
                "response_time_ms": elapsed_ms,
                "error": None,
            }

        except asyncio.TimeoutError:
            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            return {
                "success": False,
                "response": None,
                "ack_code": None,
                "response_time_ms": elapsed_ms,
                "error": f"Timeout after {self.timeout}s",
            }
        except (ConnectionRefusedError, OSError) as e:
            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            return {
                "success": False,
                "response": None,
                "ack_code": None,
                "response_time_ms": elapsed_ms,
                "error": f"Connection error: {e}",
            }

    def _extract_ack_code(self, response: str) -> str | None:
        """Extract ACK code from MSA segment of HL7 response.

        MSA|AA|... = Application Accept
        MSA|AE|... = Application Error
        MSA|AR|... = Application Reject
        """
        for line in response.replace("\r", "\n").split("\n"):
            if line.startswith("MSA|"):
                parts = line.split("|")
                if len(parts) >= 2:
                    return parts[1]
        return None
