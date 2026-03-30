"""Atelier REST API client for InterSystems IRIS deployment"""

import httpx
import structlog

logger = structlog.get_logger()


class AtelierClient:
    """Client for the InterSystems Atelier REST API.
    Used to upload, compile, and manage ObjectScript classes on IRIS servers.

    Based on real-world deployment experience:
    - Content must be split by newlines (not readlines()) to avoid ERROR #5559
    - Compilation order matters: Framework → MSG → BO → BP → BS → Production
    """

    def __init__(self, base_url: str, namespace: str, username: str, password: str, ssl_verify: bool = True):
        self.base_url = f"{base_url.rstrip('/')}/api/atelier/v1/{namespace}"
        self.auth = (username, password)
        self.ssl_verify = ssl_verify

    async def upload_class(self, class_name: str, content: str) -> dict:
        """Upload a single .cls file to IRIS.

        CRITICAL: Content must be split by '\\n' (not readlines()).
        Using readlines() causes double newlines → ERROR #5559.
        """
        # Split content into lines (the correct way)
        lines = content.split("\n")

        url = f"{self.base_url}/doc/{class_name}.cls?ignoreConflict=1"
        payload = {"enc": False, "content": lines}

        async with httpx.AsyncClient(verify=self.ssl_verify) as client:
            response = await client.put(
                url,
                json=payload,
                auth=self.auth,
                timeout=30.0,
            )

            result = {
                "status_code": response.status_code,
                "class_name": class_name,
                "success": response.status_code == 200,
            }

            if response.status_code != 200:
                result["error"] = response.text
                logger.error("Upload failed", class_name=class_name, status=response.status_code, error=response.text)
            else:
                logger.info("Upload successful", class_name=class_name)

            return result

    async def compile_class(self, class_name: str) -> dict:
        """Compile a class on the IRIS server."""
        url = f"{self.base_url}/action/compile"
        payload = [f"{class_name}.cls"]

        async with httpx.AsyncClient(verify=self.ssl_verify) as client:
            response = await client.post(
                url,
                json=payload,
                auth=self.auth,
                timeout=60.0,
            )

            result = {
                "status_code": response.status_code,
                "class_name": class_name,
                "success": response.status_code == 200,
            }

            if response.status_code == 200:
                data = response.json()
                # Check for compilation errors in response
                if "result" in data and "content" in data["result"]:
                    for item in data["result"]["content"]:
                        if item.get("severity", 0) > 0:
                            result["success"] = False
                            result["errors"] = data["result"]["content"]
                            break

            if not result["success"]:
                result["error"] = response.text
                logger.error("Compilation failed", class_name=class_name)
            else:
                logger.info("Compilation successful", class_name=class_name)

            return result

    async def deploy_class(self, class_name: str, content: str) -> dict:
        """Upload and compile a class (full deploy)."""
        upload_result = await self.upload_class(class_name, content)
        if not upload_result["success"]:
            return upload_result

        compile_result = await self.compile_class(class_name)
        return {
            "class_name": class_name,
            "upload": upload_result,
            "compile": compile_result,
            "success": compile_result["success"],
        }

    async def deploy_batch(self, classes: list[dict], order: list[str] | None = None) -> list[dict]:
        """Deploy multiple classes in dependency order.

        Args:
            classes: List of {"name": "ClassName", "content": "..."} dicts
            order: Optional explicit compilation order. If None, uses default:
                   Framework → MSG → BO → BP → BS → DTL → Production
        """
        DEFAULT_ORDER = ["Framework", "Common", "Utils", "MSG", "Messages", "BO", "BP", "BS", "DTL", "Production"]

        def sort_key(cls_dict):
            name = cls_dict["name"]
            for i, prefix in enumerate(order or DEFAULT_ORDER):
                if prefix in name:
                    return i
            return len(DEFAULT_ORDER)

        sorted_classes = sorted(classes, key=sort_key)
        results = []

        for cls in sorted_classes:
            result = await self.deploy_class(cls["name"], cls["content"])
            results.append(result)

            if not result["success"]:
                logger.warning("Batch deploy: stopping due to failure", failed_class=cls["name"])
                break

        return results

    async def test_connection(self) -> dict:
        """Test connectivity to the IRIS server."""
        url = f"{self.base_url}/doc/"
        try:
            async with httpx.AsyncClient(verify=self.ssl_verify) as client:
                response = await client.get(url, auth=self.auth, timeout=10.0)
                return {
                    "connected": response.status_code == 200,
                    "status_code": response.status_code,
                }
        except httpx.ConnectError as e:
            return {"connected": False, "error": str(e)}

    async def update_production(self, namespace_prefix: str) -> dict:
        """Restart the production after deploying changes.

        Executes: SELECT {prefix}_Utils.RestartHelper_UpdateProd() AS R
        """
        url = f"{self.base_url}/action/query"
        sql = f"SELECT {namespace_prefix}_Utils.RestartHelper_UpdateProd() AS R"
        payload = {"query": sql}

        async with httpx.AsyncClient(verify=self.ssl_verify) as client:
            response = await client.post(
                url,
                json=payload,
                auth=self.auth,
                timeout=30.0,
            )
            return {
                "success": response.status_code == 200,
                "response": response.json() if response.status_code == 200 else response.text,
            }
