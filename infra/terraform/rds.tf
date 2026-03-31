# RDS PostgreSQL 16

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${local.name_prefix}-db-subnet" }
}

resource "aws_rds_cluster" "main" {
  cluster_identifier     = "${local.name_prefix}-pg"
  engine                 = "aurora-postgresql"
  engine_version         = "16.4"
  database_name          = var.db_name
  master_username        = var.db_username
  master_password        = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  skip_final_snapshot          = var.environment != "production"
  storage_encrypted            = true
  deletion_protection          = var.environment == "production"
  backup_retention_period      = 30
  preferred_backup_window      = "03:00-04:00"
  copy_tags_to_snapshot        = true

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 4
  }

  tags = { Name = "${local.name_prefix}-pg" }
}

resource "aws_rds_cluster_instance" "main" {
  identifier           = "${local.name_prefix}-pg-1"
  cluster_identifier   = aws_rds_cluster.main.id
  instance_class       = "db.serverless"
  engine               = aws_rds_cluster.main.engine
  engine_version       = aws_rds_cluster.main.engine_version
  publicly_accessible  = false
}
