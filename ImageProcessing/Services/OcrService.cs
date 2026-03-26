/**
 * OCR文字识别服务 (Optical Character Recognition Service)
 * 
 * 功能说明：
 * - 使用 Tesseract OCR 引擎进行文字识别
 * - 支持多种语言（中文、英文、日文、韩文等）
 * - 图像预处理提高识别准确率
 * - 多图片合并识别
 * 
 * 依赖：
 * - OpenCvSharp4 (图像预处理)
 * - Tesseract 5.2 (OCR引擎)
 * - tessdata (语言训练数据文件)
 */

using OpenCvSharp;
using Tesseract;

namespace ImageProcessing.Services
{
    /// <summary>
    /// OCR识别服务类
    /// 提供图片文字识别、多语言支持、图像预处理等功能
    /// </summary>
    public class OcrService
    {
        #region 内部类定义

        /// <summary>
        /// OCR识别结果
        /// </summary>
        public class OcrResult
        {
            /// <summary>识别是否成功</summary>
            public bool IsSuccess { get; set; }
            
            /// <summary>识别的文字内容</summary>
            public string Text { get; set; } = "";
            
            /// <summary>识别置信度 (0-100)</summary>
            public int Confidence { get; set; }
            
            /// <summary>识别到的文本块列表</summary>
            public List<TextBlock> Blocks { get; set; } = new();
            
            /// <summary>预处理后的图片（Base64编码）</summary>
            public string ProcessedImageBase64 { get; set; } = "";
            
            /// <summary>原始图片信息</summary>
            public string ImageInfo { get; set; } = "";
            
            /// <summary>错误信息（如果识别失败）</summary>
            public string Error { get; set; } = "";
        }

        /// <summary>
        /// 单个文本块的信息
        /// </summary>
        public class TextBlock
        {
            /// <summary>文本块的序号</summary>
            public int Index { get; set; }
            
            /// <summary>文本内容</summary>
            public string Text { get; set; } = "";
            
            /// <summary>文本块左上角X坐标</summary>
            public int X { get; set; }
            
            /// <summary>文本块左上角Y坐标</summary>
            public int Y { get; set; }
            
            /// <summary>文本块的宽度</summary>
            public int Width { get; set; }
            
            /// <summary>文本块的高度</summary>
            public int Height { get; set; }
            
            /// <summary>该文本块的识别置信度</summary>
            public int Confidence { get; set; }
        }

        /// <summary>
        /// OCR识别配置参数
        /// </summary>
        public class OcrSettings
        {
            /// <summary>识别语言代码，默认eng+chi_sim（英文+简体中文）</summary>
            /// <remarks>
            /// 支持的语言代码：
            /// - eng: 英语
            /// - chi_sim: 简体中文
            /// - chi_tra: 繁体中文
            /// - jpn: 日语
            /// - kor: 韩语
            /// - eng+chi_sim: 混合中英文
            /// </remarks>
            public string Language { get; set; } = "eng+chi_sim";
            
            /// <summary>是否增强对比度，默认true</summary>
            public bool EnhanceContrast { get; set; } = true;
            
            /// <summary>是否去噪处理，默认true</summary>
            public bool RemoveNoise { get; set; } = true;
            
            /// <summary>自适应阈值的块大小（必须为奇数），默认11</summary>
            public int ThresholdBlockSize { get; set; } = 11;
            
            /// <summary>自适应阈权的C值，默认2</summary>
            public int ThresholdC { get; set; } = 2;
        }

        #endregion

        #region 主要方法

