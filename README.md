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

## 项目模块

| 模块 | 路径 | 说明 |
|------|------|------|
| **主应用** | `/` | 全栈应用入口 |
| **测试日志分析** | `/test-log` | 测试日志分析和可视化 |
| **下载工具** | `DownloadTools/` | C# 多线程下载工具 |

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

## 测试日志分析平台

支持解析和可视化测试日志文件（.log, .txt, .xlsx, .csv）

### 功能
- 上传日志文件分析
- 本地文件路径分析
- 通过率/失败率统计
- 导出CSV报告

## 下载工具

C# .NET 8 多线程下载工具

### 功能
- 磁力链接解析
- 种子文件解析
- 多线程HTTP下载
- 批量下载

### 运行
```bash
cd DownloadTools
dotnet run
# 或运行编译好的exe
./publish/DownloadTools.exe
```

## GitHub Actions CI/CD

本项目使用 GitHub Actions 进行持续集成和部署。

### 环境变量配置

在推送代码到 GitHub 之前，需要在仓库设置中配置以下 Secrets：

| Secret 名称 | 说明 |
|------------|------|
| `DOCKERHUB_USERNAME` | Docker Hub 用户名 |
| `DOCKERHUB_TOKEN` | Docker Hub 访问令牌 |

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

## 许可证

私有项目 - 版权所有
