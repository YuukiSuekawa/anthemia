$ErrorActionPreference = "Stop"
$baseDir = "d:\works\ColorringAnts"
$resourcesDir = Join-Path $baseDir "Resources"
$outputFile = Join-Path $baseDir "js\AudioResources.js"

$files = @{
    "splash" = "水滴3.mp3";
    "bottle" = "氷の入ったグラス.mp3";
    "pour"   = "グラスに水を注ぐ.mp3";
    "select" = "決定ボタンを押す41.mp3"
}

Write-Host "Starting AudioResources regeneration..."

$sb = [System.Text.StringBuilder]::new()
[void]$sb.Append("const AudioResources = {`r`n")

foreach ($key in $files.Keys) {
    $filename = $files[$key]
    $path = Join-Path $resourcesDir $filename
    
    if (Test-Path $path) {
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $b64 = [System.Convert]::ToBase64String($bytes)
        $mime = "data:audio/mp3;base64,"
        
        # Format: key: `data...`,
        # Using backticks for JS string to handle any internal quotes if they existed, though base64 won't have them.
        # But wait, original used backticks ` ` `. Let's stick to that.
        # In PowerShell backtick is escape char.
        # To write a backtick literal in PS string: ``
        
        [void]$sb.Append("    $key: ``$mime$b64``,`r`n")
        
        Write-Host "Processed $key from $filename"
    }
    else {
        Write-Warning "File not found: $path"
    }
}

[void]$sb.Append("};`r`n")
[System.IO.File]::WriteAllText($outputFile, $sb.ToString(), [System.Text.Encoding]::UTF8)

Write-Host "AudioResources.js regenerated successfully."
