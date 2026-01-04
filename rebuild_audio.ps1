$baseDir = "d:\works\ColorringAnts"
$resourcesDir = Join-Path $baseDir "Resources"
$outputFile = Join-Path $baseDir "js\AudioResources.js"

$files = @{
    "splash" = "水滴3.mp3"
    "bottle" = "氷の入ったグラス.mp3"
    "pour"   = "グラスに水を注ぐ.mp3"
    "select" = "決定ボタンを押す41.mp3"
}

$content = "const AudioResources = {`r`n"
$i = 0
$count = $files.Count

foreach ($key in $files.Keys) {
    $filename = $files[$key]
    $path = Join-Path $resourcesDir $filename
    
    if (Test-Path $path) {
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $b64 = [System.Convert]::ToBase64String($bytes)
        
        $content += "    $key: `"$b64`""
        
        # Add comma if not the last item roughly (keys order might vary, but JS allows trailing comma often but let's be safe-ish or just add comma always except strict)
        # Actually keys enumeration order is not guaranteed. 
        # Safer strategy: Add comma to all, or simple list.
        # Let's just add comma to all items. JS handles trailing comma fine in objects.
        $content += ",`r`n"
        
        Write-Host "Processed $key from $filename"
    }
    else {
        Write-Error "File not found: $path"
    }
}

$content += "};`r`n"

# Only write if we have content
Set-Content -Path $outputFile -Value $content -Encoding UTF8
Write-Host "AudioResources.js regenerated successfully."
