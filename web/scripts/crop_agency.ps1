Add-Type -AssemblyName System.Drawing
$imgSrc = "D:\PROJE\SAMA HOME\NOUVEAUS GUIDE SAMA HOME\ARCHITECTUR\MODUL\IMMOBILIER\Tableau de bord immobilier SAMA HOME.png"
$bmp = [System.Drawing.Bitmap]::FromFile($imgSrc)

# Sidebar thumbnail: exact clean crop without border
$rectThumb = New-Object System.Drawing.Rectangle(20, 688, 212, 100)
$cropThumb = $bmp.Clone($rectThumb, $bmp.PixelFormat)
$dstThumb1 = "D:\PROJE\SAMA HOME\web\public\maquette-mnd\images\agence-atlantique-thumb.png"
$dstThumb2 = "D:\PROJE\SAMA HOME\web\public\images\agence-atlantique-thumb.png"
$cropThumb.Save($dstThumb1, [System.Drawing.Imaging.ImageFormat]::Png)
$cropThumb.Save($dstThumb2, [System.Drawing.Imaging.ImageFormat]::Png)
$cropThumb.Dispose()

# Hero building clean crop without action buttons (y: 80 to 255)
$rectHero = New-Object System.Drawing.Rectangle(620, 80, 895, 175)
$cropHero = $bmp.Clone($rectHero, $bmp.PixelFormat)
$dstHero1 = "D:\PROJE\SAMA HOME\web\public\maquette-mnd\images\agence-hero-building.png"
$dstHero2 = "D:\PROJE\SAMA HOME\web\public\images\agence-hero-building.png"
$cropHero.Save($dstHero1, [System.Drawing.Imaging.ImageFormat]::Png)
$cropHero.Save($dstHero2, [System.Drawing.Imaging.ImageFormat]::Png)
$cropHero.Dispose()

$bmp.Dispose()
Write-Host "Precision crop completed!"
