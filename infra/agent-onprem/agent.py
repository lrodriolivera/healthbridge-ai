"""
HealthBridge On-Premise Agent
Lightweight proxy that runs in the customer's network next to IRIS.
Connects to HealthBridge Cloud API and relays deploy/test commands to IRIS.

Usage: python agent.py --api-url https://api.healthbridge.ai --token <jwt> --iris-url http://iris:57772 --namespace HB
"""

import argparse
import asyncio
import json
import time

import httpx


class OnPremiseAgent:
    def __init__(self, api_url: str, token: str, iris_url: str, namespace: str, iris_user: str, iris_pass: str):
        self.api_url = api_url.rstrip("/")
        self.token = token
        self.iris_url = iris_url.rstrip("/")
        self.namespace = namespace
        self.iris_user = iris_user
        self.iris_pass = iris_pass
        self.headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    async def health_check_iris(self) -> dict:
        """Check IRIS server connectivity."""
        try:
            async with httpx.AsyncClient(timeout=10, verify=False) as client:
                url = f"{self.iris_url}/api/atelier/v1/{self.namespace}"
                resp = await client.get(url, auth=(self.iris_user, self.iris_pass))
                return {"connected": True, "status": resp.status_code}
        except Exception as e:
            return {"connected": False, "error": str(e)}

    async def deploy_class(self, class_name: str, code: str) -> dict:
        """Deploy a single class to IRIS via Atelier API."""
        try:
            url = f"{self.iris_url}/api/atelier/v1/{self.namespace}/doc/{class_name}.cls"
            content = {"enc": False, "content": code.split("\n")}
            async with httpx.AsyncClient(timeout=30, verify=False) as client:
                resp = await client.put(url, json=content, auth=(self.iris_user, self.iris_pass))
                if resp.status_code == 200:
                    # Compile
                    compile_url = f"{self.iris_url}/api/atelier/v1/{self.namespace}/action/compile"
                    compile_resp = await client.post(
                        compile_url,
                        json=[f"{class_name}.cls"],
                        auth=(self.iris_user, self.iris_pass),
                    )
                    return {"success": True, "uploaded": True, "compiled": compile_resp.status_code == 200}
                return {"success": False, "status": resp.status_code, "error": resp.text[:200]}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def send_mllp(self, host: str, port: int, message: str) -> dict:
        """Send HL7 message via MLLP protocol."""
        VT, FS, CR = b'\x0b', b'\x1c', b'\x0d'
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(host, port), timeout=10
            )
            frame = VT + message.encode("utf-8") + FS + CR
            writer.write(frame)
            await writer.drain()

            response = await asyncio.wait_for(reader.read(65536), timeout=30)
            writer.close()

            resp_text = response.decode("utf-8").strip('\x0b\x1c\x0d')
            ack = None
            for line in resp_text.replace('\r', '\n').split('\n'):
                if line.startswith('MSA|'):
                    ack = line.split('|')[1] if '|' in line else None
                    break

            return {"success": True, "response": resp_text, "ack_code": ack}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def poll_and_execute(self):
        """Main loop: poll cloud API for pending tasks and execute them."""
        print(f"Agent started. IRIS: {self.iris_url}/{self.namespace}")
        print(f"Cloud API: {self.api_url}")

        # Initial health check
        health = await self.health_check_iris()
        print(f"IRIS health: {health}")

        while True:
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    # Report status
                    await client.post(
                        f"{self.api_url}/api/v1/agent/heartbeat",
                        headers=self.headers,
                        json={
                            "status": "online",
                            "iris_url": self.iris_url,
                            "namespace": self.namespace,
                            "iris_health": await self.health_check_iris(),
                        },
                    )
            except Exception as e:
                print(f"Heartbeat failed: {e}")

            await asyncio.sleep(30)  # Poll every 30 seconds


def main():
    parser = argparse.ArgumentParser(description="HealthBridge On-Premise Agent")
    parser.add_argument("--api-url", required=True, help="HealthBridge Cloud API URL")
    parser.add_argument("--token", required=True, help="JWT authentication token")
    parser.add_argument("--iris-url", required=True, help="IRIS server URL (e.g., http://iris:57772)")
    parser.add_argument("--namespace", required=True, help="IRIS namespace (e.g., HB)")
    parser.add_argument("--iris-user", default="SuperUser", help="IRIS username")
    parser.add_argument("--iris-pass", default="SYS", help="IRIS password")
    args = parser.parse_args()

    agent = OnPremiseAgent(
        api_url=args.api_url, token=args.token,
        iris_url=args.iris_url, namespace=args.namespace,
        iris_user=args.iris_user, iris_pass=args.iris_pass,
    )
    asyncio.run(agent.poll_and_execute())


if __name__ == "__main__":
    main()
