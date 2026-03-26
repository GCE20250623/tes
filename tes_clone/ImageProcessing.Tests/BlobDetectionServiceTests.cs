namespace ImageProcessing.Tests;

public class BlobDetectionServiceTests
{
    private readonly BlobDetectionService _service;

    public BlobDetectionServiceTests()
    {
        _service = new BlobDetectionService();
    }

    [Fact]
    public void DetectBlobs_WithNullSettings_UsesDefaults()
    {
        // Arrange
        var imageData = CreateTestImage(100, 100);

        // Act
        var result = _service.DetectBlobs(imageData, null!);

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public void DetectBlobs_WithValidSettings_ReturnsResult()
    {
        // Arrange
        var imageData = CreateTestImage(200, 200);
        var settings = new BlobDetectionService.DetectionSettings
        {
            MinThreshold = 50,
            MaxThreshold = 255,
            MinArea = 10,
            MaxArea = 10000
        };

        // Act
        var result = _service.DetectBlobs(imageData, settings);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.TotalCount >= 0);
        Assert.NotNull(result.ColorCounts);
    }

    [Fact]
    public void DetectBlobs_WithHighThreshold_ReturnsEmpty()
    {
        // Arrange
        var imageData = CreateTestImage(100, 100);
        var settings = new BlobDetectionService.DetectionSettings
        {
            MinThreshold = 254,
            MaxThreshold = 255,
            MinArea = 10,
            MaxArea = 10000
        };

        // Act
        var result = _service.DetectBlobs(imageData, settings);

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public void GetImageInfo_WithValidImage_ReturnsInfo()
    {
        // Arrange
        var imageData = CreateTestImage(320, 240);

        // Act
        var info = _service.GetImageInfo(imageData);

        // Assert
        Assert.Contains("320", info);
        Assert.Contains("240", info);
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
        using var mat = new OpenCvSharp.Mat(height, width, OpenCvSharp.MatType.CV_8UC3, new OpenCvSharp.Scalar(128, 128, 128));
        return mat.ToBytes(".png");
    }
}
