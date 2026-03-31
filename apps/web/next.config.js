/** @type {import('next').NextConfig} */
const nextConfig = {
  skipTrailingSlashRedirect: true,
  output: 'standalone',  // Optimized for Docker/ECS deployment
}

module.exports = nextConfig
