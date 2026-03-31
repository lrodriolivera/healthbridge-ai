"""File upload validation — content checks, ZIP bomb protection, MIME verification"""

import io
import zipfile

import structlog

logger = structlog.get_logger()

ALLOWED_EXTENSIONS = {".jar", ".zip", ".xml", ".png", ".jpg", ".jpeg", ".gif", ".bmp"}
ALLOWED_MIME_TYPES = {
    "application/java-archive", "application/zip", "application/x-zip-compressed",
    "text/xml", "application/xml",
    "image/png", "image/jpeg", "image/gif", "image/bmp",
    "application/octet-stream",  # common fallback
}

# ZIP bomb protection
MAX_ZIP_ENTRIES = 500
MAX_ZIP_UNCOMPRESSED_SIZE = 500 * 1024 * 1024  # 500MB
MAX_COMPRESSION_RATIO = 100  # suspicious if ratio > 100:1


class FileValidationError(Exception):
    pass


def validate_filename(filename: str) -> str:
    """Validate and sanitize filename."""
    if not filename:
        raise FileValidationError("Filename is required")

    # Remove path components
    clean = filename.replace("\\", "/").split("/")[-1]

    # Check extension
    ext = "." + clean.rsplit(".", 1)[-1].lower() if "." in clean else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise FileValidationError(f"File type '{ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    return clean


def validate_content_type(content_type: str | None, filename: str):
    """Validate MIME type matches expected types."""
    if not content_type:
        return  # Skip if not provided

    if content_type not in ALLOWED_MIME_TYPES:
        logger.warning("Suspicious content type", content_type=content_type, filename=filename)


def validate_zip_content(content: bytes, filename: str):
    """Check ZIP/JAR for bombs and malicious content."""
    if not filename.endswith((".jar", ".zip")):
        return

    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            entries = zf.infolist()

            # Check entry count
            if len(entries) > MAX_ZIP_ENTRIES:
                raise FileValidationError(
                    f"ZIP has {len(entries)} entries (max {MAX_ZIP_ENTRIES}). Possible ZIP bomb."
                )

            # Check total uncompressed size
            total_uncompressed = sum(e.file_size for e in entries)
            if total_uncompressed > MAX_ZIP_UNCOMPRESSED_SIZE:
                raise FileValidationError(
                    f"ZIP uncompressed size {total_uncompressed / 1024 / 1024:.0f}MB exceeds limit ({MAX_ZIP_UNCOMPRESSED_SIZE / 1024 / 1024:.0f}MB)"
                )

            # Check compression ratio
            compressed_size = len(content)
            if compressed_size > 0 and total_uncompressed / compressed_size > MAX_COMPRESSION_RATIO:
                raise FileValidationError(
                    f"Suspicious compression ratio ({total_uncompressed / compressed_size:.0f}:1). Possible ZIP bomb."
                )

            # Check for path traversal in entry names
            for entry in entries:
                if entry.filename.startswith("/") or ".." in entry.filename:
                    raise FileValidationError(f"ZIP contains path traversal: {entry.filename}")

    except zipfile.BadZipFile:
        raise FileValidationError("Invalid ZIP/JAR file")


def validate_file_size(content: bytes, max_size_mb: int):
    """Validate file size."""
    size_mb = len(content) / (1024 * 1024)
    if size_mb > max_size_mb:
        raise FileValidationError(f"File size {size_mb:.1f}MB exceeds limit ({max_size_mb}MB)")


def validate_upload(content: bytes, filename: str, content_type: str | None, max_size_mb: int):
    """Run all upload validations."""
    clean_name = validate_filename(filename)
    validate_file_size(content, max_size_mb)
    validate_content_type(content_type, clean_name)
    validate_zip_content(content, clean_name)
    return clean_name
