using OpenCvSharp;
using Tesseract;

namespace ImageProcessing.Services;

public class OcrService
{
    public class OcrResult
    {
        public string Text { get; set; } = "";
        public int Confidence { get; set; }
        public List<TextBlock> Blocks { get; set; } = new();
        public string ProcessedImageBase64 { get; set; } = "";
        public string ImageInfo { get; set; } = "";
        public bool IsSuccess { get; set; }
        public string Error { get; set; } = "";
    }

    public class TextBlock
    {
        public int Index { get; set; }
        public string Text { get; set; } = "";
        public int X { get; set; }
        public int Y { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
        public int Confidence { get; set; }
    }

    public class OcrSettings
    {
        public string Language { get; set; } = "eng+chi_sim";
        public bool EnhanceContrast { get; set; } = true;
        public bool RemoveNoise { get; set; } = true;
        public int ThresholdBlockSize { get; set; } = 11;
        public int ThresholdC { get; set; } = 2;
    }

    public OcrResult RecognizeText(byte[] imageData, OcrSettings? settings = null)
    {
        var result = new OcrResult();
        settings ??= new OcrSettings();

        try
        {
            // 获取图片信息
            using var mat = Cv2.ImDecode(imageData, ImreadModes.Color);
            if (mat.Empty())
            {
                result.Error = "无法解码图片，请确认图片格式正确";
                return result;
            }
            result.ImageInfo = $"分辨率: {mat.Width} x {mat.Height} | 通道: {mat.Channels()}";

            // 预处理
            using var processed = PreprocessImage(mat, settings);
            var processedBytes = processed.ToBytes(".png");
            result.ProcessedImageBase64 = Convert.ToBase64String(processedBytes);

            // OCR识别
            using var engine = new TesseractEngine(@"./tessdata", settings.Language, EngineMode.Default);
            using var img = Pix.LoadFromMemory(processedBytes);
            using var page = engine.Process(img);

            result.Text = page.GetText();
            result.Confidence = (int)(page.GetMeanConfidence() * 100);
            result.IsSuccess = true;

            // 提取文本块信息
            using var pageIterator = page.Iterator();
            pageIterator.Begin();

            int blockIndex = 0;
            do
            {
                if (pageIterator.TryGetBoundingBox(PageIteratorLevel.Block, out var rect))
                {
                    var blockText = pageIterator.GetText(PageIteratorLevel.Block)?.Trim() ?? "";
                    if (!string.IsNullOrWhiteSpace(blockText))
                    {
                        result.Blocks.Add(new TextBlock
                        {
                            Index = blockIndex++,
                            Text = blockText,
                            X = rect.X,
                            Y = rect.Y,
                            Width = rect.Width,
                            Height = rect.Height,
                            Confidence = (int)(pageIterator.GetConfidence(PageIteratorLevel.Block) * 100)
                        });
                    }
                }
            } while (pageIterator.Next(PageIteratorLevel.Block));
        }
        catch (Exception ex)
        {
            result.Error = $"OCR识别失败: {ex.Message}";
        }

        return result;
    }

    public OcrResult RecognizeMultipleImages(List<byte[]> imagesData, OcrSettings? settings = null)
    {
        var combinedResult = new OcrResult();
        var allTexts = new List<string>();

        try
        {
            settings ??= new OcrSettings();

            for (int i = 0; i < imagesData.Count; i++)
            {
                var singleResult = RecognizeText(imagesData[i], settings);
                
                if (!string.IsNullOrWhiteSpace(singleResult.Text))
                {
                    var formattedText = $"=== 图片 {i + 1} ===\n{singleResult.Text}";
                    allTexts.Add(formattedText);

                    // 合并文本块
                    foreach (var block in singleResult.Blocks)
                    {
                        block.Index = combinedResult.Blocks.Count;
                        combinedResult.Blocks.Add(block);
                    }
                }

                // 更新置信度
                if (combinedResult.Confidence == 0)
                    combinedResult.Confidence = singleResult.Confidence;
                else
                    combinedResult.Confidence = (combinedResult.Confidence + singleResult.Confidence) / 2;

                if (!string.IsNullOrEmpty(singleResult.ImageInfo))
                    combinedResult.ImageInfo += $"\n图片{i + 1}: {singleResult.ImageInfo}";
            }

            combinedResult.Text = string.Join("\n\n", allTexts);
            combinedResult.IsSuccess = true;
        }
        catch (Exception ex)
        {
            combinedResult.Error = $"多图片识别失败: {ex.Message}";
        }

        return combinedResult;
    }

    public OcrResult RecognizeFromFile(string filePath, OcrSettings? settings = null)
    {
        if (!File.Exists(filePath))
        {
            return new OcrResult { Error = "文件不存在" };
        }

        var imageData = File.ReadAllBytes(filePath);
        return RecognizeText(imageData, settings);
    }

    private Mat PreprocessImage(Mat input, OcrSettings settings)
    {
        // 转换为灰度
        using var gray = new Mat();
        if (input.Channels() == 3)
            Cv2.CvtColor(input, gray, ColorConversionCodes.BGR2GRAY);
        else
            gray = input.Clone();

        Mat output;

        // 去噪
        if (settings.RemoveNoise)
        {
            using var denoised = new Mat();
            Cv2.FastNlMeansDenoising(gray, denoised, 10);
            output = denoised;
        }
        else
        {
            output = gray.Clone();
        }

        // 对比度增强
        if (settings.EnhanceContrast)
        {
            using var enhanced = new Mat();
            output.ConvertTo(enhanced, -1, 1.2, 0); // 增加对比度
            output = enhanced;
        }

        // 自适应阈值
        using var thresholded = new Mat();
        Cv2.AdaptiveThreshold(
            output,
            thresholded,
            255,
            AdaptiveThresholdTypes.GaussC,
            ThresholdTypes.Binary,
            settings.ThresholdBlockSize,
            settings.ThresholdC
        );

        return thresholded;
    }

    public string GetImageInfo(byte[] imageData)
    {
        try
        {
            using var mat = Cv2.ImDecode(imageData, ImreadModes.Color);
            if (mat.Empty())
                return "无法解码图片";

            return $"分辨率: {mat.Width} x {mat.Height} 像素 | 通道数: {mat.Channels()}";
        }
        catch (Exception ex)
        {
            return $"获取图片信息失败: {ex.Message}";
        }
    }

    public byte[]? ConvertToGrayscale(byte[] imageData)
    {
        try
        {
            using var mat = Cv2.ImDecode(imageData, ImreadModes.Color);
            if (mat.Empty()) return null;

            using var gray = new Mat();
            Cv2.CvtColor(mat, gray, ColorConversionCodes.BGR2GRAY);

            return gray.ToBytes(".png");
        }
        catch
        {
            return null;
        }
    }
}
