# ImageProcessing.Tests

图像处理平台的单元测试项目

## 📦 包含内容

### 测试数据 (`test-images/`)

| 文件 | 说明 | 预期用途 |
|------|------|----------|
| `blob_red_circles.png` | 5个红色圆点 | 斑点检测基础测试 |
| `blob_multi_color.png` | 6个多颜色斑点 | 颜色统计测试 |
| `blob_small_noisy.png` | 20个小斑点噪声图 | 噪声过滤测试 |
| `blob_large_uniform.png` | 3个大型斑点 | 面积阈值测试 |
| `test-data.json` | 测试数据配置 | 测试说明 |

### 测试用例

| 测试类 | 测试方法 | 说明 |
|--------|----------|------|
| `BlobDetectionServiceTests` | `DetectBlobs_WithValidSettings_ReturnsResult` | 有效参数检测 |
| `BlobDetectionServiceTests` | `DetectBlobs_WithHighThreshold_ReturnsEmpty` | 高阈值返回空 |
| `BlobDetectionServiceTests` | `GetImageInfo_WithValidImage_ReturnsInfo` | 图片信息获取 |
| `OcrServiceTests` | `RecognizeText_WithValidSettings_ReturnsResult` | OCR有效识别 |
| `OcrServiceTests` | `RecognizeMultipleImages_WithValidImages_ReturnsCombinedResult` | 多图合并 |
| `OcrServiceTests` | `ConvertToGrayscale_WithValidImage_ReturnsGrayImage` | 灰度转换 |

## 🚀 运行测试

```bash
cd ImageProcessing.Tests
dotnet restore
dotnet test
```

## 🔧 前置要求

- .NET 8 SDK
- OpenCvSharp 4.9
- Tesseract 5.2

## 📁 目录结构

```
ImageProcessing.Tests/
├── ImageProcessing.Tests.csproj
├── BlobDetectionServiceTests.cs
├── OcrServiceTests.cs
└── test-images/
    ├── README.md
    ├── generate_images.py
    ├── blob_red_circles.png
    ├── blob_multi_color.png
    ├── blob_small_noisy.png
    └── blob_large_uniform.png
```

## 🎯 测试数据生成

使用 Python + OpenCV 生成测试图片：

```bash
python test-images/generate_images.py
```

或使用 PowerShell（需要 OpenCvSharp）：

```powershell
.\test-images\Generate-TestImages.ps1
```
