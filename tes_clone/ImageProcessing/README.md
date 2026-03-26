# ImageProcessing - 图像处理测试平台

基于 **Blazor** + **OpenCvSharp 4.9** + **Tesseract 5.2** 的图像处理工具集。

## 🎯 功能特性

### 1. 斑点检测 (Blob Detection)

使用 OpenCvSharp 进行图像斑点分析：

- ✅ 检测图像中的斑点数量
- ✅ 统计不同颜色的斑点个数
- ✅ 可调节检测参数（阈值、面积、圆度）
- ✅ 实时预览检测结果
- ✅ 详细的斑点信息（位置、尺寸、面积、圆度）

**参数说明：**
| 参数 | 说明 | 默认值 |
|------|------|--------|
| MinThreshold | 最小阈值 | 50 |
| MaxThreshold | 最大阈值 | 255 |
| MinArea | 最小面积 | 10 |
| MaxArea | 最大面积 | 10000 |
| FilterByCircularity | 最小圆度 (0=不过滤) | 0 |

### 2. 文字识别 (OCR)

使用 Tesseract 进行文字识别：

- ✅ 支持多张图片合并识别
- ✅ 多种语言支持（中文、英文、日文、韩文）
- ✅ 图像预处理（去噪、增强对比度）
- ✅ 可调节识别参数
- ✅ 结果可复制和编辑
- ✅ 显示识别置信度和文本块位置

**支持语言：**
| 语言代码 | 说明 |
|----------|------|
| `eng` | 英语 |
| `chi_sim` | 简体中文 |
| `eng+chi_sim` | 英语+简体中文 |
| `jpn` | 日语 |
| `kor` | 韩语 |

## 🚀 快速开始

### 环境要求

- .NET 8 SDK
- Windows 操作系统（当前版本）

### 安装和运行

```bash
# 进入目录
cd ImageProcessing

# 还原依赖包
dotnet restore

# 运行项目
dotnet run
```

访问 http://localhost:5000

### 构建发布

```bash
# Release 构建
dotnet build -c Release

# 自包含发布
dotnet publish -c Release -r win-x64 --self-contained -o ./publish
```

## 📁 项目结构

```
ImageProcessing/
├── Program.cs                      # 程序入口
├── App.razor                       # 根组件
├── MainLayout.razor                # 主布局
├── ImageProcessing.csproj          # 项目文件
├── Pages/
│   ├── Index.razor                 # 首页
│   ├── BlobDetection.razor        # 斑点检测页面
│   └── OcrPage.razor              # OCR识别页面
└── Services/
    ├── BlobDetectionService.cs     # 斑点检测服务
    └── OcrService.cs              # OCR识别服务
```

## 🔧 技术栈

| 组件 | 技术 |
|------|------|
| 框架 | Blazor Server (.NET 8) |
| 计算机视觉 | OpenCvSharp 4.9 |
| OCR 引擎 | Tesseract 5.2 |
| UI | Bootstrap 5 + 自定义 CSS |

## 📝 使用说明

### 斑点检测

1. 上传待检测的图片
2. 调整检测参数
3. 点击「开始检测」
4. 查看检测结果和统计

### 文字识别

1. 上传单张或多张图片
2. 选择识别语言
3. 点击「识别首张图片」或「合并所有图片识别」
4. 查看和编辑识别结果
5. 点击「复制」按钮复制文字

## ⚠️ 注意事项

- OCR 功能需要 Tesseract 训练数据文件（tessdata 目录）
- 图片大小限制：10MB
- 支持的图片格式：PNG、JPG、BMP、GIF

## 📄 许可证

私有项目 - 版权所有
