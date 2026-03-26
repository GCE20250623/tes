# Deployment Guide

## Docker Deployment

### Prerequisites

- Docker >= 20.10
- Docker Compose >= 2.0

### Quick Start

```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### Environment Configuration

Create a `.env` file:

```env
# Application
SERVER_PORT=3000
SERVER_HOST=0.0.0.0
SUDA_DATABASE_URL=postgresql://user:password@db:5432/mydb

# Client Configuration
CLIENT_DEV_PORT=8080

# Logger
LOG_REQUEST_BODY=true
LOG_RESPONSE_BODY=true
```

## Docker Configuration

### Dockerfile

The project includes a multi-stage Dockerfile:

```dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:prod

# Production stage
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client
EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose

Basic `docker-compose.yml`:

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - SERVER_PORT=3000
      - SUDA_DATABASE_URL=postgresql://user:password@db:5432/mydb
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

## Production Build

### Build Steps

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Build for production**
   ```bash
   npm run build:prod
   ```

4. **Start the server**
   ```bash
   npm start
   ```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure database connection
- [ ] Set secure API keys/secrets
- [ ] Enable request/response logging (optional)
- [ ] Set up SSL/TLS termination
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging

## Server Requirements

### Minimum
- 1 CPU
- 1 GB RAM
- 10 GB disk space

### Recommended
- 2+ CPUs
- 2+ GB RAM
- 20+ GB SSD

## Reverse Proxy (Optional)

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Health Check

Check if the application is healthy:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Troubleshooting

### Application won't start

1. Check logs: `docker-compose logs -f app`
2. Verify environment variables are set correctly
3. Check database connectivity

### Build fails

1. Ensure Node.js version >= 22.0.0
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Clear Docker cache: `docker-compose build --no-cache`

### Database connection issues

1. Verify database is running
2. Check connection string format
3. Ensure database is accessible from container

## Scaling

For horizontal scaling, use a process manager like PM2:

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/main.js --name app

# Scale
pm2 scale app +2
```

## CI/CD

Example GitHub Actions workflow:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run build:prod
      - run: docker-compose up -d
```
