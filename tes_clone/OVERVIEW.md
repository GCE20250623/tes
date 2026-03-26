# 项目总览 | Project Overview

[![CI/CD](https://github.com/GCE20250623/tes/actions/workflows/deploy.yml/badge.svg)](https://github.com/GCE20250623/tes/actions)

## 📦 项目简介

这是一个现代化全栈应用模板集，包含多个功能模块，可快速启动开发。

---

## 🗂️ 项目结构

```
tes/
├── server/                    # NestJS 后端服务
│   ├── src/                  # 源代码
│   └── modules/
│       └── test-log/        # 测试日志分析模块
│
├── client/                   # React 前端应用
│   └── src/
│       └── pages/
│           └── TestLogPage/ # 测试日志分析页面
│
├── ImageProcessing/          # C# Blazor 图像处理平台
│   ├── Pages/               # 页面组件
│   ├── Services/            # 业务服务
│   └── Program.cs           # 程序入口
│
├── .github/
│   └── workflows/          # CI/CD 配置
│
├── docker-compose.yml       # Docker 编排
└── README.md               # 主应用说明
```

---

## 🚀 快速开始

### 环境要求

| 依赖 | 版本要求 |
|------|----------|
| Node.js | ≥ 18.0 |
| npm | ≥ 9.0 |
| .NET SDK | ≥ 8.0 |
| Docker | ≥ 24.0 |

### 1. 主应用 (NestJS + React)

```bash
# 克隆仓库
git clone https://github.com/GCE20250623/tes.git
cd tes

# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build:prod

# 生产运行
npm start
```

**访问地址：** http://localhost:3000

### 2. 图像处理平台 (.NET Blazor)

```bash
# 进入目录
cd ImageProcessing

# 还原依赖
dotnet restore

# 运行
dotnet run
```

**访问地址：** http://localhost:5000

---

## 📚 子项目详情

### 1. 测试日志分析平台 🧪

**技术栈：** React 19 + NestJS + Drizzle ORM

**功能特性：**
- ✅ 上传日志文件分析 (.log, .txt, .xlsx, .csv)
- ✅ 本地文件路径分析
- ✅ 自动计算通过率、失败数
- ✅ 高亮显示失败用例
- ✅ 导出结果为 CSV

**API 端点：**
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/test-log/upload` | 上传文件分析 |
| POST | `/api/test-log/analyze` | 路径分析 |
| GET | `/api/test-log/export` | 导出 CSV |

---

### 2. 图像处理测试平台 🖼️

**技术栈：** C# Blazor + OpenCvSharp 4.9 + Tesseract 5.2

#### 2.1 斑点检测 (Blob Detection)

**功能：**
- 使用 OpenCvSharp 检测图像中的斑点
- 统计不同颜色的斑点数量
- 可调节检测参数（阈值、面积）
- 实时预览检测结果

**参数说明：**
| 参数 | 说明 | 默认值 |
|------|------|--------|
| MinThreshold | 最小阈值 | 50 |
| MaxThreshold | 最大阈值 | 255 |
| MinArea | 最小面积 | 10 |
| MaxArea | 最大面积 | 1000 |

#### 2.2 文字识别 (OCR)

**功能：**
- 使用 Tesseract 进行文字识别
- 支持多张图片合并识别
- 中英文混合识别
- 结果可复制和编辑

**支持语言：**
| 语言代码 | 说明 |
|----------|------|
| `eng` | 英语 |
| `chi_sim` | 简体中文 |
| `eng+chi_sim` | 英语+简体中文 |

---

### 3. Docker 部署 🐳

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

## ⚙️ CI/CD 配置

本项目使用 GitHub Actions 进行持续集成和部署。

### 所需 Secrets

在 GitHub 仓库设置中添加以下 Secrets：

| Secret 名称 | 说明 |
|------------|------|
| `DOCKERHUB_USERNAME` | Docker Hub 用户名 |
| `DOCKERHUB_TOKEN` | Docker Hub 访问令牌 |

**获取 Token：**
1. 访问 https://hub.docker.com/settings/security
2. 创建 Access Token
3. 复制并添加到 GitHub Secrets

### 工作流说明

| 文件 | 说明 |
|------|------|
| `ci.yml` | 持续集成测试 |
| `deploy.yml` | 自动构建和部署 |

---

## 📂 各模块独立运行

### 测试日志分析

```bash
cd server
npm install
npm run start:dev
```

前端开发服务器：
```bash
cd client
npm install
npm run dev
```

### 图像处理

```bash
cd ImageProcessing
dotnet restore
dotnet run
```

---

## 📄 许可证

私有项目 - 版权所有 © 2026

---

## 🔗 相关链接

- [GitHub 仓库](https://github.com/GCE20250623/tes)
- [Docker Hub](https://hub.docker.com/)
- [NestJS 文档](https://docs.nestjs.com/)
- [Blazor 文档](https://docs.microsoft.com/aspnet/core/blazor/)
- [OpenCvSharp](https://github.com/shimat/opencvsharp)
- [Tesseract](https://github.com/tesseract-ocr/tesseract)