        /// <summary>
        /// 识别单张图片中的文字
        /// </summary>
        /// <param name="imageData">图片的字节数组</param>
        /// <param name="settings">识别配置（可选，使用默认配置）</param>
        /// <returns>OcrResult 包含识别结果</returns>
        public OcrResult RecognizeText(byte[] imageData, OcrSettings? settings = null)
        {
            settings ??= new OcrSettings();
            var result = new OcrResult();

            try
            {
                // 步骤1: 解码图片并获取基本信息
                using var mat = Cv2.ImDecode(imageData, ImreadModes.Color);
                if (mat.Empty())
                {
                    result.Error = "无法解码图片，请确认图片格式正确";
                    return result;
                }
                result.ImageInfo = $"分辨率: {mat.Width} x {mat.Height} | 通道: {mat.Channels()}";

                // 步骤2: 图像预处理
                // 预处理对于OCR识别准确率至关重要
                using var processed = PreprocessImage(mat, settings);
                
                // 转换为PNG格式用于Tesseract
                var processedBytes = processed.ToBytes(".png");
                result.ProcessedImageBase64 = Convert.ToBase64String(processedBytes);

                // 步骤3: 初始化Tesseract引擎
                // tessdata目录需要存在且包含对应语言的训练数据
                using var engine = new TesseractEngine(@"./tessdata", settings.Language, EngineMode.Default);
                
                // 步骤4: 从内存加载图片并识别
                using var img = Pix.LoadFromMemory(processedBytes);
                using var page = engine.Process(img);

                // 步骤5: 提取识别结果
                result.Text = page.GetText();
                result.Confidence = (int)(page.GetMeanConfidence() * 100);
                result.IsSuccess = true;

                // 步骤6: 提取文本块的位置信息
                using var pageIterator = page.Iterator();
                pageIterator.Begin();

                int blockIndex = 0;
                do
                {
                    // 获取文本块级别的边界框
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

        /// <summary>
        /// 识别多张图片中的文字并合并结果
        /// 适用于扫描多页文档
        /// </summary>
        /// <param name="imagesData">多个图片的字节数组列表</param>
        /// <param name="settings">识别配置</param>
        /// <returns>合并后的识别结果</returns>
        public OcrResult RecognizeMultipleImages(List<byte[]> imagesData, OcrSettings? settings = null)
        {
            var combinedResult = new OcrResult();
            var allTexts = new List<string>();

            try
            {
                settings ??= new OcrSettings();

                // 逐个处理每张图片
                for (int i = 0; i < imagesData.Count; i++)
                {
                    var singleResult = RecognizeText(imagesData[i], settings);
                    
                    if (!string.IsNullOrWhiteSpace(singleResult.Text))
                    {
                        // 为每张图片的结果添加标记
                        var formattedText = $"=== 图片 {i + 1} ===\n{singleResult.Text}";
                        allTexts.Add(formattedText);

                        // 合并文本块（更新索引）
                        foreach (var block in singleResult.Blocks)
                        {
                            block.Index = combinedResult.Blocks.Count;
                            combinedResult.Blocks.Add(block);
                        }
                    }

                    // 更新平均置信度
                    if (combinedResult.Confidence == 0)
                        combinedResult.Confidence = singleResult.Confidence;
                    else
                        combinedResult.Confidence = (combinedResult.Confidence + singleResult.Confidence) / 2;

                    if (!string.IsNullOrEmpty(singleResult.ImageInfo))
                        combinedResult.ImageInfo += $"\n图片{i + 1}: {singleResult.ImageInfo}";
                }

                // 使用双换行合并所有文本
                combinedResult.Text = string.Join("\n\n", allTexts);
                combinedResult.IsSuccess = true;
            }
            catch (Exception ex)
            {
                combinedResult.Error = $"多图片识别失败: {ex.Message}";
            }

            return combinedResult;
        }

        /// <summary>
        /// 从文件路径识别图片文字
        /// </summary>
        /// <param name="filePath">图片文件的完整路径</param>
        /// <param name="settings">识别配置</param>
        /// <returns>识别结果</returns>
        public OcrResult RecognizeFromFile(string filePath, OcrSettings? settings = null)
        {
            if (!File.Exists(filePath))
            {
                return new OcrResult { Error = $"文件不存在: {filePath}" };
            }

            var imageData = File.ReadAllBytes(filePath);
            return RecognizeText(imageData, settings);
        }

        #endregion

        #region 图像预处理方法

        /// <summary>
        /// 图像预处理 - 提高OCR识别准确率
        /// 处理流程：灰度化 -> 去噪 -> 对比度增强 -> 自适应阈值
        /// </summary>
        /// <param name="input">输入的彩色图片矩阵</param>
        /// <param name="settings">预处理配置参数</param>
        /// <returns>处理后的二值化图片矩阵</returns>
        private Mat PreprocessImage(Mat input, OcrSettings settings)
        {
            // 步骤1: 转换为灰度图
            // OCR通常在灰度图上效果更好
            using var gray = new Mat();
            if (input.Channels() == 3)
                Cv2.CvtColor(input, gray, ColorConversionCodes.BGR2GRAY);
            else
                gray = input.Clone();

            Mat output;

            // 步骤2: 去噪处理
            // 使用FastNlMeansDenoising算法，对文字图像效果较好
            if (settings.RemoveNoise)
            {
                using var denoised = new Mat();
                // 参数10是高斯滤波的强度
                Cv2.FastNlMeansDenoising(gray, denoised, 10);
                output = denoised;
            }
            else
            {
                output = gray.Clone();
            }

            // 步骤3: 对比度增强
            // 使用线性变换增强对比度
            if (settings.EnhanceContrast)
            {
                using var enhanced = new Mat();
                // convertTo参数: alpha=对比度倍数, beta=亮度增量
                output.ConvertTo(enhanced, -1, 1.2, 0); // 对比度增加20%
                output = enhanced;
            }

            // 步骤4: 自适应阈值
            // 对于背景不均匀或光照不均的图片效果很好
            using var thresholded = new Mat();
            Cv2.AdaptiveThreshold(
                output,                          // 输入图像
                thresholded,                     // 输出图像
                255,                             // 最大值
                AdaptiveThresholdTypes.GaussC,   // 自适应方法（高斯）
                ThresholdTypes.Binary,            // 阈值类型（二值化）
                settings.ThresholdBlockSize,     // 块大小（必须是奇数）
                settings.ThresholdC              // C值（从平均值减去的值）
            );

            return thresholded;
        }

        #endregion

        #region 辅助方法

        /// <summary>
        /// 获取图片的基本信息
        /// </summary>
        /// <param name="imageData">图片字节数组</param>
        /// <returns>图片信息字符串</returns>
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

        /// <summary>
        /// 将彩色图片转换为灰度图片
        /// </summary>
        /// <param name="imageData">原始彩色图片数据</param>
        /// <returns>灰度图片数据（PNG格式），转换失败返回null</returns>
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

        #endregion
    }
}
