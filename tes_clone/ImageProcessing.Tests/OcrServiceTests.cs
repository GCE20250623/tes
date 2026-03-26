namespace ImageProcessing.Tests;

public class OcrServiceTests
{
    private readonly OcrService _service;

    public OcrServiceTests()
    {
        _service = new OcrService();
    }

    [Fact]
    public void RecognizeText_WithNullSettings_UsesDefaults()
    {
        // Arrange
        var imageData = CreateTestImage(400, 100);

        // Act
        var result = _service.RecognizeText(imageData, null!);

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public void RecognizeText_WithValidSettings_ReturnsResult()
    {
        // Arrange
        var imageData = CreateTestImage(400, 100);
        var settings = new OcrService.OcrSettings
        {
            Language = "eng",
            EnhanceContrast = true,
            RemoveNoise = true
        };

        // Act
        var result = _service.RecognizeText(imageData, settings);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Blocks);
    }

    [Fact]
    public void RecognizeText_WithEmptyData_ReturnsError()
    {
        // Arrange
        var emptyData = Array.Empty<byte>();

        // Act
        var result = _service.RecognizeText(emptyData);

        // Assert
        Assert.NotNull(result);
        Assert.False(string.IsNullOrEmpty(result.Error));
    }

    [Fact]
    public void RecognizeMultipleImages_WithEmptyList_ReturnsEmptyResult()
    {
        // Arrange
        var emptyList = new List<byte[]>();

        // Act
        var result = _service.RecognizeMultipleImages(emptyList);

        // Assert
        Assert.NotNull(result);
        Assert.True(string.IsNullOrEmpty(result.Text));
    }

    [Fact]
    public void RecognizeMultipleImages_WithValidImages_ReturnsCombinedResult()
    {
        // Arrange
        var image1 = CreateTestImage(200, 50);
        var image2 = CreateTestImage(200, 50);
        var images = new List<byte[]> { image1, image2 };

        // Act
        var result = _service.RecognizeMultipleImages(images);

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public void GetImageInfo_WithValidImage_ReturnsInfo()
    {
        // Arrange
        var imageData = CreateTestImage(800, 600);

        // Act
        var info = _service.GetImageInfo(imageData);

        // Assert
        Assert.Contains("800", info);
        Assert.Contains("600", info);
    }

    [Fact]
    public void GetImageInfo_WithEmptyData_ReturnsError()
    {
        // Arrange
        var emptyData = Array.Empty<byte>();

        // Act
        var info = _service.GetImageInfo(emptyData);

        // Assert
        Assert.Contains("失败", info);
    }

    [Fact]
    public void ConvertToGrayscale_WithValidImage_ReturnsGrayImage()
    {
        // Arrange
        var imageData = CreateTestImage(100, 100);

        // Act
        var grayData = _service.ConvertToGrayscale(imageData);

        // Assert
        Assert.NotNull(grayData);
        Assert.True(grayData.Length > 0);
    }

    [Fact]
    public void ConvertToGrayscale_WithEmptyData_ReturnsNull()
    {
        // Arrange
        var emptyData = Array.Empty<byte>();

        // Act
        var grayData = _service.ConvertToGrayscale(emptyData);

        // Assert
        Assert.Null(grayData);
    }

    private byte[] CreateTestImage(int width, int height)
    {
        using var mat = new OpenCvSharp.Mat(height, width, OpenCvSharp.MatType.CV_8UC3, new OpenCvSharp.Scalar(255, 255, 255));
        return mat.ToBytes(".png");
    }
}
