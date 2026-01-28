# Sum GitHub release asset download counts for yossi-weinberger/ten10
# "Installer downloads" = MSI + EXE only (excludes latest.json, .sig). Update README badge with this number when you run.
$releases = Invoke-RestMethod -Uri 'https://api.github.com/repos/yossi-weinberger/ten10/releases'
$total = 0
$installerTotal = 0  # MSI + EXE only (excludes latest.json, .sig, etc.)
foreach ($rel in $releases) {
    foreach ($a in $rel.assets) {
        $total += $a.download_count
        $isInstaller = ($a.name -match '\.(msi|exe)$') -and ($a.name -notmatch '\.sig$')
        if ($isInstaller) { $installerTotal += $a.download_count }
        Write-Host "$($rel.tag_name) - $($a.name): $($a.download_count)"
    }
}
Write-Host ""
Write-Host "Total (all assets): $total"
Write-Host "Installer downloads (MSI + EXE only): $installerTotal"
