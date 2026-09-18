Add-Type -AssemblyName System.Drawing

$srcPath = (Resolve-Path "assets/logo.png").Path
$img = [System.Drawing.Image]::FromFile($srcPath)
$sizes = @(128, 48, 32, 16)

foreach ($s in $sizes) {
    $dest = New-Object System.Drawing.Bitmap($s, $s)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $s, $s)
    $g.Dispose()
    
    $outPath = Join-Path "public/icons" "icon-$s.png"
    $dest.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
    Write-Host "Generated $outPath ($s x $s)"
}

$img.Dispose()
Write-Host "All extension icons generated successfully."
