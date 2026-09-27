import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

doc = docx.Document()

# Styles
normal_style = doc.styles['Normal']
normal_style.font.name = 'Calibri'
normal_style.font.size = Pt(11)
normal_style.font.color.rgb = RGBColor(0x22, 0x22, 0x22)

# Title Page / Header
title = doc.add_heading('SISTEMA DE ADMINISTRACIÓN DNS INTELIGENTE, INTERCEPTOR UDP Y MOTOR DE CONSENSO', level=0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
for r in title.runs:
    r.font.size = Pt(20)
    r.font.bold = True
    r.font.color.rgb = RGBColor(0x00, 0x33, 0x66)

subtitle = doc.add_paragraph('MANUAL DE USUARIO Y GUÍA DE VERIFICACIÓN DE EVIDENCIAS (T-33 A T-40)')
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
for r in subtitle.runs:
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
meta.add_run('Curso: IC-7602 — Redes de Computadoras y Sistemas Distribuidos\n').bold = True
meta.add_run('Integrante: Alexandra De Gracia\n').bold = True
meta.add_run('Fecha: 27 de Septiembre de 2026\n')

doc.add_page_break()

def add_h1(text):
    h = doc.add_heading(text, level=1)
    for r in h.runs:
        r.font.size = Pt(16)
        r.font.color.rgb = RGBColor(0x00, 0x33, 0x66)
    return h

def add_h2(text):
    h = doc.add_heading(text, level=2)
    for r in h.runs:
        r.font.size = Pt(13)
        r.font.color.rgb = RGBColor(0x00, 0x66, 0x99)
    return h

def add_placeholder(captura_id, descripcion, figura_txt):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_box = p.add_run(f'[{captura_id}]\n')
    run_box.bold = True
    run_box.font.color.rgb = RGBColor(0xCC, 0x00, 0x00)
    run_box.font.size = Pt(12)
    
    p_desc = doc.add_paragraph()
    p_desc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_desc = p_desc.add_run(f'Esta captura demuestra: {descripcion}\n')
    r_desc.italic = True
    r_desc.font.size = Pt(10)
    
    r_fig = p_desc.add_run(f'{figura_txt}')
    r_fig.bold = True
    r_fig.font.size = Pt(10.5)

# 1. INTRODUCCION
add_h1('1. INTRODUCCIÓN')
doc.add_paragraph('Este documento constituye el Manual de Usuario y Guía de Verificación Práctica para las tareas T-33 a T-40 del proyecto. El sistema integra un servidor DNS Interceptor de alto rendimiento desarrollado en Rust, una API REST de gestión en Java (Javalin), una arquitectura de datos geodistribuida sobre Supabase, tres Health Checkers autónomos programados en GNU C (San José, Nueva York y Frankfurt) y una interfaz gráfica web de administración construida en React con Vite y servida mediante Nginx.')

# 2. REQUISITOS
add_h1('2. REQUISITOS DEL SISTEMA')
doc.add_paragraph('Para desplegar y operar la plataforma se requiere:')
doc.add_paragraph('• Motor de Contenedores: Docker Engine v24.0+ o superior.\n• Orquestador Local: Docker Compose v2.20+ o superior.\n• Navegador Web: Google Chrome, Mozilla Firefox o Microsoft Edge.\n• Herramientas de Red: nslookup, dig o curl.\n• Herramientas de Kubernetes (Opcional): Helm v3.0+ y kubectl.')

# 3. INICIO DEL SISTEMA
add_h1('3. INICIO DEL SISTEMA')
add_h2('3.1 Preparación de Variables de Entorno')
doc.add_paragraph('Cpie la plantilla de variables de entorno y configure las llaves de Supabase:\ncp dns-api/.env.example dns-api/.env')
add_h2('3.2 Despliegue con Docker Compose')
doc.add_paragraph('Ejecute el siguiente comando en la raíz del repositorio para levantar los 6 contenedores:\ndocker compose up -d --build\n\nVerifique el estado con:\ndocker compose ps')

# 4. ACCESO A LA UI
add_h1('4. ACCESO A LA INTERFAZ WEB (UI)')
doc.add_paragraph('Abra el navegador en: http://localhost (Puerto 80 TCP).\nAPI REST Health Endpoint: http://localhost:8080/api/health')
add_placeholder('INSERTAR CAPTURA T33-01 AQUÍ', 'La pantalla principal del dashboard web de administración cargando la lista de registros DNS activos.', 'Figura T33-01. Interfaz principal de la aplicación web.')

# 5. GESTION REGISTROS DNS
add_h1('5. GESTIÓN DE REGISTROS DNS (T-34)')
doc.add_paragraph('La interfaz permite administrar registros DNS soportando cinco estrategias de resolución distintas:')

add_h2('5.1 Registro Tipo SINGLE')
add_placeholder('INSERTAR CAPTURA T34-01 AQUÍ', 'El formulario/modal de creación de un registro DNS de tipo Single.', 'Figura T34-01. Configuración de registro tipo Single.')

add_h2('5.2 Registro Tipo MULTI')
add_placeholder('INSERTAR CAPTURA T34-02 AQUÍ', 'La visualización y edición de un registro tipo Multi con múltiples IPs objetivo configuradas.', 'Figura T34-02. Registro DNS con múltiples destinos (Multi).')

add_h2('5.3 Registro Tipo WEIGHT (Ponderado)')
add_placeholder('INSERTAR CAPTURA T34-03 AQUÍ', 'La asignación de pesos numéricos (ej. 80/20) para balanceo de carga ponderado.', 'Figura T34-03. Registro DNS con balanceo por peso (Weight).')

add_h2('5.4 Registro Tipo ROUND-TRIP (Basado en RTT)')
add_placeholder('INSERTAR CAPTURA T34-04 AQUÍ', 'Un registro DNS enrutado automáticamente por la latencia RTT calculada por el consenso de los Health Checkers.', 'Figura T34-04. Registro DNS enrutado por Round-Trip Time.')

add_h2('5.5 Registro Tipo GEO (Geolocalizado)')
add_placeholder('INSERTAR CAPTURA T34-05 AQUÍ', 'La configuración de mapeo de respuesta según el código ISO de país del cliente.', 'Figura T34-05. Registro DNS con selección geográfica (Geo).')

# 6. HEALTH CHECKS
add_h1('6. CONFIGURACIÓN DE HEALTH CHECKS (T-35)')
doc.add_paragraph('El motor en C ejecuta pruebas activas para verificar la disponibilidad de las IPs en protocolos TCP y HTTP.')
add_placeholder('INSERTAR CAPTURA T35-01 AQUÍ', 'Formulario de configuración para una prueba de monitoreo de salud TCP.', 'Figura T35-01. Configuración de Health Check TCP.')
add_placeholder('INSERTAR CAPTURA T35-02 AQUÍ', 'Formulario de configuración de prueba de salud HTTP con validación de códigos de estado.', 'Figura T35-02. Configuración de Health Check HTTP.')

# 7. IP TO COUNTRY
add_h1('7. GESTIÓN DE IP-TO-COUNTRY (T-36)')
add_placeholder('INSERTAR CAPTURA T36-01 AQUÍ', 'La tabla de administración de rangos IP-a-País registrados en Supabase.', 'Figura T36-01. Listado de mapeos de IP a País.')
add_placeholder('INSERTAR CAPTURA T36-02 AQUÍ', 'Formulario de creación/modificación de una asignación IP-to-Country.', 'Figura T36-02. Registro de nuevo rango geográfico.')

# 8. CONTENERIZACION UI
add_h1('8. CONTENERIZACIÓN DE LA UI (T-37)')
doc.add_paragraph('La interfaz React se encuentra contenerizada independientemente en dns-ui/Dockerfile utilizando una construcción de dos etapas (Node.js para compilación Vite + Nginx Alpine para servir archivos estáticos).')
add_placeholder('INSERTAR CAPTURA T37-01 AQUÍ', 'Proceso de construcción de la imagen Docker de la interfaz web (dns-ui).', 'Figura T37-01. Build de la imagen Docker dns-ui.')
add_placeholder('INSERTAR CAPTURA T37-02 AQUÍ', 'Salida de docker compose ps confirmando la ejecución del contenedor dns-ui en el puerto 80 TCP.', 'Figura T37-02. Contenedor dns-ui activo.')
add_placeholder('INSERTAR CAPTURA T37-03 AQUÍ', 'Acceso exitoso a la aplicación React servida por el contenedor Nginx en http://localhost.', 'Figura T37-03. Aplicación web cargada desde el contenedor.')

# 9. ORQUESTACION
add_h1('9. ORQUESTACIÓN DEL STACK CON DOCKER COMPOSE Y HELM (T-38)')
doc.add_paragraph('El sistema se orquesta localmente con Docker Compose y se encuentra preparado para clústeres mediante Helm Charts (helm/dns-stack).')
add_placeholder('INSERTAR CAPTURA T38-01 AQUÍ', 'Los 6 contenedores del stack (dns-api, dns-interceptor, checker-cr, checker-us, checker-eu, dns-ui) ejecutándose simultáneamente.', 'Figura T38-01. Orquestación del stack completo en Docker Compose.')
add_placeholder('INSERTAR CAPTURA T38-02 AQUÍ', 'Ejecución limpia de helm lint y helm template dentro del contenedor Docker alpine/helm (0 errores).', 'Figura T38-02. Validaciones estáticas de Helm Charts.')
doc.add_paragraph('Nota sobre Kubernetes: El Helm Chart se encuentra 100% validado y renderizado estáticamente. El despliegue sobre un clúster vivo de Kubernetes se encuentra clasificado como NO VALIDADO EN EJECUCIÓN debido a la ausencia de un clúster activo en el entorno local.')

# 10. VARIABLES
add_h1('10. CONFIGURACIÓN POR VARIABLES (T-39)')
doc.add_paragraph('Todos los componentes leen su configuración mediante variables de entorno inyectadas por el orquestador (dns-api/.env, ConfigMap y Secret). Ningún archivo contiene valores o credenciales quemadas en código fuente.')
add_placeholder('INSERTAR CAPTURA T39-01 AQUÍ', 'Inyección segura de variables de entorno mediante dns-api/.env.example y manifiestos de Kubernetes (ConfigMap y Secret).', 'Figura T39-01. Estructura de configuración por variables de entorno.')
doc.add_paragraph('⚠️ Advertencia de Seguridad: NO CAPTURAR ESTA INFORMACIÓN SIN OCULTAR O CENSURAR EL SECRETO SUPABASE_SERVICE_ROLE_KEY.')

# 11. END TO END
add_h1('11. PRUEBA END-TO-END Y RESOLV.CONF (T-40)')
add_h2('11.1 Flujo End-to-End')
doc.add_paragraph('1. El cliente envía una petición DNS UDP al puerto 53 de dns-interceptor.\n2. El Interceptor consulta a dns-api (/api/exists y /api/dns_resolver).\n3. dns-api consulta Supabase para evaluar dominios, pesos, consensos de latencia y países.\n4. Si el dominio existe, responde con la IP óptima calculada.\n5. Si el dominio NO existe, dns-api realiza un fallback transparente consultando al servidor DNS remoto 8.8.8.8:53 y retorna la respuesta original al cliente.')
add_placeholder('INSERTAR CAPTURA T40-01 AQUÍ', 'Resolución de un dominio existente mediante nslookup apuntando al Interceptor.', 'Figura T40-01. Resolución exitosa de dominio registrado.')
add_placeholder('INSERTAR CAPTURA T40-02 AQUÍ', 'Fallback automático de resolución hacia 8.8.8.8 al consultar un dominio inexistente.', 'Figura T40-02. Fallback DNS a servidor remoto 8.8.8.8.')
add_placeholder('INSERTAR CAPTURA T40-03 AQUÍ', 'Logs de telemetría de los 3 Health Checkers en C enviando latidos y votos RTT a Supabase.', 'Figura T40-03. Telemetría y consenso de Health Checkers.')

add_h2('11.2 Explicación de la Prueba con resolv.conf')
doc.add_paragraph('• Qué se cambia: Se modifica la directiva nameserver del archivo /etc/resolv.conf para apuntar a la IP donde escucha dns-interceptor (127.0.0.1 o IP de la red Docker).\n• Por qué: Para interceptar automáticamente todas las peticiones DNS enviadas de forma nativa por el sistema operativo.\n• Cómo se comprueba: Ejecutando nslookup demo.company.com sin especificar la IP del servidor objetivo explícitamente.\n• Cómo se revierte: Restaurando el nameserver previo en /etc/resolv.conf.\n• Prueba aislada recomendada: Se recomienda ejecutar la prueba dentro de un contenedor ejecutable:\ndocker run --rm --net=dns_stack_network alpine nslookup demo.company.com dns-interceptor')

# 12. SOLUCION DE PROBLEMAS
add_h1('12. SOLUCIÓN DE PROBLEMAS HABITUALES')
doc.add_paragraph('• dns-api falla al arrancar: Verifique que SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estén definidas en dns-api/.env.\n• Interceptor no responde en puerto 53: Verifique que no haya otro servicio local ocupando el puerto 53 UDP.\n• UI muestra error de red: Verifique la conectividad del API con docker compose logs dns-api.')

# 13. DETENER
add_h1('13. DETENER EL SISTEMA')
doc.add_paragraph('Para detener los servicios y remover la red del proyecto:\ndocker compose down')

# 14. TABLA EVIDENCIAS
add_h1('14. TABLA FINAL DE EVIDENCIAS Y CAPTURAS REQUERIDAS')
table = doc.add_table(rows=1, cols=5)
table.alignment = WD_TABLE_ALIGNMENT.CENTER
hdr_cells = table.rows[0].cells
headers = ['ID Captura', 'Tarea', 'Evidencia Demostrada', 'Archivo Recomendado', 'Estado']
for i, h in enumerate(headers):
    hdr_cells[i].text = h
    set_cell_background(hdr_cells[i], '003366')
    hdr_cells[i].paragraphs[0].runs[0].font.bold = True
    hdr_cells[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

evidencias = [
    ('T33-01', 'T-33', 'UI Principal y consumo de DNS API', 'T33-01-ui-principal.png', 'PASS'),
    ('T33-02', 'T-33', 'Navegación entre vistas web', 'T33-02-ui-navegacion.png', 'PASS'),
    ('T34-01', 'T-34', 'Creación de Registro Single', 'T34-01-registro-single.png', 'PASS'),
    ('T34-02', 'T-34', 'Registro Multi con failover', 'T34-02-registro-multi.png', 'PASS'),
    ('T34-03', 'T-34', 'Registro Weight (Ponderado)', 'T34-03-registro-weight.png', 'PASS'),
    ('T34-04', 'T-34', 'Registro Round-Trip (RTT)', 'T34-04-registro-roundtrip.png', 'PASS'),
    ('T34-05', 'T-34', 'Registro Geo (Geolocalizado)', 'T34-05-registro-geo.png', 'PASS'),
    ('T35-01', 'T-35', 'Configuración Health Check TCP', 'T35-01-healthcheck-tcp.png', 'PASS'),
    ('T35-02', 'T-35', 'Configuración Health Check HTTP', 'T35-02-healthcheck-http.png', 'PASS'),
    ('T36-01', 'T-36', 'Listado IP-to-Country', 'T36-01-ip-country-lista.png', 'PASS'),
    ('T36-02', 'T-36', 'Modal / Formulario IP-to-Country', 'T36-02-ip-country-modal.png', 'PASS'),
    ('T37-01', 'T-37', 'Build de Dockerfile de la UI', 'T37-01-dockerfile-build.png', 'PASS'),
    ('T37-02', 'T-37', 'Contenedor dns-ui activo en puerto 80', 'T37-02-docker-container-running.png', 'PASS'),
    ('T37-03', 'T-37', 'UI web funcionando en contenedor Nginx', 'T37-03-ui-container-browser.png', 'PASS'),
    ('T38-01', 'T-38', 'Stack de 6 contenedores Docker Compose', 'T38-01-docker-compose-stack.png', 'PASS'),
    ('T38-02', 'T-38', 'Pruebas Helm lint y template en Docker', 'T38-02-helm-lint-template.png', 'PASS'),
    ('T39-01', 'T-39', 'Configuración por variables (sin secrets)', 'T39-01-variables-entorno.png', 'PASS'),
    ('T40-01', 'T-40', 'Respuesta DNS exitosa de Interceptor', 'T40-01-dns-resolution-success.png', 'PASS'),
    ('T40-02', 'T-40', 'Fallback DNS exitoso a 8.8.8.8', 'T40-02-dns-fallback.png', 'PASS'),
    ('T40-03', 'T-40', 'Telemetría y votos de Health Checkers', 'T40-03-health-checkers-telemetry.png', 'PASS'),
]

for row_idx, ev in enumerate(evidencias):
    row_cells = table.add_row().cells
    bg_color = 'F2F2F2' if row_idx % 2 == 1 else 'FFFFFF'
    for c_idx, val in enumerate(ev):
        row_cells[c_idx].text = val
        set_cell_background(row_cells[c_idx], bg_color)

doc.save('c:/Users/Asus/2026-02-2023029575-IC7602-P1/docs/Manual_de_Usuario_T33-T40.docx')
print('DOCX generated successfully at docs/Manual_de_Usuario_T33-T40.docx')
