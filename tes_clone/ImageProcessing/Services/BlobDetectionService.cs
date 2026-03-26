using OpenCvSharp;

namespace ImageProcessing.Services;

public class BlobDetectionService
{
    public class BlobResult
    {
        public int TotalCount { get; set; }
        public Dictionary<string, int> ColorCounts { get; set; } = new();
        public List<BlobInfo> Blobs { get; set; } = new();
        public string ProcessedImageBase64 { get; set; } = "";
        public string ImageInfo { get; set; } = "";
        public bool IsSuccess { get; set; }
        public string Error { get; set; } = "";
    }

    public class BlobInfo
    {
        public int X { get; set; }
        public int Y { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
        public string Color { get; set; } = "";
        public double Area { get; set; }
        public double Circularity { get; set; }
    }

    public class DetectionSettings
    {
        public int MinThreshold { get; set; } = 50;
        public int MaxThreshold { get; set; } = 255;
        public int MinArea { get; set; } = 10;
        public int MaxArea { get; set; } = 10000;
        public int FilterByCircularity { get; set; } = 0; // 0 = 不过滤, 1-100 = 最小圆度
        public bool DrawResults { get; set; } = true;
    }

    public BlobResult DetectBlobs(byte[] imageData, DetectionSettings? settings = null)
    {
        var result = new BlobResult();
        settings ??= new DetectionSettings();

        try
        {
            using var mat = Cv2.ImDecode(imageData, ImreadModes.Color);
            if (mat.Empty())
            {
                result.Error = "无法解码图片，请确认图片格式正确";
                return result;
            }

            result.ImageInfo = $"分辨率: {mat.Width} x {mat.Height} | 通道: {mat.Channels()} | 格式: {mat.Type()}";

            using var gray = new Mat();
            Cv2.CvtColor(mat, gray, ColorConversionCodes.BGR2GRAY);

            // 阈值化
            using var threshold = new Mat();
            Cv2.Threshold(gray, threshold, settings.MinThreshold, settings.MaxThreshold, ThresholdTypes.Binary);

            // 形态学操作 - 开运算去除噪声
            using var kernel = Cv2.GetStructuringElement(MorphShapes.Ellipse, new Size(3, 3));
            using var morphed = new Mat();
            Cv2.MorphologyEx(threshold, morphed, MorphTypes.Open, kernel);

            // 查找轮廓
            Point[][] contours;
            HierarchyIndex[] hierarchy;
            Cv2.FindContours(morphed, out contours, out hierarchy, RetrievalModes.External, ContourApproxModes.ApproxSimple);

            var colorCounts = new Dictionary<string, int>();
            var blobs = new List<BlobInfo>();

            foreach (var contour in contours)
            {
                var area = Cv2.ContourArea(contour);
                if (area < settings.MinArea || area > settings.MaxArea)
                    continue;

                var perimeter = Cv2.ArcLength(contour, true);
                var circularity = perimeter > 0 ? 4 * Math.PI * area / (perimeter * perimeter) : 0;

                if (settings.FilterByCircularity > 0 && circularity < settings.FilterByCircularity / 100.0)
                    continue;

                var moments = Cv2.Moments(contour);
                var centerX = moments.M10 / moments.M00;
                var centerY = moments.M01 / moments.M00;

                var rect = Cv2.BoundingRect(contour);
                var color = GetColorAtPoint(mat, new Point((int)centerX, (int)centerY));

                if (!colorCounts.ContainsKey(color))
                    colorCounts[color] = 0;
                colorCounts[color]++;

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

            result.TotalCount = blobs.Count;
            result.ColorCounts = colorCounts;
            result.Blobs = blobs;
            result.IsSuccess = true;

            if (settings.DrawResults && blobs.Count > 0)
            {
                using var output = mat.Clone();
                
                // 绘制所有检测到的斑点
                foreach (var blob in blobs)
                {
                    var center = new Point(blob.X, blob.Y);
                    var radius = Math.Max(blob.Width, blob.Height) / 2;
                    
                    // 根据颜色绘制不同颜色的圆
                    var circleColor = GetScalarForColor(blob.Color);
                    Cv2.Circle(output, center, radius, circleColor, 2);
                    Cv2.Circle(output, center, 3, new Scalar(255, 255, 255), -1);
                    
                    // 标注序号
                    var label = blobs.IndexOf(blob).ToString();
                    Cv2.PutText(output, label, new Point(blob.X + 10, blob.Y - 10),
                        HersheyFonts.HersheyPlain, 1, new Scalar(255, 255, 255), 1);
                }

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

    private string GetColorAtPoint(Mat image, Point point)
    {
        try
        {
            if (point.X < 0 || point.Y < 0 || point.X >= image.Width || point.Y >= image.Height)
                return "边界";

            var pixel = image.At<Vec3b>(point.Y, point.X);
            var b = pixel.Item0;
            var g = pixel.Item1;
            var r = pixel.Item2;

            // 简化的颜色判断
            int max = Math.Max(r, Math.Max(g, b));
            int min = Math.Min(r, Math.Min(g, b));

            // 灰度判断
            if (max - min < 30)
            {
                if (max < 64) return "黑色";
                if (max > 192) return "白色";
                return "灰色";
            }

            // 主要颜色判断
            if (r >= g && r >= b)
            {
                if (g > 150 && b < 100) return "黄色";
                if (g < 100 && b < 100) return "红色";
                if (g > 100 && b > 100) return "橙色";
                return "红*" ;
            }
            
            if (g >= r && g >= b)
            {
                if (r < 100 && b < 100) return "绿色";
                if (r > 150 && b < 100) return "黄色";
                return "绿*";
            }
            
            if (b >= r && b >= g)
            {
                if (r < 100 && g < 100) return "蓝色";
                if (r > 150 && g < 100) return "紫色";
                if (r > 150 && g > 150) return "青色";
                return "蓝*";
            }

            return $"RGB({r},{g},{b})";
        }
        catch
        {
            return "未知";
        }
    }

    private Scalar GetScalarForColor(string color)
    {
        return color switch
        {
            "红色" => new Scalar(0, 0, 255),
            "绿色" => new Scalar(0, 255, 0),
            "蓝色" => new Scalar(255, 0, 0),
            "黄色" => new Scalar(0, 255, 255),
            "紫色" => new Scalar(255, 0, 255),
            "橙色" => new Scalar(0, 128, 255),
            "白色" => new Scalar(255, 255, 255),
            "黑色" => new Scalar(0, 0, 0),
            "灰色" => new Scalar(128, 128, 128),
            "青色" => new Scalar(255, 255, 0),
            _ => new Scalar(0, 255, 0)
        };
    }
}
