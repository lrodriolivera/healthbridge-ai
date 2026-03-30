# CLAUDE.md - HealthBridge AI

## Project Context
**HealthBridge AI** is a SaaS platform that automates healthcare integration migrations from any source platform (Mirth Connect, Oracle SOA/OSB, Rhapsody, Cloverleaf, BizTalk, etc.) to InterSystems IRIS/TrackCare using Claude AI agents.

Born from real-world experience migrating 30+ HL7 flows for UC CHRISTUS (Chile).

## Communication
- Respond in **Spanish** unless the user writes in English.
- Use technical terms in their original language (HL7, MLLP, SOAP, ObjectScript, etc.)

## Tech Stack
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Flow, Monaco Editor
- **Backend:** Python 3.12+, FastAPI, Celery + Redis
- **AI:** Claude API (Anthropic Python SDK) — Sonnet for analysis/codegen, Opus for high complexity
- **Database:** PostgreSQL 16 (RDS) with Row-Level Security for multi-tenancy
- **Storage:** AWS S3 (source files, generated classes, test artifacts)
- **Secrets:** AWS Secrets Manager (IRIS credentials)
- **Infra:** AWS ECS Fargate, ALB, CloudFront, Terraform
- **CI/CD:** GitHub Actions
- **Monorepo:** Turborepo

## Project Structure
```
healthbridge-ai/
├── apps/
│   ├── web/                  # Next.js frontend
│   │   └── src/
│   │       ├── app/          # App Router pages
│   │       ├── components/   # React components
│   │       └── lib/          # API client, utils
│   └── api/                  # Python FastAPI backend
│       └── src/
│           ├── routers/      # API endpoints
│           ├── models/       # SQLAlchemy models
│           ├── schemas/      # Pydantic schemas
│           ├── services/     # Business logic
│           │   ├── agents/   # Claude AI agents
│           │   ├── file_parser/  # JAR, Mirth, BPEL parsers
│           │   ├── iris/     # Atelier client, deployer
│           │   └── testing/  # MLLP, SOAP, HTTP clients
│           ├── middleware/   # Auth, tenant, rate limiting
│           └── workers/      # Celery async tasks
├── packages/
│   └── shared/               # Shared types & constants
├── knowledge-base/           # Domain knowledge for AI agents
│   ├── iris-class-patterns/  # ObjectScript templates
│   ├── equivalence-tables/   # SOA/Mirth → IRIS mappings
│   └── hl7-reference/        # HL7 specs
├── infra/
│   ├── terraform/            # AWS infrastructure
│   └── docker/               # Dockerfiles, compose
└── .github/workflows/        # CI/CD
```

## Key Commands
```bash
# Development
npm run dev              # Start all apps (turborepo)
npm run dev:web          # Frontend only
npm run dev:api          # Backend only (uvicorn)

# Backend
cd apps/api
pip install -r requirements.txt
uvicorn src.main:app --reload

# Frontend
cd apps/web
npm install
npm run dev

# Database
cd apps/api
alembic upgrade head     # Run migrations

# Docker (full stack)
docker-compose -f infra/docker/docker-compose.dev.yml up
```

## Architecture Principles
1. **Multi-tenant first** — Every query filtered by tenant_id via PostgreSQL RLS
2. **Agentic pipeline** — Upload → Analyze → Map → Generate → Validate → Deploy → Test
3. **Knowledge-base driven** — Agent prompts reference ObjectScript rules, templates, equivalence tables
4. **No pricing in platform** — Negotiated per client
5. **PHI-aware** — HL7 test messages may contain patient data, encrypt at rest, sanitize before sending to Claude when possible

## ObjectScript Rules (for AI Agents)
These rules MUST be embedded in all codegen/validation agent prompts:
1. **NEVER `Quit "value"` inside Try** — causes ERROR #1043
2. **NEVER use underscores in variable names** — `_` is concatenation in ObjectScript
3. **NEVER `New $NAMESPACE` inside Try** — save/restore explicitly
4. **NEVER use SetValueAt** for building HL7 messages — use raw string concatenation
5. **NEVER use GetValueAt for PID/PV1/PV2** — use RawParser; GetValueAt only for MSH
6. **Always Try/Catch** with explicit namespace save/restore
7. **Build HL7 with raw strings:** `"PID" _ "|" _ field1 _ "|" _ field2`
8. **Segment separator:** `$CHAR(13)` (CR)
9. **Set DocType AFTER ImportFromString**
