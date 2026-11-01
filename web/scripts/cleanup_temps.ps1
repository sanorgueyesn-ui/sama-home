Write-Host "--- 1. Nettoyage de la corbeille ---"
Clear-RecycleBin -Force -ErrorAction SilentlyContinue

Write-Host "--- 2. Nettoyage du dossier temporaire utilisateur ---"
$tempPath = "C:\Users\DELL PRECISION 3541\AppData\Local\Temp"
Get-ChildItem -Path $tempPath -Force -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    } catch {}
}

Write-Host "--- 3. Nettoyage du dossier temporaire Windows ---"
$winTemp = "C:\Windows\Temp"
Get-ChildItem -Path $winTemp -Force -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    } catch {}
}

$cDisk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID = 'C:'"
$freeGB = [math]::Round($cDisk.FreeSpace / 1GB, 2)
Write-Host "Espace libre actuel sur C: $freeGB Go"
