$srcRoot = "D:\PROJE\SAMA HOME"
$dstRoot = "C:\Users\DELL PRECISION 3541\SAMA-HOME-preservation\2026-10-24_staging-lot0_4ec1a55\SAMA HOME"

$targets = @(
    "web\src\components\dashboard\dashboard-hotel-view.tsx",
    "web\src\components\dashboard\dashboard-residence-view.tsx",
    "web\src\components\dashboard\dashboard-agency-view.tsx",
    "web\src\components\navigation\app-shell.tsx",
    "web\public\maquette-mnd\hotel.html",
    "web\public\maquette-mnd\residence.html",
    "web\public\maquette-mnd\immobilier.html",
    "web\public\images\agence-atlantique-thumb.png",
    "web\public\images\agence-hero-building.png",
    "web\public\maquette-mnd\images\agence-atlantique-thumb.png",
    "web\public\maquette-mnd\images\agence-hero-building.png"
)

foreach ($item in $targets) {
    $srcPath = Join-Path $srcRoot $item
    $dstPath = Join-Path $dstRoot $item
    $dir = Split-Path $dstPath -Parent
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    Copy-Item -Path $srcPath -Destination $dstPath -Force
    $h1 = (Get-FileHash -Path $srcPath -Algorithm SHA256).Hash
    $h2 = (Get-FileHash -Path $dstPath -Algorithm SHA256).Hash
    Write-Host "$item : $($h1 -eq $h2) ($h1)"
}
