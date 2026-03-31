# Guía de Operaciones — HealthBridge AI

## URLs de producción

| Servicio | URL |
|----------|-----|
| Frontend | http://healthbridge-dev-alb-309783113.us-east-1.elb.amazonaws.com |
| API Docs | http://healthbridge-dev-alb-309783113.us-east-1.elb.amazonaws.com/docs |
| GraphQL | http://healthbridge-dev-alb-309783113.us-east-1.elb.amazonaws.com/graphql |
| Health | http://healthbridge-dev-alb-309783113.us-east-1.elb.amazonaws.com/health |
| Health Ready | http://healthbridge-dev-alb-309783113.us-east-1.elb.amazonaws.com/health/ready |

## Administración

### Super Admin
- **Email:** luis@hospital.com
- Solo este usuario puede crear tenants y usuarios

### Crear cliente trial
```bash
TOKEN=$(curl -s -X POST "$ALB/api/v1/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"luis@hospital.com","password":"<password>"}' | jq -r '.access_token')

curl -X POST "$ALB/api/v1/admin/tenants" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"tenant_name":"Hospital X","admin_email":"admin@hospitalx.cl","admin_password":"Pass1234","plan":"trial","trial_days":14}'
```

### Cambiar plan de un tenant
```bash
curl -X PUT "$ALB/api/v1/admin/tenants/<tenant_id>/plan" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"plan":"professional"}'
```

### Desactivar tenant
```bash
curl -X PUT "$ALB/api/v1/admin/tenants/<tenant_id>/toggle-active" -H "Authorization: Bearer $TOKEN"
```

## Deploy

### Proceso estándar
```bash
# 1. Build images
docker build -f infra/docker/api.Dockerfile -t $ECR/healthbridge-dev-api:latest apps/api
docker build -f infra/docker/worker.Dockerfile -t $ECR/healthbridge-dev-worker:latest apps/api
docker build -f infra/docker/web.Dockerfile -t $ECR/healthbridge-dev-web:latest apps/web

# 2. Push
docker push $ECR/healthbridge-dev-api:latest
docker push $ECR/healthbridge-dev-worker:latest
docker push $ECR/healthbridge-dev-web:latest

# 3. Migrations (one-off ECS task)
aws ecs run-task --cluster healthbridge-dev-cluster --task-definition healthbridge-dev-api \
  --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[<subnet>],securityGroups=[<sg>]}" \
  --overrides '{"containerOverrides":[{"name":"api","command":["sh","-c","cd /app && PYTHONPATH=. python -m alembic upgrade head"]}]}'

# 4. Deploy services
aws ecs update-service --cluster healthbridge-dev-cluster --service healthbridge-dev-api --force-new-deployment
aws ecs update-service --cluster healthbridge-dev-cluster --service healthbridge-dev-worker --force-new-deployment
aws ecs update-service --cluster healthbridge-dev-cluster --service healthbridge-dev-web --force-new-deployment

# 5. Verify
curl http://healthbridge-dev-alb-309783113.us-east-1.elb.amazonaws.com/health
```

## Troubleshooting

### API retorna 503
- El servicio está redesplegándose. Espera 2-3 minutos.
- Verifica: `aws ecs describe-services --cluster healthbridge-dev-cluster --services healthbridge-dev-api`

### Worker no procesa tasks
- Verifica que el worker está corriendo: `aws ecs describe-services --cluster ... --services healthbridge-dev-worker`
- Revisa logs: `aws logs get-log-events --log-group-name /ecs/healthbridge-dev/worker`
- Si los tasks dicen "unregistered", el worker necesita redeploy con imagen nueva

### Login da 401 después de deploy
- El SECRET_KEY cambió — los tokens existentes se invalidan
- Asegura que SECRET_KEY está fijo en terraform.tfvars o Secrets Manager

### Upload da 403
- WAF bloquea archivos grandes. Las reglas SizeRestrictions_BODY están en modo "count"
- Si vuelve a bloquear, verificar WAF rules en AWS console

### Analysis falla con "prompt is too long"
- El archivo tiene demasiado contenido para Claude. El truncamiento está en 400K chars
- Para archivos muy grandes (>2MB), considerar análisis parcial

### Celery task "unregistered"
- El worker corre con código viejo. Redeploy: `aws ecs update-service --service healthbridge-dev-worker --force-new-deployment`

## Monitoreo

### CloudWatch Dashboard
- Nombre: `healthbridge-dev-dashboard`
- Métricas: Request count, Response time, 5xx errors, ECS CPU, RDS connections, Redis memory

### Alertas
- SNS Topic: `healthbridge-dev-alerts`
- Alerta 5xx > 10 en 5 minutos
- Alerta API CPU > 80%

### Logs
- API: `/ecs/healthbridge-dev/api`
- Worker: `/ecs/healthbridge-dev/worker`
- Web: `/ecs/healthbridge-dev/web`

## Backups

- **RDS:** Retención 30 días, ventana 03:00-04:00 UTC, point-in-time recovery
- **S3:** Versionado habilitado, lifecycle 90 días para uploads
- **Terraform state:** S3 bucket con versionado + DynamoDB locks
