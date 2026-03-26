/**
 * 斑点检测服务 (Blob Detection Service)
 * 
 * 功能说明：
 * - 使用 OpenCvSharp 进行图像斑点检测
 * - 支持多种参数配置（阈值、面积、圆度）
 * - 颜色识别和统计
 * - 轮廓检测算法
 * 
 * 依赖：
 * - OpenCvSharp4
 * - OpenCvSharp4.runtime.win
 */

using OpenCvSharp;

namespace ImageProcessing.Services
{
    /// <summary>
    /// 斑点检测服务类
    /// 提供图像中斑点的检测、统计和颜色分析功能
    /// </summary>
    public class BlobDetectionService
    {
        #region 内部类定义

        /// <summary>
        /// 斑点检测结果
        /// </summary>
        public class BlobResult
        {
            /// <summary>检测是否成功</summary>
            public bool IsSuccess { get; set; }
            
            /// <summary>检测到的斑点总数</summary>
            public int TotalCount { get; set; }
            
            /// <summary>各颜色的斑点数量统计 (颜色名 -> 数量)</summary>
            public Dictionary<string, int> ColorCounts { get; set; } = new();
            
            /// <summary>所有斑点的详细信息列表</summary>
            public List<BlobInfo> Blobs { get; set; } = new();
            
            /// <summary>处理后的图片（Base64编码）</summary>
            public string ProcessedImageBase64 { get; set; } = "";
            
            /// <summary>原始图片信息（分辨率、通道数等）</summary>
            public string ImageInfo { get; set; } = "";
            
            /// <summary>错误信息（如果检测失败）</summary>
            public string Error { get; set; } = "";
        }

        /// <summary>
        /// 单个斑点的详细信息
        /// </summary>
        public class BlobInfo
        {
            /// <summary>斑点的中心X坐标</summary>
            public int X { get; set; }
            
            /// <summary>斑点的中心Y坐标</summary>
            public int Y { get; set; }
            
            /// <summary>斑点的宽度</summary>
            public int Width { get; set; }
            
            /// <summary>斑点的高度</summary>
            public int Height { get; set; }
            
            /// <summary>斑点的颜色名称</summary>
            public string Color { get; set; } = "";
            
            /// <summary>斑点的面积（像素数）</summary>
            public double Area { get; set; }
            
            /// <summary>斑点的圆度 (0-1之间，越接近1越圆)</summary>
            public double Circularity { get; set; }
        }

        /// <summary>
        /// 斑点检测参数配置
        /// </summary>
        public class DetectionSettings
        {
            /// <summary>最小阈值 (0-255)，默认50</summary>
            public int MinThreshold { get; set; } = 50;
            
            /// <summary>最大阈值 (0-255)，默认255</summary>
            public int MaxThreshold { get; set; } = 255;
            
            /// <summary>最小面积（像素），默认10</summary>
            public int MinArea { get; set; } = 10;
            
            /// <summary>最大面积（像素），默认10000</summary>
            public int MaxArea { get; set; } = 10000;
            
            /// <summary>最小圆度过滤 (0=不过滤, 1-100)，默认0</summary>
            public int FilterByCircularity { get; set; } = 0;
            
            /// <summary>是否在结果图片上绘制标注，默认true</summary>
            public bool DrawResults { get; set; } = true;
        }

        #endregion

        #region 主要方法

