# Fullstack NestJS Template

A modern fullstack application built with NestJS backend and React frontend.

## Tech Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe JavaScript
- **Drizzle ORM** - Lightweight TypeScript ORM

### Frontend
- **React 19** - UI library
- **Rspack** - Fast bundler
- **Tailwind CSS 4** - Utility-first CSS

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build for production
npm run build:prod

# Start production
npm start
```

## GitHub Actions

This project uses GitHub Actions for CI/CD.

### Environment Variables

Before pushing to GitHub, configure these secrets in your repository settings:

| Secret Name | Description |
|------------|-------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |

### Docker Hub Token

1. Go to https://hub.docker.com/settings/security
2. Create an Access Token
3. Add the token as `DOCKERHUB_TOKEN` in GitHub secrets

### Manual Deployment

To push this project to GitHub manually:

```bash
cd D:\app_4jn4zcb2qc7xy
git remote add origin https://github.com/GCE20250623/fullstack-nestjs-template.git
git push -u origin master
```

## License

Private - All rights reserved
