# HealthBridge On-Premise Agent

Lightweight Docker service that runs in the customer's network, next to their IRIS server.
Provides secure connectivity between HealthBridge Cloud and IRIS without VPN or public exposure.

## Quick Start

```bash
docker run -d --name hb-agent \
  healthbridge/agent-onprem \
  --api-url https://api.healthbridge.ai \
  --token YOUR_JWT_TOKEN \
  --iris-url http://iris-server:57772 \
  --namespace HB \
  --iris-user SuperUser \
  --iris-pass SYS
```

## Build

```bash
docker build -t healthbridge/agent-onprem .
```

## How it works

1. Agent polls HealthBridge Cloud API every 30 seconds
2. When deploy/test tasks are pending, agent executes them against local IRIS
3. Results are reported back to the cloud API
4. All communication is outbound HTTPS — no inbound ports needed
