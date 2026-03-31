"""PHI Sanitizer — redacts Protected Health Information from HL7/XML before sending to AI

HIPAA requires that PHI be minimized when sent to third-party services.
This module redacts patient identifiers while preserving message structure
for analysis by Claude/Bedrock.
"""

import re

import structlog

logger = structlog.get_logger()

# HL7 segments that commonly contain PHI
PHI_SEGMENTS = {"PID", "NK1", "GT1", "IN1", "IN2"}

# Regex patterns for PHI in XML/text
PHI_PATTERNS = [
    # SSN / RUT (Chile)
    (r'\b\d{1,2}\.\d{3}\.\d{3}[-–]\w\b', '[REDACTED-RUT]'),
    (r'\b\d{3}-\d{2}-\d{4}\b', '[REDACTED-SSN]'),
    # Phone numbers
    (r'\b\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}\b', '[REDACTED-PHONE]'),
    # Email
    (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[REDACTED-EMAIL]'),
    # Dates of birth (common formats)
    (r'\b(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b', '[REDACTED-DOB]'),
    # IP addresses (could be patient device)
    (r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', '[REDACTED-IP]'),
]


def sanitize_hl7_segment(segment: str) -> str:
    """Redact PHI fields from an HL7 segment while keeping structure."""
    parts = segment.split("|")
    if not parts:
        return segment

    seg_id = parts[0][:3]

    if seg_id == "PID":
        # PID-3 (Patient ID) — keep structure, redact value
        if len(parts) > 3:
            parts[3] = "[REDACTED-PID3]"
        # PID-5 (Patient Name)
        if len(parts) > 5:
            parts[5] = "[REDACTED-NAME]"
        # PID-7 (DOB)
        if len(parts) > 7:
            parts[7] = "[REDACTED-DOB]"
        # PID-11 (Address)
        if len(parts) > 11:
            parts[11] = "[REDACTED-ADDR]"
        # PID-13 (Phone)
        if len(parts) > 13:
            parts[13] = "[REDACTED-PHONE]"

    elif seg_id == "NK1":
        # NK1-2 (Name)
        if len(parts) > 2:
            parts[2] = "[REDACTED-NK-NAME]"
        # NK1-5 (Phone)
        if len(parts) > 5:
            parts[5] = "[REDACTED-PHONE]"

    return "|".join(parts)


def sanitize_hl7_message(message: str) -> str:
    """Sanitize an entire HL7 message, preserving structure for analysis."""
    lines = message.replace("\r", "\n").split("\n")
    sanitized = []
    for line in lines:
        if not line.strip():
            continue
        seg_id = line[:3]
        if seg_id in PHI_SEGMENTS:
            sanitized.append(sanitize_hl7_segment(line))
        else:
            sanitized.append(line)
    return "\n".join(sanitized)


def sanitize_xml_content(xml: str) -> str:
    """Remove PHI patterns from XML content."""
    result = xml
    for pattern, replacement in PHI_PATTERNS:
        result = re.sub(pattern, replacement, result)
    return result


def sanitize_for_analysis(content: str, content_type: str = "xml") -> str:
    """Sanitize content before sending to Claude for analysis.

    Args:
        content: The raw content (XML, HL7, etc.)
        content_type: "xml", "hl7", or "text"

    Returns:
        Sanitized content with PHI redacted
    """
    if content_type == "hl7":
        return sanitize_hl7_message(content)
    elif content_type == "xml":
        return sanitize_xml_content(content)
    else:
        # Generic text sanitization
        result = content
        for pattern, replacement in PHI_PATTERNS:
            result = re.sub(pattern, replacement, result)
        return result