        /// <summary>
        /// 检测图像中的斑点
        /// </summary>
        /// <param name="imageData">图片的字节数组</param>
        /// <param name="settings">检测参数配置（可选，使用默认配置）</param>
        /// <returns>BlobResult 包含检测结果</returns>
        public BlobResult DetectBlobs(byte[] imageData, DetectionSettings? settings = null)
        {
            // 如果未提供配置，使用默认配置
            settings ??= new DetectionSettings();

            var result = new BlobResult();

            try
            {
                // 步骤1: 解码图片
                // ImreadModes.Color = 3通道BGR彩色图
                using var mat = Cv2.ImDecode(imageData, ImreadModes.Color);
                
                if (mat.Empty())
                {
                    result.Error = "无法解码图片，请确认图片格式正确（支持PNG、JPG、BMP等）";
                    return result;
                }

                // 获取图片基本信息
                result.ImageInfo = $"分辨率: {mat.Width} x {mat.Height} | 通道: {mat.Channels()} | 格式: {mat.Type()}";

                // 步骤2: 转换为灰度图
                // 斑点检测通常在灰度图上效果更好
                using var gray = new Mat();
                Cv2.CvtColor(mat, gray, ColorConversionCodes.BGR2GRAY);

                // 步骤3: 阈值化处理
                // 将灰度图转换为二值图（黑白）
                using var threshold = new Mat();
                Cv2.Threshold(gray, threshold, settings.MinThreshold, settings.MaxThreshold, ThresholdTypes.Binary);

                // 步骤4: 形态学操作 - 开运算
                // 去除小的噪声点，保留主要斑点
                using var kernel = Cv2.GetStructuringElement(MorphShapes.Ellipse, new Size(3, 3));
                using var morphed = new Mat();
                Cv2.MorphologyEx(threshold, morphed, MorphTypes.Open, kernel);

                // 步骤5: 查找轮廓
                // 找到所有连通区域的边界
                Point[][] contours;           // 轮廓点坐标
                HierarchyIndex[] hierarchy;  // 轮廓层级关系
                Cv2.FindContours(
                    morphed, 
                    out contours, 
                    out hierarchy, 
                    RetrievalModes.External,    // 只找外轮廓
                    ContourApproxModes.ApproxSimple  // 简化轮廓
                );

                // 步骤6: 分析每个轮廓，筛选符合条件的斑点
                var colorCounts = new Dictionary<string, int>();
                var blobs = new List<BlobInfo>();

                foreach (var contour in contours)
                {
                    // 计算轮廓的面积
                    var area = Cv2.ContourArea(contour);
                    
                    // 面积过滤：跳过太大或太小的区域
                    if (area < settings.MinArea || area > settings.MaxArea)
                        continue;

                    // 计算周长和圆度
                    // 圆度 = 4πA / P²  (A=面积, P=周长)
                    // 圆度越接近1表示越接近圆形
                    var perimeter = Cv2.ArcLength(contour, true);
                    var circularity = perimeter > 0 ? 4 * Math.PI * area / (perimeter * perimeter) : 0;

                    // 圆度过滤：如果设置了最小圆度要求
                    if (settings.FilterByCircularity > 0 && circularity < settings.FilterByCircularity / 100.0)
                        continue;

                    // 计算斑点的中心点（使用矩法）
                    var moments = Cv2.Moments(contour);
                    var centerX = moments.M10 / moments.M00;
                    var centerY = moments.M01 / moments.M00;

                    // 获取边界矩形
                    var rect = Cv2.BoundingRect(contour);

                    // 获取斑点的颜色
                    var color = GetColorAtPoint(mat, new Point((int)centerX, (int)centerY));

                    // 统计颜色
                    if (!colorCounts.ContainsKey(color))
                        colorCounts[color] = 0;
                    colorCounts[color]++;

                    // 保存斑点信息
                    blobs.Add(new BlobInfo
                    {
                        X = (int)centerX,
                        Y = (int)centerY,
                        Width = rect.Width,
                        Height = rect.Height,
                        Color = color,
                        Area = Math.Round(area, 2),
                        Circularity = Math.Round(circularity, 3)
                    });
                }

                // 保存结果
                result.TotalCount = blobs.Count;
                result.ColorCounts = colorCounts;
                result.Blobs = blobs;
                result.IsSuccess = true;

                // 步骤7: 如果需要，绘制检测结果
                if (settings.DrawResults && blobs.Count > 0)
                {
                    using var output = mat.Clone();
                    
                    foreach (var blob in blobs)
                    {
                        var center = new Point(blob.X, blob.Y);
                        var radius = Math.Max(blob.Width, blob.Height) / 2;
                        
                        // 根据颜色绘制不同颜色的圆
                        var circleColor = GetScalarForColor(blob.Color);
                        Cv2.Circle(output, center, radius, circleColor, 2);  // 绘制圆
                        Cv2.Circle(output, center, 3, new Scalar(255, 255, 255), -1);  // 绘制中心点
                        
                        // 标注序号
                        var label = blobs.IndexOf(blob).ToString();
                        Cv2.PutText(
                            output, 
                            label, 
                            new Point(blob.X + 10, blob.Y - 10),
                            HersheyFonts.HersheyPlain, 
                            1, 
                            new Scalar(255, 255, 255), 
                            1
                        );
                    }

                    // 转换为Base64用于网页显示
                    var outputBytes = output.ToBytes(".png");
                    result.ProcessedImageBase64 = Convert.ToBase64String(outputBytes);
                }
            }
            catch (Exception ex)
            {
                result.Error = $"检测出错: {ex.Message}";
            }

            return result;
        }

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

