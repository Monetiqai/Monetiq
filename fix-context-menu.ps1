$files = @(
    @{ Path = "c:\Users\merza\ecommerce-ai-v1\app\director-node\components\nodes\CombineImageNode.tsx"; Type = "CombineImage" },
    @{ Path = "c:\Users\merza\ecommerce-ai-v1\app\director-node\components\nodes\VideoGenNode.tsx"; Type = "VideoGen" },
    @{ Path = "c:\Users\merza\ecommerce-ai-v1\app\director-node\components\nodes\RouterNode.tsx"; Type = "Router" },
    @{ Path = "c:\Users\merza\ecommerce-ai-v1\app\director-node\components\nodes\ReferenceImageNode.tsx"; Type = "ReferenceImage" },
    @{ Path = "c:\Users\merza\ecommerce-ai-v1\app\director-node\components\nodes\ImageGenNode.tsx"; Type = "ImageGen" },
    @{ Path = "c:\Users\merza\ecommerce-ai-v1\app\director-node\components\nodes\PromptNode.tsx"; Type = "Prompt" },
    @{ Path = "c:\Users\merza\ecommerce-ai-v1\app\director-node\components\nodes\DirectorStyleNode.tsx"; Type = "DirectorStyle" },
    @{ Path = "c:\Users\merza\ecommerce-ai-v1\app\director-node\components\nodes\CombineTextNode.tsx"; Type = "CombineText" },
    @{ Path = "c:\Users\merza\ecommerce-ai-v1\app\director-node\components\nodes\CinematicSetupNode.tsx"; Type = "CinematicSetup" }
)

foreach ($file in $files) {
    $content = Get-Content $file.Path -Raw
    
    # Pattern to find NodeContextMenu without nodeId prop
    $pattern = '(\s+<NodeContextMenu\s+)(position=)'
    $replacement = "`$1nodeId={id}`n                    nodeType=`"$($file.Type)`"`n                    isOpen={contextMenuOpen}`n                    `$2"
    
    $newContent = $content -replace $pattern, $replacement
    
    if ($content -ne $newContent) {
        Set-Content -Path $file.Path -Value $newContent -NoNewline
        Write-Host "✓ Fixed $($file.Path)"
    } else {
        Write-Host "- Skipped $($file.Path) (already fixed or pattern not found)"
    }
}

Write-Host "`nAll files processed!"
