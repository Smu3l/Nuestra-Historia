# Atajo para la consola de teleport (tools/teleport.cjs).
#
#   .\tools\tp.ps1 lago_celos
#   .\tools\tp.ps1 casa 5 8
#   .\tools\tp.ps1 pos
#   .\tools\tp.ps1 quit
#
# Si da error de permisos:
#   powershell -ExecutionPolicy Bypass -File .\tools\tp.ps1 lago_celos

param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $Rest
)

$port = if ($env:TP_PORT) { $env:TP_PORT } else { 8787 }
$base = "http://127.0.0.1:$port"
$control = @('pos', 'status', 'maps', 'list', 'god', 'silence', 'quit', 'close', 'exit')

if ($Rest.Count -eq 0) {
  $url = "$base/pos"
} elseif ($control -contains $Rest[0]) {
  $url = "$base/$($Rest[0])"
} else {
  $url = "$base/tp/$($Rest[0])"
  $q = @()
  if ($Rest.Count -ge 2) { $q += 'x=' + $Rest[1] }
  if ($Rest.Count -ge 3) { $q += 'y=' + $Rest[2] }
  if ($q.Count) { $url += '?' + ($q -join '&') }
}

try {
  (Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 5).Content
} catch {
  Write-Output "No responde la consola del juego en $url"
  Write-Output "Arrancala antes con:  npm run tp"
}
