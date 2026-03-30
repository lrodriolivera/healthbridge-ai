"""JAR Parser — Extract and analyze Oracle SOA composite JARs"""

import io
import zipfile
import structlog
from pathlib import PurePosixPath

logger = structlog.get_logger()


class JARParser:
    """Parses Oracle SOA/OSB JAR files and extracts relevant components.

    Oracle SOA JARs typically contain:
    - composite.xml: Main descriptor with services, references, components
    - *.bpel: BPEL process definitions
    - *.xsl/*.xslt: XSL transformations
    - *.wsdl: Service definitions
    - *.xsd: Schema definitions
    """

    # File extensions we care about
    RELEVANT_EXTENSIONS = {".xml", ".bpel", ".xsl", ".xslt", ".wsdl", ".xsd", ".properties"}

    def parse(self, jar_bytes: bytes) -> dict:
        """Parse a JAR file and extract relevant components.

        Args:
            jar_bytes: Raw bytes of the JAR/ZIP file

        Returns:
            dict with:
            - composite_xml: Content of composite.xml (if found)
            - bpel_files: Dict of {filename: content}
            - xsl_files: Dict of {filename: content}
            - wsdl_files: Dict of {filename: content}
            - xsd_files: Dict of {filename: content}
            - properties: Dict of {filename: content}
            - all_files: List of all file paths in the JAR
        """
        result = {
            "composite_xml": None,
            "bpel_files": {},
            "xsl_files": {},
            "wsdl_files": {},
            "xsd_files": {},
            "properties": {},
            "all_files": [],
        }

        try:
            with zipfile.ZipFile(io.BytesIO(jar_bytes)) as zf:
                for entry in zf.namelist():
                    result["all_files"].append(entry)
                    path = PurePosixPath(entry)
                    ext = path.suffix.lower()

                    if ext not in self.RELEVANT_EXTENSIONS:
                        continue

                    try:
                        content = zf.read(entry).decode("utf-8", errors="replace")
                    except Exception as e:
                        logger.warning("Failed to read JAR entry", entry=entry, error=str(e))
                        continue

                    filename = path.name

                    # Classify by type
                    if filename == "composite.xml":
                        result["composite_xml"] = content
                    elif ext == ".bpel":
                        result["bpel_files"][filename] = content
                    elif ext in (".xsl", ".xslt"):
                        result["xsl_files"][filename] = content
                    elif ext == ".wsdl":
                        result["wsdl_files"][filename] = content
                    elif ext == ".xsd":
                        result["xsd_files"][filename] = content
                    elif ext == ".properties":
                        result["properties"][filename] = content

                logger.info(
                    "JAR parsed",
                    total_files=len(result["all_files"]),
                    composite=result["composite_xml"] is not None,
                    bpel=len(result["bpel_files"]),
                    xsl=len(result["xsl_files"]),
                    wsdl=len(result["wsdl_files"]),
                    xsd=len(result["xsd_files"]),
                )

        except zipfile.BadZipFile:
            logger.error("Invalid JAR/ZIP file")
            raise ValueError("The uploaded file is not a valid JAR/ZIP archive")

        return result