                return $"分辨率: {mat.Width} x {mat.Height} 像素 | 通道数: {mat.Channels()} | 数据类型: {mat.Type()}";
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

        #region 私有辅助方法

        /// <summary>
        /// 获取指定坐标点的颜色名称
        /// 使用RGB值判断颜色类型
        /// </summary>
        /// <param name="image">原始图片矩阵</param>
        /// <param name="point">要检查的坐标点</param>
        /// <returns>颜色名称</returns>
        private string GetColorAtPoint(Mat image, Point point)
        {
            try
            {
                // 边界检查
                if (point.X < 0 || point.Y < 0 || point.X >= image.Width || point.Y >= image.Height)
                    return "边界";

                // 获取该点的BGR值 (OpenCV使用BGR顺序)
                var pixel = image.At<Vec3b>(point.Y, point.X);
                var b = pixel.Item0;  // 蓝色分量
                var g = pixel.Item1;  // 绿色分量
                var r = pixel.Item2;  // 红色分量

                // 计算亮度和色差
                int max = Math.Max(r, Math.Max(g, b));
                int min = Math.Min(r, Math.Min(g, b));

                // 灰度判断：RGB分量差值小于30认为是灰度色
                if (max - min < 30)
                {
                    if (max < 64) return "黑色";
                    if (max > 192) return "白色";
                    return "灰色";
                }

                // 主要颜色判断
                // 红色：R最大，G和B较小
                if (r >= g && r >= b)
                {
                    if (g > 150 && b < 100) return "黄色";
                    if (g < 100 && b < 100) return "红色";
                    if (g > 100 && b > 100) return "橙色";
                    return "红*";  // 偏红但不属于标准色
                }
                
                // 绿色：G最大
                if (g >= r && g >= b)
                {
                    if (r < 100 && b < 100) return "绿色";
                    if (r > 150 && b < 100) return "黄色";
                    return "绿*";
                }
                
                // 蓝色：B最大
                if (b >= r && b >= g)
                {
                    if (r < 100 && g < 100) return "蓝色";
                    if (r > 150 && g < 100) return "紫色";
                    if (r > 150 && g > 150) return "青色";
                    return "蓝*";
                }

                // 返回RGB值作为兜底
                return $"RGB({r},{g},{b})";
            }
            catch
            {
                return "未知";
            }
        }

        /// <summary>
        /// 根据颜色名称获取OpenCV颜色标量
        /// 用于绘制时的颜色定义
        /// </summary>
        /// <param name="color">颜色名称</param>
        /// <returns>OpenCV Scalar对象 (BGR顺序)</returns>
        private Scalar GetScalarForColor(string color)
        {
            // 注意：OpenCV使用BGR而不是RGB
            return color switch
            {
                "红色" => new Scalar(0, 0, 255),      // B=0, G=0, R=255
                "绿色" => new Scalar(0, 255, 0),      // B=0, G=255, R=0
                "蓝色" => new Scalar(255, 0, 0),      // B=255, G=0, R=0
                "黄色" => new Scalar(0, 255, 255),   // B=0, G=255, R=255
                "紫色" => new Scalar(255, 0, 255),   // B=255, G=0, R=255
                "橙色" => new Scalar(0, 128, 255),   // B=0, G=128, R=255
                "白色" => new Scalar(255, 255, 255),
                "黑色" => new Scalar(0, 0, 0),
                "灰色" => new Scalar(128, 128, 128),
                "青色" => new Scalar(255, 255, 0),   // B=255, G=255, R=0
                _ => new Scalar(0, 255, 0)          // 默认绿色
            };
        }

        #endregion
    }
}
