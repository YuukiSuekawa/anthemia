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

Write-Host "Starting AudioResources regeneration (v3)..."

$sb = [System.Text.StringBuilder]::new()
[void]$sb.Append("const AudioResources = {`r`n")

foreach ($key in $files.Keys) {
    $filename = $files[$key]
    $path = Join-Path $resourcesDir $filename
    
    if (Test-Path $path) {
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $b64 = [System.Convert]::ToBase64String($bytes)
        $mime = "data:audio/mp3;base64,"
        
        # Use -f operator to avoid VariableDrive parsing issues
        # {0} = key
        # {1} = mime
        # {2} = base64 data
        # Note: double backticks `` for literal backtick in output
        $line = "    {0}: ``{1}{2}``,`r`n" -f $key, $mime, $b64
        [void]$sb.Append($line)
        
        Write-Host "Processed $key from $filename"
    }
    else {
        Write-Warning "File not found: $path"
    }
}

[void]$sb.Append("};`r`n")
[System.IO.File]::WriteAllText($outputFile, $sb.ToString(), [System.Text.Encoding]::UTF8)

Write-Host "AudioResources.js regenerated successfully."
