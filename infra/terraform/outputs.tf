output "vpc_id" {
  value = aws_vpc.main.id
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "api_ecr_url" {
  value = aws_ecr_repository.api.repository_url
}

output "worker_ecr_url" {
  value = aws_ecr_repository.worker.repository_url
}

output "web_ecr_url" {
  value = aws_ecr_repository.web.repository_url
}

output "rds_endpoint" {
  value = aws_rds_cluster.main.endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "s3_bucket" {
  value = aws_s3_bucket.data.id
}

output "ecs_cluster" {
  value = aws_ecs_cluster.main.name
}
