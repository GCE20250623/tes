using OpenCvSharp;

namespace ImageProcessing.Services;

public class BlobDetectionService
{
    public class BlobResult
    {
        public int TotalCount { get; set; }
        public Dictionary<string, int> ColorCounts { get; set; } = new();
        public string ProcessedImageBase64 { get; set; } = "";
    }

    public BlobResult DetectBlobs(byte[] imageData, int minThreshold = 50, int maxThreshold = 255, int minArea = 10, int maxArea = 1000)
    {
        var result = new BlobResult();

        try
        {
            using var mat = Cv2.ImDecode(imageData, ImreadModes.Color);
            if (mat.Empty())
            {
                return result;
            }

            using var gray = new Mat();
            Cv2.CvtColor(mat, gray, ColorConversionCodes.BGR2GRAY);

            var parameters = new SimpleBlobDetector.Params
            {
                MinThreshold = minThreshold,
                MaxThreshold = maxThreshold,
                MinArea = minArea,
                MaxArea = maxArea,
                FilterByColor = true,
                BlobColor = 255
            };

            using var detector = SimpleBlobDetector.Create(parameters);
            var keypoints = detector.Detect(gray);

            result.TotalCount = keypoints.Length;

            var colorCounts = new Dictionary<string, int>();
            
            foreach (var kp in keypoints)
            {
                var point = new Point((int)kp.Pt.X, (int)kp.Pt.Y);
                var color = GetColorAtPoint(mat, point);
                
                if (!colorCounts.ContainsKey(color))
                    colorCounts[color] = 0;
                colorCounts[color]++;
            }

            result.ColorCounts = colorCounts;

            using var output = mat.Clone();
            foreach (var kp in keypoints)
            {
                var center = new Point((int)kp.Pt.X, (int)kp.Pt.Y);
                var radius = (int)(kp.Size / 2);
                Cv2.Circle(output, center, radius, new Scalar(0, 255, 0), 2);
            }

            var outputBytes = output.ToBytes(".png");
            result.ProcessedImageBase64 = Convert.ToBase64String(outputBytes);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
        }

        return result;
    }

    private string GetColorAtPoint(Mat image, Point point)
    {
        try
        {
            if (point.X < 0 || point.Y < 0 || point.X >= image.Width || point.Y >= image.Height)
                return "Unknown";

            var pixel = image.At<Vec3b>(point.Y, point.X);
            var b = pixel.Item0;
            var g = pixel.Item1;
            var r = pixel.Item2;

            if (r > 200 && g < 100 && b < 100) return "红色 (Red)";
            if (r > 200 && g > 200 && b < 100) return "黄色 (Yellow)";
            if (r < 100 && g > 200 && b < 100) return "绿色 (Green)";
            if (r < 100 && g < 100 && b > 200) return "蓝色 (Blue)";
            if (r > 200 && g < 100 && b > 200) return "紫色 (Purple)";
            if (r > 200 && g > 200 && b > 200) return "白色 (White)";
            if (r < 50 && g < 50 && b < 50) return "黑色 (Black)";
            if (r > 150 && g > 100 && b < 100) return "橙色 (Orange)";
            
            return $"RGB({r},{g},{b})";
        }
        catch
        {
            return "Unknown";
        }
    }
}
