# HealthBridge AI

**Plataforma SaaS para automatizar migraciones de integraciones healthcare hacia InterSystems IRIS/TrackCare usando agentes de IA (Claude).**

Nacido de la experiencia real migrando 30+ flujos HL7 para UC CHRISTUS (Chile).

## Pipeline

```
Upload → Analyze (Opus 4.6) → Map → Generate (Sonnet 4.6) → Validate → Deploy → Test → Export
```

## Plataformas origen soportadas

- Mirth Connect (XML channels)
- Oracle SOA/OSB (JAR composites, BPEL, XSL)
- Rhapsody (route XML)
- BizTalk (binding files)
- Cloverleaf

## Stack técnico

| Componente | Tecnología |
|------------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, React Flow, Monaco Editor |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Celery + Redis |
| IA | Claude via AWS Bedrock (Opus 4.6 análisis, Sonnet 4.6 codegen) |
| Base de datos | PostgreSQL 16 (Aurora Serverless v2) con RLS |
| Storage | AWS S3 (archivos fuente, código generado) |
| Infra | AWS ECS Fargate, ALB + WAF, ElastiCache Redis |
| IaC | Terraform |
| CI/CD | GitHub Actions |

## Desarrollo local

### Requisitos
- Python 3.12+
- Node.js 20+
- Docker (para PostgreSQL y Redis)
- AWS credentials (Bedrock account)

### Setup

```bash
# 1. Clonar
git clone https://github.com/lrodriolivera/healthbridge-ai.git
cd healthbridge-ai

# 2. Base de datos y Redis
docker run -d --name hb-postgres -e POSTGRES_DB=healthbridge -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5434:5432 postgres:16-alpine
docker run -d --name hb-redis -p 6380:6379 redis:7-alpine

# 3. Backend
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Crear .env
cp .env.example .env
# Editar .env con tus credenciales AWS Bedrock

# Migraciones
PYTHONPATH=. DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5434/healthbridge" alembic upgrade head

# Iniciar API (port 8001)
PYTHONPATH=. DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5434/healthbridge" REDIS_URL="redis://localhost:6380/0" uvicorn src.main:app --port 8001 --reload

# Iniciar Celery worker (otra terminal)
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

## Despliegue AWS

### Infraestructura (Terraform)

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Editar terraform.tfvars con tus valores

terraform init
terraform plan
terraform apply
```

### Deploy de código

```bash
# Build y push imágenes
ECR=<account_id>.dkr.ecr.us-east-1.amazonaws.com
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR

docker build -f infra/docker/api.Dockerfile -t $ECR/healthbridge-dev-api:latest apps/api
docker push $ECR/healthbridge-dev-api:latest

docker build -f infra/docker/worker.Dockerfile -t $ECR/healthbridge-dev-worker:latest apps/api
docker push $ECR/healthbridge-dev-worker:latest

docker build -f infra/docker/web.Dockerfile -t $ECR/healthbridge-dev-web:latest apps/web
docker push $ECR/healthbridge-dev-web:latest

# Migraciones
aws ecs run-task --cluster healthbridge-dev-cluster --task-definition healthbridge-dev-api --launch-type FARGATE --network-configuration "..." --overrides '{"containerOverrides":[{"name":"api","command":["sh","-c","cd /app && PYTHONPATH=. python -m alembic upgrade head"]}]}'

# Deploy
aws ecs update-service --cluster healthbridge-dev-cluster --service healthbridge-dev-api --force-new-deployment
aws ecs update-service --cluster healthbridge-dev-cluster --service healthbridge-dev-worker --force-new-deployment
aws ecs update-service --cluster healthbridge-dev-cluster --service healthbridge-dev-web --force-new-deployment
```

## Estructura del proyecto

