# API Reference — HealthBridge AI

Base URL: `http://healthbridge-dev-alb-309783113.us-east-1.elb.amazonaws.com/api/v1`

Swagger interactivo: `/docs`

## Autenticación

Todas las rutas (excepto `/health`, `/auth/login`, `/auth/register`, `/auth/forgot-password`) requieren Bearer token o httpOnly cookie.

```bash
# Obtener token
TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"user@org.com","password":"Password1"}' | jq -r '.access_token')

# Usar token
curl -H "Authorization: Bearer $TOKEN" "$BASE/projects"
```

## Endpoints

### Auth (`/auth`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registrar (solo primer usuario) |
| POST | `/auth/login` | Login → JWT + cookie |
| POST | `/auth/logout` | Limpiar cookie |
| GET | `/auth/me` | Usuario actual |
| POST | `/auth/refresh` | Refrescar token |
| POST | `/auth/forgot-password` | Enviar email de reset |
| POST | `/auth/reset-password` | Reset con token |

### Projects (`/projects`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/projects` | Listar proyectos |
| POST | `/projects` | Crear proyecto (enforces max_projects) |
| GET | `/projects/{id}` | Detalle |
| PUT | `/projects/{id}` | Actualizar |
| DELETE | `/projects/{id}` | Eliminar |

### Uploads (`/projects/{id}/uploads`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `../uploads/direct` | Upload directo (multipart) |
| POST | `../uploads/presigned-url` | URL pre-firmada S3 |
| POST | `../uploads/images` | Upload de imágenes |
| GET | `../uploads` | Listar archivos |

### Analysis (`/projects/{id}`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `../analyze` | Analizar todos (enforces analysis feature) |
| POST | `../analyze-file` | Analizar un archivo |
| POST | `../analyze-image` | Analizar imagen (Vision) |
| GET | `../analysis/status` | Status del análisis |
| GET | `../components` | Listar componentes |
| GET | `../components/{cid}` | Detalle de componente |

### Mappings (`/projects/{id}/mappings`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `../mappings` | Listar mappings |
| POST | `../mappings` | Crear mapping manual |
| POST | `../mappings/auto-generate` | Auto-generar + confirmar |
| POST | `../mappings/confirm-all` | Confirmar todos |
| POST | `../mappings/{mid}/confirm` | Confirmar uno |
| GET | `../mappings/graph` | Datos React Flow |
| PUT | `../mappings/{mid}` | Actualizar |
| DELETE | `../mappings/{mid}` | Eliminar |

### Code Generation (`/projects/{id}`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `../generate` | Generar todo (enforces codegen) |
| POST | `../generate/{mid}` | Generar uno |
| GET | `../generate/progress` | Progreso de generación |
| GET | `../generated` | Listar clases |
| GET | `../generated/{gid}` | Detalle + código |
| GET | `../generated/{gid}/download` | Descargar .cls |
| POST | `../generated/{gid}/regenerate` | Regenerar con feedback |
| GET | `../generated/{gid}/versions` | Historial de versiones |
| GET | `../generated/{gid}/diff` | Diff entre versiones |
| POST | `../generated/download-all` | Descargar ZIP |

### Deploy (`/projects/{id}/deploy`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `../deploy` | Desplegar (enforces deploy feature) |
| POST | `../deploy/dry-run` | Simulación |
| GET | `../deploy/status` | Estado |
| GET | `../deploy/history` | Historial |

### Testing (`/projects/{id}/tests`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `../tests` | Listar test cases |
| POST | `../tests` | Crear test case |
| POST | `../tests/{tid}/execute` | Ejecutar (enforces testing) |
| POST | `../tests/execute-all` | Ejecutar todos |
| GET | `../tests/results` | Resultados |
| POST | `../tests/import-hl7` | Importar mensajes HL7 |

### Export (`/projects/{id}/export`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `../export/documentation` | Markdown (enforces export) |
| GET | `../export/pdf` | PDF con ReportLab |
| GET | `../export/summary` | JSON resumen |
| GET | `../export/diff-report` | Reporte de cobertura |

### Admin (`/admin`) — Solo super admin
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/tenants` | Listar tenants |
| POST | `/admin/tenants` | Crear tenant + admin |
| PUT | `/admin/tenants/{id}/plan` | Cambiar plan |
| PUT | `/admin/tenants/{id}/toggle-active` | Activar/desactivar |
| POST | `/admin/users` | Crear usuario |
| GET | `/admin/plans` | Ver planes |

### Dashboard (`/dashboard`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/dashboard` | Stats agregados del tenant |

### IRIS Connections (`/iris-connections`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/iris-connections` | Listar conexiones |
| POST | `/iris-connections` | Crear (creds cifradas) |
| PUT | `/iris-connections/{id}` | Actualizar |
| DELETE | `/iris-connections/{id}` | Eliminar |
| POST | `/iris-connections/{id}/test` | Probar conectividad |
