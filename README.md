# Fullstack NestJS Template

基于 NestJS 后端和 React 前端的现代化全栈应用模板。

## 技术栈

### 后端
- **NestJS** - 渐进式 Node.js 框架
- **TypeScript** - 类型安全的 JavaScript
- **Drizzle ORM** - 轻量级 TypeScript ORM

### 前端
- **React 19** - UI 库
- **Rspack** - 快速打包工具
- **Tailwind CSS 4** - 实用优先的 CSS 框架

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build:prod

# 生产运行
npm start
```

## GitHub Actions CI/CD

本项目使用 GitHub Actions 进行持续集成和部署。

### 环境变量配置

在推送代码到 GitHub 之前，需要在仓库设置中配置以下 Secrets：

| Secret 名称 | 说明 |
|------------|------|
| `DOCKERHUB_USERNAME` | Docker Hub 用户名 |
| `DOCKERHUB_TOKEN` | Docker Hub 访问令牌 |

### Docker Hub Token 获取步骤

1. 访问 https://hub.docker.com/settings/security
2. 创建 Access Token
3. 将令牌添加到 GitHub Secrets 中

## 部署

### Docker 部署

```bash
# 构建并启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止容器
docker-compose down
```

### 手动部署到服务器

```bash
# 克隆仓库
git clone https://github.com/GCE20250623/tes.git
cd tes

# 安装依赖
npm install

# 构建
npm run build:prod

# 运行
npm start
```

## 许可证

私有项目 - 版权所有
