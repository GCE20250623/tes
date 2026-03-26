#Requires -Modules @{ ModuleName="OpenCvSharp"; ModuleVersion="4.0.0" }
# Note: This script requires OpenCvSharp to be installed
# For generating test images without the module, use the pre-generated base64 images below

param(
    [string]$OutputDir = "."
)

Write-Host "Generating test images for ImageProcessing..."

# Try to use OpenCvSharp if available
try {
    Add-Type -Path "$env:USERPROFILE\.nuget\packages\opencvsharp4\4.9.0.20240103\lib\net48\OpenCvSharp.dll"
    
    # Generate red circles image
    $mat1 = [OpenCvSharp.Mat]::new(200, 200, [OpenCvSharp.MatType]::CV_8UC3, [OpenCvSharp.Scalar]::new(255, 255, 255))
    for ($i = 0; $i -lt 5; $i++) {
        $x = 50 + $i * 30
        $y = 100
        [OpenCvSharp.Cv2]::Circle($mat1, [OpenCvSharp.Point]::new($x, $y), 15, [OpenCvSharp.Scalar]::new(0, 0, 255), -1)
    }
    $bytes1 = $mat1.ToBytes(".png")
    [System.IO.File]::WriteAllBytes("$OutputDir\blob_red_circles.png", $bytes1)
    
    # Generate multi-color image
    $mat2 = [OpenCvSharp.Mat]::new(300, 300, [OpenCvSharp.MatType]::CV_8UC3, [OpenCvSharp.Scalar]::new(255, 255, 255))
    [OpenCvSharp.Cv2]::Circle($mat2, [OpenCvSharp.Point]::new(75, 75), 25, [OpenCvSharp.Scalar]::new(0, 0, 255), -1)   # Red
    [OpenCvSharp.Cv2]::Circle($mat2, [OpenCvSharp.Point]::new(150, 75), 25, [OpenCvSharp.Scalar]::new(0, 255, 0), -1)   # Green
    [OpenCvSharp.Cv2]::Circle($mat2, [OpenCvSharp.Point]::new(225, 75), 25, [OpenCvSharp.Scalar]::new(255, 0, 0), -1)   # Blue
    [OpenCvSharp.Cv2]::Rectangle($mat2, [OpenCvSharp.Rect]::new(50, 150, 50, 50), [OpenCvSharp.Scalar]::new(0, 255, 255), -1)  # Yellow
    [OpenCvSharp.Cv2]::Rectangle($mat2, [OpenCvSharp.Rect]::new(125, 150, 50, 50), [OpenCvSharp.Scalar]::new(255, 0, 255), -1) # Purple
    [OpenCvSharp.Cv2]::Rectangle($mat2, [OpenCvSharp.Rect]::new(200, 150, 50, 50), [OpenCvSharp.Scalar]::new(255, 128, 0), -1) # Orange
    $bytes2 = $mat2.ToBytes(".png")
    [System.IO.File]::WriteAllBytes("$OutputDir\blob_multi_color.png", $bytes2)
    
    Write-Host "Generated images with OpenCvSharp"
}
catch {
    Write-Host "OpenCvSharp not available, using System.Drawing..."
    
    # Fallback to System.Drawing
    Add-Type -AssemblyName System.Drawing
    
    # Generate red circles image
    $bmp1 = New-Object System.Drawing.Bitmap(200, 200)
    $g1 = [System.Drawing.Graphics]::FromImage($bmp1)
    $g1.Clear([System.Drawing.Color]::White)
    $redBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Red)
    for ($i = 0; $i -lt 5; $i++) {
        $x = 50 + $i * 30
        $g1.FillEllipse($redBrush, ($x - 15), 85, 30, 30)
    }
    $bmp1.Save("$OutputDir\blob_red_circles.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $g1.Dispose()
    $bmp1.Dispose()
    
    # Generate multi-color image
    $bmp2 = New-Object System.Drawing.Bitmap(300, 300)
    $g2 = [System.Drawing.Graphics]::FromImage($bmp2)
    $g2.Clear([System.Drawing.Color]::White)
    
    $colors = @(
        [System.Drawing.Color]::Red,
        [System.Drawing.Color]::Green,
        [System.Drawing.Color]::Blue,
        [System.Drawing.Color]::Yellow,
        [System.Drawing.Color]::Purple,
        [System.Drawing.Color]::Orange
    )
    
    $positions = @(@(75, 75), @(150, 75), @(225, 75), @(75, 175), @(150, 175), @(225, 175))
    
    for ($i = 0; $i -lt $colors.Length; $i++) {
        $brush = New-Object System.Drawing.SolidBrush($colors[$i])
        if ($i -lt 3) {
            $g2.FillEllipse($brush, ($positions[$i][0] - 20), ($positions[$i][1] - 20), 40, 40)
        } else {
            $g2.FillRectangle($brush, ($positions[$i][0] - 20), ($positions[$i][1] - 20), 40, 40)
        }
    }
    
    $bmp2.Save("$OutputDir\blob_multi_color.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $g2.Dispose()
    $bmp2.Dispose()
    
    Write-Host "Generated images with System.Drawing"
}

Write-Host "Test image generation complete!"
