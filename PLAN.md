# HealthBridge AI — Plan de Implementación

## Nombre: HealthBridge AI
Plataforma SaaS que automatiza migraciones de integraciones healthcare hacia InterSystems IRIS/TrackCare usando agentes de IA (Claude).

---

## 1. Arquitectura de Alto Nivel

```
                          ┌─────────────────────────────────┐
                          │        CloudFront CDN           │
                          └──────────────┬──────────────────┘
                                         │
                          ┌──────────────▼──────────────────┐
                          │   Frontend (Next.js)             │
                          │  - Upload Portal                 │
                          │  - Visual Mapper (React Flow)    │
                          │  - IRIS Config Panel             │
                          │  - Test Runner Dashboard         │
                          │  - Migration Progress Board      │
                          └──────────────┬──────────────────┘
                                         │ HTTPS
                          ┌──────────────▼──────────────────┐
                          │        API Gateway (ALB + WAF)   │
                          └──────────────┬──────────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
   ┌──────────▼──────────┐  ┌───────────▼──────────┐  ┌───────────▼──────────┐
   │   API Service        │  │  Agent Orchestrator   │  │  Deploy Service       │
   │   (FastAPI)          │  │  (FastAPI + Celery)    │  │  (FastAPI)            │
   │                      │  │                        │  │                       │
   │  - Auth/Tenants      │  │  - Analysis Agent      │  │  - Atelier REST API   │
   │  - Projects CRUD     │  │  - CodeGen Agent       │  │  - MLLP Test Runner   │
   │  - File Upload       │  │  - Validation Agent    │  │  - SOAP Test Runner   │
   │  - Mapping CRUD      │  │  - Review Agent        │  │  - HTTP Test Runner   │
   │  - Config Mgmt       │  │  - Image Analyzer      │  │                       │
   └─────────┬────────────┘  └───────────┬────────────┘  └───────────┬───────────┘
              │                          │                            │
              │         ┌────────────────┤                            │
              │         │                │                            │
   ┌──────────▼─────┐  │  ┌─────────────▼──────┐          ┌─────────▼──────────┐
   │  PostgreSQL     │  │  │  Redis              │          │  Customer IRIS     │
   │  (RDS)          │  │  │  (ElastiCache)      │          │  Server            │
   │                 │  │  │  - Task Queue        │          │  (via Agent        │
   │  - Tenants      │  │  │  - Agent State       │          │   on-premise/VPN)  │
   │  - Projects     │  │  │  - Cache             │          └────────────────────┘
   │  - Mappings     │  │  └──────────────────────┘
   │  - Audit Log    │  │
   └─────────────────┘  │  ┌──────────────────────┐
                        └──│  S3                   │
                           │  - /uploads/{tenant}/ │
                           │  - /generated/{tenant}│
                           └──────────────────────┘
                           ┌──────────────────────┐
                           │  Claude API           │
                           │  (Anthropic)          │
                           └──────────────────────┘
```

---

## 2. Pipeline Agéntico

```
Upload Files (JAR, XML Mirth, imágenes, diagramas)
    │
    ▼
[File Parser] ──── Desempaqueta JAR, parsea XML, extrae BPEL/XSL/WSDL
    │
    ▼
[Analysis Agent] ──── Claude analiza lógica de cada componente
    │
    ▼
[Image Analysis Agent] ──── Claude Vision interpreta diagramas/screenshots
    │
    ▼
[Mapping Proposal] ──── Auto-genera mapeo origen → IRIS
    │
    ▼
[User Review] ──── Usuario confirma/ajusta mapeo en UI visual (React Flow)
    │
    ▼
[CodeGen Agent] ──── Genera .cls ObjectScript para cada mapping confirmado
    │                  (paralelo por componente, respetando dependencias)
    ▼
[Validation Agent] ──── Valida cada .cls contra reglas críticas ObjectScript
    │
    ├── PASS ──────▶ [S3 Storage] ──▶ [Deploy a IRIS (opcional)]
    │
    └── FAIL ──────▶ [CodeGen Agent] (retry con feedback, max 3 intentos)
    │
    ▼
[Test Executor] ──── Ejecuta casos de prueba MLLP/SOAP/HTTP contra IRIS
    │
    ▼
[Results Dashboard] ──── Reporta resultados, ACKs, tiempos, errores
```

---

## 3. Fases de Implementación

### FASE 0: Fundación (Semanas 1-2)
- Monorepo Turborepo inicializado
- PostgreSQL schema base con Alembic (tenants, users, projects)
- FastAPI skeleton con JWT auth + tenant middleware
- Next.js app con layout, auth pages, proyecto CRUD básico
- S3 bucket con políticas por tenant
- Docker Compose para desarrollo local
- CI pipeline GitHub Actions (lint + test)

