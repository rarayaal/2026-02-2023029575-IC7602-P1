# Test de Integracion: DNS Interceptor + mock-dns-api
# 
# Valida que el Interceptor funciona end-to-end en Docker Compose:
# 1. Levanta los servicios.
# 2. Envia queries DNS (StandardQuery + NonStandard).
# 3. Valida que recibe respuestas correctas.
# 4. Detiene los servicios.
#
# Uso:
#   .\test-integration.ps1

param(
    [switch]$SkipDown = $false   # No bajara docker-compose al final (util para debugging)
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n=== DNS Interceptor Integration Tests ===" -ForegroundColor Cyan

# Levanta servicios 
Write-Host "`n[1/5] Levantando docker-compose..."
Push-Location $ScriptDir
try {
    docker-compose down 2>&1 | Out-Null  # Limpia si habia algo anterior
    Start-Sleep -Seconds 2
    docker-compose up -d
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudieron levantar los servicios Docker"
    }
    Start-Sleep -Seconds 3  # Espera a que los servicios esten listos

    $services = docker-compose ps --services
    $running = docker-compose ps --status running --services
    foreach ($service in $services) {
        if ($running -notcontains $service) {
            docker-compose ps
            docker-compose logs $service
            throw "El servicio '$service' no esta corriendo"
        }
    }
} finally {
    Pop-Location
}

Write-Host "[OK] Servicios levantados" -ForegroundColor Green

# Test 1: StandardQuery para example.com
Write-Host "`n[2/5] Test 1: StandardQuery (example.com tipo A)..."
try {
    $socket = [System.Net.Sockets.UdpClient]::new()
    $socket.Client.ReceiveTimeout = 5000
    $socket.Connect("127.0.0.1", 5354)
    
    # Paquete DNS: header (12 bytes) + Question para example.com A IN
    # Header: ID=0x1111, RD=1, QDCOUNT=1
    $header = [byte[]](0x11,0x11, 0x01,0x00, 0x00,0x01, 0x00,0x00, 0x00,0x00, 0x00,0x00)
    # Question: example.com A IN
    $qname  = [byte[]](0x07, 0x65,0x78,0x61,0x6d,0x70,0x6c,0x65, 0x03,0x63,0x6f,0x6d, 0x00)
    $qtype  = [byte[]](0x00, 0x01)  # A record
    $qclass = [byte[]](0x00, 0x01)  # IN
    
    $packet = $header + $qname + $qtype + $qclass
    $socket.Send($packet, $packet.Length) | Out-Null
    
    $response = $socket.Receive([ref]$null)
    $socket.Close()
    
    # Validaciones minimas:
    # Response length >= 12
    # Response[0:2] == packet ID (0x1111)
    # Response[2] bits QR=1 
    if ($response.Length -lt 12) {
        throw "Respuesta muy corta: $($response.Length) bytes"
    }
    if (($response[0] -ne 0x11) -or ($response[1] -ne 0x11)) {
        throw "ID no coincide"
    }
    if (($response[2] -band 0x80) -eq 0) {
        throw "Bit QR no esta prendido (respuesta no valida)"
    }
    
    Write-Host "[OK] StandardQuery recibio respuesta valida ($($response.Length) bytes, QR=1)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] StandardQuery fallo: $_" -ForegroundColor Red
    throw
}

# Test 2: NonStandardQuery (OPCODE=1, IQUERY)
Write-Host "`n[3/5] Test 2: NonStandardQuery (OPCODE=1)..."
try {
    $socket = [System.Net.Sockets.UdpClient]::new()
    $socket.Client.ReceiveTimeout = 5000
    $socket.Connect("127.0.0.1", 5354)
    
    # Mismo paquete pero con OPCODE=1 (IQUERY) en el byte 2
    # Byte 2 en un query estandar es 0x00
    # Para OPCODE=1: 0x08 
    $header = [byte[]](0x22,0x22, 0x08,0x00, 0x00,0x01, 0x00,0x00, 0x00,0x00, 0x00,0x00)
    $qname  = [byte[]](0x07, 0x65,0x78,0x61,0x6d,0x70,0x6c,0x65, 0x03,0x63,0x6f,0x6d, 0x00)
    $qtype  = [byte[]](0x00, 0x01)
    $qclass = [byte[]](0x00, 0x01)
    
    $packet = $header + $qname + $qtype + $qclass
    $socket.Send($packet, $packet.Length) | Out-Null
    
    $response = $socket.Receive([ref]$null)
    $socket.Close()
    
    # Validaciones:
    # Response length >= 12
    # ID = 0x2222
    # QR=1 (el mock_dns_api prende el bit QR)
    if ($response.Length -lt 12) {
        throw "Respuesta muy corta: $($response.Length) bytes"
    }
    if (($response[0] -ne 0x22) -or ($response[1] -ne 0x22)) {
        throw "ID no coincide"
    }
    if (($response[2] -band 0x80) -eq 0) {
        throw "Bit QR no esta prendido (mock_dns_api deberia haberlo prendido)"
    }
    
    Write-Host "[OK] NonStandardQuery delegado al mock_dns_api, respuesta valida ($($response.Length) bytes, QR=1)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] NonStandardQuery fallo: $_" -ForegroundColor Red
    throw
}

# Test 3: Validar logs
Write-Host "`n[4/5] Validando logs..."
try {
    Push-Location $ScriptDir
    $logs = docker-compose logs dns-interceptor 2>&1 | Select-Object -Last 10
    
    # Debe aparecer al menos "escuchando en udp"
    $logsStr = $logs | Out-String
    if ($logsStr -match "escuchando en udp") {
        Write-Host "[OK] Interceptor levanto correctamente (log: escuchando en udp)" -ForegroundColor Green
    } else {
        throw "No se encontro el log de inicializacion del interceptor"
    }
} finally {
    Pop-Location
}

# Detener servicios 
Write-Host "`n[5/5] Deteniendo servicios..."
try {
    Push-Location $ScriptDir
    if (-not $SkipDown) {
        docker-compose down 2>&1 | Select-Object -Last 3
    } else {
        Write-Host "Servicios dejados corriendo (usa docker-compose down manualmente)" -ForegroundColor Yellow
    }
} finally {
    Pop-Location
}

Write-Host "`n=== ALL TESTS PASSED ===" -ForegroundColor Green
Write-Host "`nResumen:`n  Test 1 (StandardQuery): PASS`n  Test 2 (NonStandardQuery): PASS`n  Test 3 (Logs): PASS`n"