```
healthbridge-ai/
├── apps/
│   ├── web/                  # Next.js 14 frontend
│   │   └── src/
│   │       ├── app/          # Pages (auth, dashboard, admin)
│   │       ├── components/   # React components (sidebar, code-viewer, hl7-viewer, etc.)
│   │       └── lib/          # API client, auth, i18n
│   └── api/                  # Python FastAPI backend
│       ├── src/
│       │   ├── routers/      # 20 API routers (~50 endpoints)
│       │   ├── models/       # 15 SQLAlchemy models
│       │   ├── schemas/      # Pydantic schemas
│       │   ├── services/     # Business logic
│       │   │   ├── agents/   # Claude AI agents (analysis, codegen, validation)
│       │   │   ├── file_parser/  # JAR, Mirth, Rhapsody, BizTalk parsers
│       │   │   ├── iris/     # Atelier REST client
│       │   │   ├── storage/  # S3 + local filesystem
│       │   │   └── testing/  # MLLP, SOAP, HTTP clients
│       │   ├── middleware/   # Auth, tenant, rate limiter, security, audit
│       │   ├── workers/      # Celery tasks (analysis, codegen, deploy, testing)
│       │   └── utils/        # Security, encryption, PHI sanitizer, file validation
│       ├── alembic/          # 11 DB migrations
│       └── tests/            # 55 pytest tests
├── knowledge-base/           # ObjectScript rules, templates, equivalence tables
├── infra/
│   ├── terraform/            # AWS infrastructure (VPC, ECS, RDS, Redis, S3, ALB, WAF)
│   ├── docker/               # Dockerfiles (API, Worker, Web)
│   └── agent-onprem/         # Lightweight IRIS connectivity agent
└── .github/workflows/        # CI (lint + test) + CD (build + deploy)
```

## API Endpoints principales

| Grupo | Prefix | Endpoints |
|-------|--------|-----------|
| Auth | `/api/v1/auth` | login, register, forgot-password, reset-password, refresh, logout |
| Projects | `/api/v1/projects` | CRUD + multi-platform |
| Uploads | `/api/v1/projects/{id}/uploads` | presigned-url, direct, images, list |
| Analysis | `/api/v1/projects/{id}/analyze` | trigger, status, components, analyze-file |
| Mappings | `/api/v1/projects/{id}/mappings` | CRUD, auto-generate, confirm-all, graph |
| CodeGen | `/api/v1/projects/{id}/generate` | generate-all, progress, list, diff, versions |
| Deploy | `/api/v1/projects/{id}/deploy` | deploy, dry-run, status, history |
| Testing | `/api/v1/projects/{id}/tests` | CRUD, execute, results, import-hl7 |
| Export | `/api/v1/projects/{id}/export` | documentation (MD), pdf, summary, diff-report |
| IRIS | `/api/v1/iris-connections` | CRUD + test connectivity |
| Settings | `/api/v1/settings` | tenant, profile, models |
| Admin | `/api/v1/admin` | tenants, users, plans (super admin only) |
| Dashboard | `/api/v1/dashboard` | aggregated stats |
| Audit | `/api/v1/audit-logs` | filterable log viewer |
| Templates | `/api/v1/templates` | shared ObjectScript patterns |
| Lookup | `/api/v1/projects/{id}/lookup-tables` | CRUD + ObjectScript globals |
| GraphQL | `/graphql` | dashboard + project summary queries |

## Planes

| Plan | Proyectos | Componentes | CodeGen | Deploy/Test |
|------|-----------|-------------|---------|-------------|
| Trial (14 días) | 2 | 5/proyecto | 10 | No |
| Starter | 5 | 20/proyecto | 50 | Sí |
| Professional | 20 | 100/proyecto | 500 | Sí + Export |
| Enterprise | Ilimitado | Ilimitado | Ilimitado | Todo |

## Seguridad

- JWT auth con httpOnly cookies + Bearer header
- Rate limiting distribuido (Redis)
- PostgreSQL Row-Level Security
- PHI sanitization antes de enviar a Claude
- IRIS credentials cifradas con Fernet
- Security headers (HSTS, X-Frame-Options, CSP)
- SSRF protection
- WAF con rate limiting + AWS managed rules
- Audit logging automático de todas las operaciones
- Password validation (min 8 chars, letra + número)

## Licencia

Propietario. Todos los derechos reservados.
