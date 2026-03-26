# 图像处理测试平台 (Image Processing Test Platform)

基于 C# Blazor 和 OpenCvSharp + Tesseract 的图像处理调试工具。

## 功能特性

### 1. 斑点检测 (Blob Detection)
- 使用 OpenCvSharp 进行斑点识别
- 检测图像中的斑点数量
- 统计不同颜色的斑点个数
- 可调节检测参数（阈值、面积等）
- 实时预览检测结果

### 2. 文字识别 (OCR)
- 使用 Tesseract 进行图片文字识别
- 支持多张图片合并识别
- 支持多种语言（中文、英文、日文等）
- 结果可复制和编辑
- 图像预处理提高识别准确率

## 技术栈

- **.NET 8** - 运行时
- **Blazor** - Web UI 框架
- **OpenCvSharp 4.9** - 计算机视觉库
- **Tesseract 5.2** - OCR 文字识别

## 快速开始

### 前置要求
- .NET 8 SDK
- Windows 操作系统

### 安装依赖
```bash
cd ImageProcessing
dotnet restore
```

### 运行项目
```bash
cd ImageProcessing
dotnet run
```

访问 http://localhost:5000

### 构建发布
```bash
cd ImageProcessing
dotnet publish -c Release -r win-x64 --self-contained -o publish
```

## 项目结构

```
ImageProcessing/
├── Program.cs                 # 程序入口
├── App.razor                  # 根组件
├── _Imports.razor             # 引用声明
├── Services/
│   ├── BlobDetectionService.cs  # 斑点检测服务
│   └── OcrService.cs            # OCR识别服务
├── Pages/
│   ├── Index.razor              # 首页
│   ├── BlobDetection.razor      # 斑点检测页面
│   └── OcrPage.razor            # OCR识别页面
└── ImageProcessing.csproj      # 项目文件
```

## 使用说明

### 斑点检测
1. 上传待检测的图片
2. 调整检测参数（阈值、面积范围）
3. 点击"开始检测"
4. 查看检测结果：斑点总数、颜色统计
5. 查看带标注的结果图片

### 文字识别
1. 上传单张或多张图片
2. 选择识别语言
3. 点击"开始识别"或"合并所有图片识别"
4. 查看和编辑识别结果
5. 复制识别文字

## OCR 语言支持

| 语言代码 | 说明 |
|---------|------|
| eng | 英语 |
| chi_sim | 简体中文 |
| eng+chi_sim | 英语+简体中文 |
| jpn | 日语 |

## 许可证

私有项目 - 版权所有
