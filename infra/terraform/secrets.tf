# AWS Secrets Manager for sensitive credentials

resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${local.name_prefix}-app-secrets"
  description = "HealthBridge API secrets (DB, JWT, Bedrock)"
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    SECRET_KEY                    = var.jwt_secret_key
    DATABASE_URL                  = "postgresql+asyncpg://${var.db_username}:${var.db_password}@${aws_rds_cluster.main.endpoint}:5432/${var.db_name}"
    AWS_BEDROCK_ACCESS_KEY_ID     = var.bedrock_access_key_id
    AWS_BEDROCK_SECRET_ACCESS_KEY = var.bedrock_secret_access_key
  })
}

# IAM policy for ECS to read secrets
resource "aws_iam_role_policy" "ecs_secrets_read" {
  name = "${local.name_prefix}-secrets-read"
  role = aws_iam_role.ecs_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [aws_secretsmanager_secret.app_secrets.arn]
    }]
  })
}
