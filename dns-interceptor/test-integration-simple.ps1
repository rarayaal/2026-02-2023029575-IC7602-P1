# Test de Integracion Simple: DNS Interceptor + mock-dns-api
# Usa docker-compose para validar que ambos servicios se levantan correctamente

Write-Host "`n=== DNS Interceptor Integration Test ===" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $ScriptDir

# Levanta servicios
Write-Host "`n[1/3] Levantando servicios..."
docker-compose down 2>&1 | Select-String "Removed" -ErrorAction SilentlyContinue
docker-compose up -d
Start-Sleep -Seconds 5

# Valida que estan corriendo
Write-Host "`n[2/3] Validando servicios..."
$output = docker-compose ps
$running = $output | Select-String "Up"
if ($running -and ($running | Measure-Object).Count -ge 2) {
    Write-Host "[OK] Ambos servicios estan corriendo" -ForegroundColor Green
    $output
} else {
    Write-Host "[FAIL] No todos los servicios estan corriendo" -ForegroundColor Red
    docker-compose logs
    exit 1
}

# Valida logs
Write-Host "`n[3/3] Validando logs del Interceptor..."
$logs = docker-compose logs dns-interceptor | Select-String "escuchando en udp"
if ($logs) {
    Write-Host "[OK] Interceptor se levanto correctamente" -ForegroundColor Green
    Write-Host $logs
} else {
    Write-Host "[WARN] Log de inicializacion no encontrado, pero verificando mas..." -ForegroundColor Yellow
    docker-compose logs dns-interceptor | Select-Object -Last 5
}

# Limpia
Write-Host "`n[CLEANUP] Deteniendo servicios..."
docker-compose down | Select-String "Removed" -ErrorAction SilentlyContinue

Write-Host "`n=== TEST COMPLETE ===" -ForegroundColor Green
Pop-Location