### FASE 1: Ingesta y Análisis (Semanas 3-5)
- File Upload: drag-and-drop, presigned URLs a S3
- JAR Parser: desempaqueta Oracle SOA, extrae composite.xml, BPEL, XSL, WSDL
- Mirth Parser: parsea canales XML, extrae source/destinations/transformers
- Analysis Agent: Claude analiza lógica de cada componente → JSON estructurado
- Image Analysis Agent: Claude Vision interpreta diagramas de flujo
- Dashboard de componentes descubiertos

### FASE 2: Mapeo y Generación de Código (Semanas 6-9)
- Visual Mapper con React Flow (grafo origen → destino IRIS)
- Tablas de equivalencia SOA/Mirth → IRIS
- CodeGen Agent: genera .cls con templates + Claude
- Validation Agent: reglas estáticas + semánticas
- Code Viewer con Monaco Editor (ObjectScript syntax)
- Almacenamiento en S3 organizado por tenant/project/namespace

### FASE 3: Deploy a IRIS (Semanas 10-12)
- IRIS Connection Manager (CRUD con credenciales cifradas en Secrets Manager)
- Atelier Client (PUT/POST via REST API, manejo error #5559)
- Dependency Resolver (Framework→MSG→BO→BP→BS→Production)
- Production.cls auto-generada
- Deploy Pipeline UI (wizard paso a paso)

### FASE 4: Testing (Semanas 13-15)
- Test Case Editor (cargar/editar mensajes HL7, SOAP requests)
- MLLP Client (frame VT+msg+FS+CR, envío TCP, captura ACK)
- SOAP/HTTP Client
- Test Executor (baterías de tests, comparar con expected)
- Results Dashboard con drill-down
- HL7 Message Viewer (segmentos coloreados, campos expandibles)

### FASE 5: Polish y Multi-Platform (Semanas 16-18)
- Más plataformas origen (Rhapsody, Cloverleaf, BizTalk)
- Webhooks/notificaciones (Slack, email)
- Audit log completo
- Export documentación automática por flujo
- Template Library colaborativa

---

## 4. Modelo de Datos

```sql
-- Tenant: organización cliente
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User: usuario dentro de un tenant
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',  -- admin, member, viewer
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Project: proyecto de migración
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source_platform VARCHAR(50) NOT NULL,  -- 'oracle_soa', 'mirth_connect', 'rhapsody', etc.
    target_platform VARCHAR(50) DEFAULT 'iris_healthconnect',
    status VARCHAR(50) DEFAULT 'created',
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SourceComponent: componente descubierto del sistema origen
CREATE TABLE source_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    component_type VARCHAR(100) NOT NULL,
    source_file_s3_key TEXT,
    analysis_result JSONB,
    exposed_services JSONB DEFAULT '[]',
    external_references JSONB DEFAULT '[]',
    hl7_messages JSONB DEFAULT '[]',
    complexity VARCHAR(20),
    status VARCHAR(50) DEFAULT 'discovered',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mapping: mapeo componente origen → destino IRIS
CREATE TABLE mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    source_component_id UUID REFERENCES source_components(id),
    target_class_name VARCHAR(500) NOT NULL,
    target_type VARCHAR(50) NOT NULL,  -- BusinessService, BusinessProcess, BusinessOperation, DTL, Message
    target_extends VARCHAR(255),
    iris_layer VARCHAR(20),            -- BS, BP, BO, DTL, MSG, Utils
    settings JSONB DEFAULT '{}',
    notes TEXT,
    auto_generated BOOLEAN DEFAULT true,
    confirmed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GeneratedClass: clase ObjectScript generada
CREATE TABLE generated_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mapping_id UUID REFERENCES mappings(id),
    project_id UUID REFERENCES projects(id),
    class_name VARCHAR(500) NOT NULL,
    s3_key TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    content_hash VARCHAR(64),
    generation_model VARCHAR(100),
    generation_prompt_tokens INTEGER,
    generation_completion_tokens INTEGER,
    validation_status VARCHAR(50),
    validation_issues JSONB DEFAULT '[]',
    deploy_status JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IRISConnection: conexión a servidor IRIS del cliente
CREATE TABLE iris_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    namespace VARCHAR(100) NOT NULL,
    credentials_secret_arn TEXT,
    ssl_verify BOOLEAN DEFAULT true,
    environment VARCHAR(50) DEFAULT 'dev',
    last_health_check TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TestCase: caso de prueba
CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    protocol VARCHAR(50) NOT NULL,  -- mllp, http, soap
    target_port INTEGER,
    target_host VARCHAR(255),
    message_content TEXT NOT NULL,
    expected_response TEXT,
    hl7_message_type VARCHAR(20),
    tags JSONB DEFAULT '[]',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TestResult: resultado de ejecución
CREATE TABLE test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_case_id UUID REFERENCES test_cases(id),
    iris_connection_id UUID REFERENCES iris_connections(id),
    status VARCHAR(50) NOT NULL,
    response_content TEXT,
    response_time_ms INTEGER,
    ack_code VARCHAR(10),
    error_message TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    executed_by UUID REFERENCES users(id)
);

-- AuditLog
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. APIs Principales

### Auth
```
POST   /api/v1/auth/login
POST   /api/v1/auth/register
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
```

### Projects
```
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/{id}
PUT    /api/v1/projects/{id}
DELETE /api/v1/projects/{id}
GET    /api/v1/projects/{id}/dashboard
```

### Upload & Ingesta
```
POST   /api/v1/projects/{id}/uploads/presigned-url
POST   /api/v1/projects/{id}/uploads/confirm
POST   /api/v1/projects/{id}/uploads/images
GET    /api/v1/projects/{id}/uploads
```

### Análisis
```
POST   /api/v1/projects/{id}/analyze
GET    /api/v1/projects/{id}/analysis/status
GET    /api/v1/projects/{id}/components
GET    /api/v1/projects/{id}/components/{cid}
POST   /api/v1/projects/{id}/analyze-image
```

### Mapeo
```
GET    /api/v1/projects/{id}/mappings
POST   /api/v1/projects/{id}/mappings
PUT    /api/v1/projects/{id}/mappings/{mid}
DELETE /api/v1/projects/{id}/mappings/{mid}
POST   /api/v1/projects/{id}/mappings/auto-generate
POST   /api/v1/projects/{id}/mappings/{mid}/confirm
GET    /api/v1/projects/{id}/mappings/graph
```

### Code Generation
```
POST   /api/v1/projects/{id}/generate
POST   /api/v1/projects/{id}/generate/{mid}
GET    /api/v1/projects/{id}/generated
GET    /api/v1/projects/{id}/generated/{gid}
GET    /api/v1/projects/{id}/generated/{gid}/download
POST   /api/v1/projects/{id}/generated/{gid}/regenerate
POST   /api/v1/projects/{id}/generated/download-all
```

### Deploy
```
POST   /api/v1/projects/{id}/deploy
POST   /api/v1/projects/{id}/deploy/dry-run
GET    /api/v1/projects/{id}/deploy/status
GET    /api/v1/projects/{id}/deploy/history
```

### Testing
```
GET    /api/v1/projects/{id}/tests
POST   /api/v1/projects/{id}/tests
PUT    /api/v1/projects/{id}/tests/{tid}
POST   /api/v1/projects/{id}/tests/{tid}/execute
POST   /api/v1/projects/{id}/tests/execute-all
GET    /api/v1/projects/{id}/tests/results
GET    /api/v1/projects/{id}/tests/results/{rid}
POST   /api/v1/projects/{id}/tests/import-hl7
```

### IRIS Connections
```
GET    /api/v1/iris-connections
POST   /api/v1/iris-connections
PUT    /api/v1/iris-connections/{id}
DELETE /api/v1/iris-connections/{id}
POST   /api/v1/iris-connections/{id}/test
GET    /api/v1/iris-connections/{id}/namespaces
```

---

## 6. Funcionalidades Adicionales

1. **Production.cls auto-generada** — genera archivo completo con Items y Settings
2. **Dependency Resolver visual** — orden: Framework→MSG→BO→BP→BS→Production
3. **Lookup Table Manager** — define tablas, genera globals ObjectScript
4. **HL7 Message Validator** — valida estructura antes de tests
5. **Migration Diff Report** — comparativa lógica original vs generada
6. **Template Library colaborativa** — patrones exitosos reutilizables
7. **Rollback Support** — versiones de cada clase, rollback via Atelier
8. **Export documentación automática** — docs tipo FLUJO_*_DOCUMENTACION.md
9. **Agent on-premise** — servicio ligero para conectar IRIS en red privada
10. **Endpoint Discovery** — detectar URLs SOAP referenciadas, health check

---

## 7. Seguridad

### PHI (Protected Health Information)
- S3 cifrado con SSE-KMS, auto-purga configurable por tenant
- Sanitizar PHI antes de enviar a Claude API cuando sea posible
- Solo usuarios autorizados pueden ver contenido de mensajes HL7

### Credenciales IRIS
- AWS Secrets Manager, NUNCA en base de datos
- Rotación automática soportada

### Multi-Tenant
- PostgreSQL RLS en todas las tablas con tenant_id
- S3 paths prefijados: `s3://healthbridge-data/{tenant_id}/`
- IAM policies que impiden cross-tenant access

### Conectividad con IRIS del cliente
- Opciones: VPN site-to-site, AWS PrivateLink, SSH tunnel, Agent on-premise (recomendado)

### Compliance
- HIPAA ready (BAA con Anthropic y AWS)
- Ley 19.628 Chile (datos personales/salud)
- Audit log completo de todas las acciones

### Network
- WAF en ALB, TLS 1.2+, CORS restringido, rate limiting por tenant
