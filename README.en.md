# HealthBridge AI

**SaaS platform for automating healthcare integration migrations to InterSystems IRIS/TrackCare using AI agents (Claude).**

Born from real-world experience migrating 30+ HL7 flows for UC CHRISTUS (Chile).

## Pipeline

```
Upload → Analyze (Opus 4.6) → Map → Generate (Sonnet 4.6) → Validate → Deploy → Test → Export
```

## Supported Source Platforms

- Mirth Connect (XML channels)
- Oracle SOA/OSB (JAR composites, BPEL, XSL)
- Rhapsody (route XML)
- BizTalk (binding files)
- Cloverleaf

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, React Flow, Monaco Editor |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Celery + Redis |
| AI | Claude via AWS Bedrock (Opus 4.6 analysis, Sonnet 4.6 codegen) |
| Database | PostgreSQL 16 (Aurora Serverless v2) with RLS |
| Storage | AWS S3 (source files, generated code) |
| Infra | AWS ECS Fargate, ALB + WAF, ElastiCache Redis |
| IaC | Terraform |
| CI/CD | GitHub Actions |

## Local Development

### Prerequisites
- Python 3.12+
- Node.js 20+
- Docker (PostgreSQL and Redis)
- AWS credentials (Bedrock account)

### Setup

```bash
# 1. Clone
git clone https://github.com/lrodriolivera/healthbridge-ai.git
cd healthbridge-ai

# 2. Database and Redis
docker run -d --name hb-postgres -e POSTGRES_DB=healthbridge -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5434:5432 postgres:16-alpine
docker run -d --name hb-redis -p 6380:6379 redis:7-alpine

# 3. Backend
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Create .env
cp .env.example .env
# Edit .env with your AWS Bedrock credentials

# Migrations
PYTHONPATH=. DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5434/healthbridge" alembic upgrade head

# Start API (port 8001)
PYTHONPATH=. DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5434/healthbridge" REDIS_URL="redis://localhost:6380/0" uvicorn src.main:app --port 8001 --reload

# Start Celery worker (separate terminal)
PYTHONPATH=. DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5434/healthbridge" REDIS_URL="redis://localhost:6380/0" celery -A src.workers worker --loglevel=info

# 4. Frontend
cd apps/web
npm install
NEXT_PUBLIC_API_URL="http://localhost:8001/api/v1" npm run dev
```

### Tests

```bash
# Backend (55 tests)
cd apps/api
PYTHONPATH=. DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5434/healthbridge_test" pytest tests/ -v

# Frontend (21 tests)
cd apps/web
npm test
```

## AWS Deployment

### Infrastructure (Terraform)

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

terraform init
terraform plan
terraform apply
```

### Code Deploy

```bash
ECR=<account_id>.dkr.ecr.us-east-1.amazonaws.com
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR

# Build and push
docker build -f infra/docker/api.Dockerfile -t $ECR/healthbridge-dev-api:latest apps/api && docker push $ECR/healthbridge-dev-api:latest
docker build -f infra/docker/worker.Dockerfile -t $ECR/healthbridge-dev-worker:latest apps/api && docker push $ECR/healthbridge-dev-worker:latest
docker build -f infra/docker/web.Dockerfile -t $ECR/healthbridge-dev-web:latest apps/web && docker push $ECR/healthbridge-dev-web:latest

# Migrate + deploy
aws ecs run-task --cluster healthbridge-dev-cluster --task-definition healthbridge-dev-api --launch-type FARGATE ...
aws ecs update-service --cluster healthbridge-dev-cluster --service healthbridge-dev-api --force-new-deployment
aws ecs update-service --cluster healthbridge-dev-cluster --service healthbridge-dev-worker --force-new-deployment
aws ecs update-service --cluster healthbridge-dev-cluster --service healthbridge-dev-web --force-new-deployment
```

## Project Structure

```
healthbridge-ai/
├── apps/web/                 # Next.js 14 frontend (20+ pages)
├── apps/api/                 # FastAPI backend (20 routers, ~50 endpoints)
│   ├── src/services/agents/  # Claude AI agents (analysis, codegen, validation)
│   ├── src/services/file_parser/  # JAR, Mirth, Rhapsody, BizTalk parsers
│   ├── src/middleware/       # Auth, tenant, rate limiter, security, audit
│   └── src/workers/          # Celery async tasks
├── knowledge-base/           # ObjectScript rules, templates, equivalence tables
├── infra/terraform/          # AWS infrastructure (VPC, ECS, RDS, Redis, S3, ALB, WAF)
└── .github/workflows/        # CI/CD pipelines
```

## Plans

| Plan | Projects | Components | CodeGen | Deploy/Test |
|------|----------|------------|---------|-------------|
| Trial (14 days) | 2 | 5/project | 10 | No |
| Starter | 5 | 20/project | 50 | Yes |
| Professional | 20 | 100/project | 500 | Yes + Export |
| Enterprise | Unlimited | Unlimited | Unlimited | Everything |

## Security

- JWT auth with httpOnly cookies + Bearer header
- Distributed rate limiting (Redis)
- PostgreSQL Row-Level Security
- PHI sanitization before sending to Claude
- IRIS credentials encrypted with Fernet
- Security headers (HSTS, X-Frame-Options, CSP)
- SSRF protection, WAF, audit logging
- Password validation (min 8 chars, letter + number)

## License

Proprietary. All rights reserved.
