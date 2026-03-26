using OpenCvSharp;
using Tesseract;

namespace ImageProcessing.Services;

public class OcrService
{
    public class OcrResult
    {
        public string Text { get; set; } = "";
        public int Confidence { get; set; }
        public string Error { get; set; } = "";
    }

    public OcrResult RecognizeText(byte[] imageData, string language = "eng+chi_sim")
    {
        var result = new OcrResult();

        try
        {
            using var preprocessed = PreprocessForOcr(imageData);
            var preprocessedBytes = preprocessed.ToBytes(".png");

            using var engine = new TesseractEngine(@"./tessdata", language, EngineMode.Default);
            using var img = Pix.LoadFromMemory(preprocessedBytes);
            using var page = engine.Process(img);

            result.Text = page.GetText();
            result.Confidence = (int)(page.GetMeanConfidence() * 100);
        }
        catch (Exception ex)
        {
            result.Error = ex.Message;
        }

        return result;
    }

    public OcrResult RecognizeMultipleImages(List<byte[]> imagesData, string language = "eng+chi_sim")
    {
        var combinedResult = new OcrResult();
        var allTexts = new List<string>();

        try
        {
            for (int i = 0; i < imagesData.Count; i++)
            {
                var singleResult = RecognizeText(imagesData[i], language);
                if (!string.IsNullOrWhiteSpace(singleResult.Text))
                {
                    allTexts.Add($"=== 图片 {i + 1} ===\n{singleResult.Text}");
                }
            }

            combinedResult.Text = string.Join("\n\n", allTexts);
        }
        catch (Exception ex)
        {
            combinedResult.Error = ex.Message;
        }

        return combinedResult;
    }

    private Mat PreprocessForOcr(byte[] imageData)
    {
        using var mat = Cv2.ImDecode(imageData, ImreadModes.Color);
        if (mat.Empty())
            throw new Exception("Could not decode image");

        using var gray = new Mat();
        Cv2.CvtColor(mat, gray, ColorConversionCodes.BGR2GRAY);

        using var threshold = new Mat();
        Cv2.AdaptiveThreshold(gray, threshold, 255, AdaptiveThresholdTypes.GaussC, ThresholdTypes.Binary, 11, 2);

        return threshold.Clone();
    }
}
