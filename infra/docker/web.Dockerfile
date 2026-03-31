FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ENV NEXT_PUBLIC_API_URL=/api/v1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Patch server.js to always listen on 0.0.0.0 regardless of HOSTNAME env
RUN sed -i 's/hostname: hostname/hostname: "0.0.0.0"/' server.js || true
RUN sed -i "s/process.env.HOSTNAME/\"0.0.0.0\"/g" server.js || true

EXPOSE 3000
CMD ["node", "server.js"]
