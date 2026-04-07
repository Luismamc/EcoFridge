from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, ListFlowable, ListItem
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.lib.units import cm, inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
import os

# Register fonts
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
pdfmetrics.registerFont(TTFont('Calibri', '/usr/share/fonts/truetype/english/calibri-regular.ttf'))
pdfmetrics.registerFont(TTFont('SimHei', '/usr/share/fonts/truetype/chinese/SimHei.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')
registerFontFamily('Calibri', normal='Calibri', bold='Calibri')
registerFontFamily('SimHei', normal='SimHei', bold='SimHei')

pdf_filename = "EcoFridge_Guia_Publicacion_Apps_Nativas.pdf"
title_for_meta = os.path.splitext(pdf_filename)[0]

doc = SimpleDocTemplate(
    os.path.join('/home/z/my-project/download', pdf_filename),
    pagesize=A4,
    title=title_for_meta,
    author='Z.ai',
    creator='Z.ai',
    subject='Guia completa para publicar EcoFridge en Google Play y App Store',
    leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm,
)

# Styles
styles = getSampleStyleSheet()
cover_title = ParagraphStyle('CoverTitle', fontName='Times New Roman', fontSize=36, leading=44, alignment=TA_CENTER, spaceAfter=20, textColor=colors.HexColor('#16a34a'))
cover_sub = ParagraphStyle('CoverSub', fontName='Times New Roman', fontSize=18, leading=26, alignment=TA_CENTER, spaceAfter=12, textColor=colors.HexColor('#333333'))
cover_info = ParagraphStyle('CoverInfo', fontName='Times New Roman', fontSize=13, leading=20, alignment=TA_CENTER, spaceAfter=8, textColor=colors.HexColor('#666666'))
h1 = ParagraphStyle('H1', fontName='Times New Roman', fontSize=22, leading=28, spaceBefore=18, spaceAfter=12, textColor=colors.HexColor('#16a34a'))
h2 = ParagraphStyle('H2', fontName='Times New Roman', fontSize=16, leading=22, spaceBefore=14, spaceAfter=8, textColor=colors.HexColor('#1F4E79'))
h3 = ParagraphStyle('H3', fontName='Times New Roman', fontSize=13, leading=18, spaceBefore=10, spaceAfter=6, textColor=colors.HexColor('#333333'))
body = ParagraphStyle('Body', fontName='Times New Roman', fontSize=11, leading=17, alignment=TA_JUSTIFY, spaceAfter=8)
code = ParagraphStyle('Code', fontName='DejaVuSans', fontSize=9, leading=14, alignment=TA_LEFT, spaceAfter=4, backColor=colors.HexColor('#f5f5f5'), leftIndent=12, rightIndent=12, borderPadding=6)
bullet_style = ParagraphStyle('Bullet', fontName='Times New Roman', fontSize=11, leading=17, alignment=TA_LEFT, spaceAfter=4, leftIndent=24, bulletIndent=12)
warn_style = ParagraphStyle('Warn', fontName='Times New Roman', fontSize=10, leading=15, alignment=TA_LEFT, spaceAfter=6, backColor=colors.HexColor('#FFF3CD'), leftIndent=8, rightIndent=8, borderPadding=8, textColor=colors.HexColor('#856404'))
info_style = ParagraphStyle('Info', fontName='Times New Roman', fontSize=10, leading=15, alignment=TA_LEFT, spaceAfter=6, backColor=colors.HexColor('#D1ECF1'), leftIndent=8, rightIndent=8, borderPadding=8, textColor=colors.HexColor('#0C5460'))

header_style = ParagraphStyle('TH', fontName='Times New Roman', fontSize=10, textColor=colors.white, alignment=TA_CENTER)
cell_style = ParagraphStyle('TC', fontName='Times New Roman', fontSize=10, textColor=colors.black, alignment=TA_CENTER)
cell_style_left = ParagraphStyle('TCL', fontName='Times New Roman', fontSize=10, textColor=colors.black, alignment=TA_LEFT)

story = []

# ===== COVER PAGE =====
story.append(Spacer(1, 120))
story.append(Paragraph('<b>EcoFridge</b>', cover_title))
story.append(Spacer(1, 16))
story.append(Paragraph('Guia Completa para Publicar en', cover_sub))
story.append(Paragraph('Google Play y App Store', cover_sub))
story.append(Spacer(1, 40))
story.append(Paragraph('Desde el desarrollo web hasta la publicacion nativa', cover_info))
story.append(Paragraph('con Capacitor', cover_info))
story.append(Spacer(1, 60))
story.append(Paragraph('Version 1.0 - Abril 2026', cover_info))
story.append(PageBreak())

# ===== TABLE OF CONTENTS =====
story.append(Paragraph('<b>Contenido</b>', h1))
story.append(Spacer(1, 12))

toc_items = [
    ('1.', 'Arquitectura de la Solucion'),
    ('2.', 'Requisitos Previos'),
    ('3.', 'Despliegue del Backend (Vercel)'),
    ('4.', 'Configurar el Proyecto Capacitor'),
    ('5.', 'Compilar para Android'),
    ('6.', 'Compilar para iOS'),
    ('7.', 'Publicar en Google Play Store'),
    ('8.', 'Publicar en Apple App Store'),
    ('9.', 'Comandos de Referencia Rapida'),
    ('10.', 'Solucion de Problemas Comunes'),
]
for num, title in toc_items:
    story.append(Paragraph(f'<b>{num}</b> {title}', body))
story.append(Spacer(1, 18))

# ===== SECTION 1: ARCHITECTURE =====
story.append(Paragraph('<b>1. Arquitectura de la Solucion</b>', h1))
story.append(Paragraph('EcoFridge utiliza una arquitectura hibrida que combina lo mejor del desarrollo web y nativo. La aplicacion web Next.js se despliega en un servidor en la nube, y Capacitor crea una envoltura nativa que la carga en un WebView optimizado para cada plataforma. Esta estrategia ofrece multiples ventajas significativas tanto para el desarrollo como para el mantenimiento a largo plazo de la aplicacion.', body))
story.append(Spacer(1, 8))

arch_data = [
    [Paragraph('<b>Componente</b>', header_style), Paragraph('<b>Tecnologia</b>', header_style), Paragraph('<b>Funcion</b>', header_style)],
    [Paragraph('Frontend', cell_style), Paragraph('React + Next.js', cell_style), Paragraph('Interfaz de usuario completa', cell_style_left)],
    [Paragraph('Backend API', cell_style), Paragraph('Next.js API Routes', cell_style), Paragraph('Logica de negocio y base de datos', cell_style_left)],
    [Paragraph('Base de Datos', cell_style), Paragraph('SQLite + Prisma', cell_style), Paragraph('Persistencia de datos', cell_style_left)],
    [Paragraph('IA', cell_style), Paragraph('z-ai-web-dev-sdk', cell_style), Paragraph('Recetas y escaneo de tickets', cell_style_left)],
    [Paragraph('Envoltura Nativa', cell_style), Paragraph('Capacitor 8', cell_style), Paragraph('Acceso a APIs nativas', cell_style_left)],
    [Paragraph('Hosting', cell_style), Paragraph('Vercel (gratis)', cell_style), Paragraph('Servidor de produccion', cell_style_left)],
]
arch_table = Table(arch_data, colWidths=[3*cm, 4*cm, 9.5*cm])
arch_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 5), (-1, 5), colors.white),
    ('BACKGROUND', (0, 6), (-1, 6), colors.HexColor('#F5F5F5')),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(Spacer(1, 12))
story.append(arch_table)
story.append(Spacer(1, 18))

story.append(Paragraph('<b>1.1 Ventajas de este enfoque</b>', h2))
story.append(Paragraph('La principal ventaja de esta arquitectura es que mantiene un unico codigo fuente para todas las plataformas (web, Android e iOS). Cualquier cambio en la interfaz, funcionalidad o logica de negocio se refleja automaticamente en todas las plataformas con un unico despliegue. Esto reduce drasticamente los costes de mantenimiento y permite iteraciones rapidas. Ademas, el uso de Capacitor proporciona acceso a funcionalidades nativas del dispositivo como la camara, el estado de la red, la barra de estado, y la vibracion haptica, todo ello desde JavaScript sin necesidad de escribir codigo nativo para cada plataforma.', body))
story.append(Paragraph('Otra ventaja importante es que la app web completa sigue funcionando en navegadores, lo que significa que los usuarios pueden acceder a EcoFridge desde cualquier dispositivo sin necesidad de instalar nada. La version nativa simplemente anade la experiencia de app instalada, con acceso a las tiendas de aplicaciones, notificaciones push nativas y un icono en la pantalla de inicio del dispositivo.', body))

# ===== SECTION 2: REQUIREMENTS =====
story.append(Spacer(1, 24))
story.append(Paragraph('<b>2. Requisitos Previos</b>', h1))

story.append(Paragraph('<b>2.1 Requisitos generales (ambas plataformas)</b>', h2))
reqs = [
    'Node.js 18 o superior instalado en tu equipo',
    'Una cuenta de GitHub (recomendado para control de versiones)',
    'La base del codigo de EcoFridge (ya configurada con Capacitor)',
    'Conexión a internet estable',
    'El proyecto desplegado en un servidor (Vercel recomendado)',
]
for r in reqs:
    story.append(Paragraph(f'- {r}', bullet_style))

story.append(Paragraph('<b>2.2 Requisitos para Android</b>', h2))
android_reqs = [
    'Android Studio (version mas reciente, descarga gratuita desde developer.android.com)',
    'Java Development Kit (JDK) 17 o superior',
    'Android SDK con API nivel 22 o superior',
    'Un dispositivo Android fisico o emulador para pruebas',
    'Cuenta de Google Play Console ($25 USD pago unico, de por vida)',
]
for r in android_reqs:
    story.append(Paragraph(f'- {r}', bullet_style))

story.append(Paragraph('<b>2.3 Requisitos para iOS</b>', h2))
ios_reqs = [
    'MacOS (obligatorio, no se puede compilar iOS desde Windows o Linux)',
    'Xcode 15 o superior (descarga gratuita desde Mac App Store)',
    'Cocoapods instalado (sudo gem install cocoapods)',
    'Un iPhone o iPad fisico para pruebas reales',
    'Cuenta de Apple Developer ($99 USD al año)',
]
for r in ios_reqs:
    story.append(Paragraph(f'- {r}', bullet_style))

story.append(Spacer(1, 8))
story.append(Paragraph('<b>IMPORTANTE:</b> Para publicar en la App Store de Apple es obligatorio tener un Mac. Si no dispones de uno, puedes considerar servicios de compilacion en la nube como Codemagic, Bitrise o MacStadium, aunque esto tiene un coste adicional mensual.', warn_style))

# ===== SECTION 3: DEPLOY =====
story.append(Spacer(1, 24))
story.append(Paragraph('<b>3. Despliegue del Backend en Vercel</b>', h1))
story.append(Paragraph('Antes de compilar las apps nativas, necesitas desplegar tu aplicacion web en un servidor accesible desde internet. Vercel es la opcion mas sencilla y gratuita para aplicaciones Next.js. A continuacion se describen los pasos detallados para completar el despliegue.', body))

story.append(Paragraph('<b>3.1 Preparar el repositorio</b>', h2))
story.append(Paragraph('Primero, sube tu proyecto a un repositorio de GitHub. Asegurate de que el archivo .env con la URL de la base de datos esta configurado como variable de entorno en Vercel, no como archivo en el repositorio. El archivo DATABASE_URL debe apuntar a una base de datos SQLite compatible, o mejor aun, migrar a PostgreSQL para produccion usando el plan gratuito de Supabase o Neon.', body))

story.append(Paragraph('<b>3.2 Desplegar en Vercel</b>', h2))
steps = [
    'Ve a vercel.com e inicia sesion con tu cuenta de GitHub',
    'Haz clic en "Add New Project" (Nuevo Proyecto)',
    'Selecciona el repositorio de EcoFridge de tu lista de GitHub',
    'Configura las variables de entorno necesarias (DATABASE_URL, etc.)',
    'Haz clic en "Deploy" y espera a que finalice el despliegue',
    'Copia la URL generada (ejemplo: https://ecofridge-xxx.vercel.app)',
]
for i, s in enumerate(steps):
    story.append(Paragraph(f'<b>{i+1}.</b> {s}', bullet_style))

story.append(Paragraph('<b>3.3 Configurar la URL en Capacitor</b>', h2))
story.append(Paragraph('Una vez tengas la URL de despliegue, abre el archivo capacitor.config.ts y descomenta la linea server.url, reemplazando con tu URL real:', body))
story.append(Spacer(1, 6))
story.append(Paragraph('server: {<br/>  url: "https://ecofridge-tu-app.vercel.app",<br/>  androidScheme: "https",<br/>  allowNavigation: ["*"],<br/>},', code))

# ===== SECTION 4: CAPACITOR CONFIG =====
story.append(Spacer(1, 24))
story.append(Paragraph('<b>4. Configurar el Proyecto Capacitor</b>', h1))
story.append(Paragraph('El proyecto EcoFridge ya tiene Capacitor configurado. Sin embargo, es importante verificar que todo esta correctamente sincronizado antes de compilar. Sigue estos pasos para asegurar que la configuracion es correcta.', body))

story.append(Paragraph('<b>4.1 Verificar la estructura del proyecto</b>', h2))
story.append(Paragraph('El proyecto debe tener estas carpetas clave: android/ (proyecto nativo de Android), ios/ (proyecto nativo de iOS), capacitor.config.ts (configuracion), y public/ (archivos web estaticos). Si alguna de estas carpetas no existe, ejecuta los comandos correspondientes de inicializacion.', body))

story.append(Paragraph('<b>4.2 Sincronizar los proyectos nativos</b>', h2))
story.append(Paragraph('Despues de cualquier cambio en el codigo web o en la configuracion de Capacitor, debes sincronizar los proyectos nativos. Esto copia los archivos web actualizados y actualiza los plugins nativos en los proyectos de Android e iOS.', body))
story.append(Spacer(1, 6))
story.append(Paragraph('# Sincronizar ambas plataformas<br/>npm run mobile:sync<br/><br/># O sincronizar solo una plataforma<br/>npx cap sync android<br/>npx cap sync ios', code))

# ===== SECTION 5: ANDROID =====
story.append(Spacer(1, 24))
story.append(Paragraph('<b>5. Compilar para Android</b>', h1))
story.append(Paragraph('La compilacion para Android genera un archivo APK (para instalacion directa) o AAB (para subir a Google Play). El proceso requiere Android Studio, que es la herramienta oficial de desarrollo de Google para la plataforma Android. A continuacion se detallan todos los pasos necesarios.', body))

story.append(Paragraph('<b>5.1 Compilar desde Android Studio (recomendado)</b>', h2))
steps = [
    'Abre el proyecto nativo de Android: ejecuta npm run mobile:android en tu terminal',
    'Android Studio se abrira con el proyecto android/ cargado',
    'Espera a que Gradle termine de sincronizar (puede tardar varios minutos la primera vez)',
    'Ve a Build > Build Bundle(s) / APK(s) > Build APK(s) para pruebas',
    'O ve a Build > Generate Signed Bundle / APK para produccion',
    'El archivo APK se generara en android/app/build/outputs/apk/debug/',
    'O el AAB se generara en android/app/build/outputs/bundle/release/',
]
for i, s in enumerate(steps):
    story.append(Paragraph(f'<b>{i+1}.</b> {s}', bullet_style))

story.append(Paragraph('<b>5.2 Compilar desde linea de comandos</b>', h2))
story.append(Paragraph('Si prefieres usar la terminal, puedes compilar directamente con Gradle. El comando para debug genera un APK firmado con la clave de debug, mientras que el de release genera un AAB listo para produccion.', body))
story.append(Spacer(1, 6))
story.append(Paragraph('# Compilar APK de debug (para pruebas)<br/>npm run mobile:android:build<br/><br/># Compilar AAB de release (para Google Play)<br/>npm run mobile:android:aab', code))

story.append(Paragraph('<b>5.3 Configurar firma para release</b>', h2))
story.append(Paragraph('Para publicar en Google Play necesitas firmar tu app con una clave criptografica. Genera un keystore con el siguiente comando de keytool (incluido con Java):', body))
story.append(Spacer(1, 6))
story.append(Paragraph("keytool -genkeypair -v -storetype PKCS12 \<br/>  -keystore ecofridge-release.keystore \<br/>  -alias ecofridge -keyalg RSA -keysize 2048 \<br/>  -validity 10000", code))
story.append(Paragraph('Luego configura las variables de entorno en tu archivo .env:', body))
story.append(Spacer(1, 6))
story.append(Paragraph('ANDROID_KEYSTORE_PATH=/ruta/a/ecofridge-release.keystore<br/>ANDROID_KEYSTORE_ALIAS=ecofridge<br/>ANDROID_KEYSTORE_PASSWORD=tu_password', code))

# ===== SECTION 6: iOS =====
story.append(Spacer(1, 24))
story.append(Paragraph('<b>6. Compilar para iOS</b>', h1))
story.append(Paragraph('La compilacion para iOS requiere un Mac con Xcode instalado. Es un requisito estricto de Apple que no se puede saltar. Si no tienes un Mac, consulta la seccion de alternativas al final de este documento.', body))

story.append(Paragraph('<b>6.1 Compilar desde Xcode</b>', h2))
steps = [
    'Abre el proyecto nativo de iOS: ejecuta npm run mobile:ios en tu terminal',
    'Xcode se abrira con el proyecto ios/App/App.xcworkspace cargado',
    'Selecciona tu equipo de desarrollo o un dispositivo conectado en la barra superior',
    'Ve a Signing & Capabilities y selecciona tu Team de desarrollador',
    'Si usas Apple Developer gratuito, selecciona "Personal Team"',
    'Ve a Product > Build (o presiona Cmd+B) para compilar',
    'Ve a Product > Archive para crear el paquete de distribucion',
    'El archivo IPA se genera automaticamente tras el archive',
]
for i, s in enumerate(steps):
    story.append(Paragraph(f'<b>{i+1}.</b> {s}', bullet_style))

story.append(Paragraph('<b>6.2 Probar en un dispositivo fisico</b>', h2))
story.append(Paragraph('Para probar en tu iPhone o iPad fisico, necesitas activar el modo desarrollador: ve a Ajustes > Privacidad y Seguridad > Modo Desarrollador en tu dispositivo iOS. Tambien necesitas configurar un perfil de aprovisionamiento en Xcode: selecciona tu dispositivo como destino, ve a Signing & Capabilities, y Xcode te guiara para crear un perfil gratuito si eres un desarrollador individual registrado.', body))

# ===== SECTION 7: GOOGLE PLAY =====
story.append(Spacer(1, 24))
story.append(Paragraph('<b>7. Publicar en Google Play Store</b>', h1))
story.append(Paragraph('La publicacion en Google Play Store requiere una cuenta de desarrollador de Google. El proceso de registro tiene un costo unico de $25 USD y es valido de por vida. Una vez registrada tu cuenta, sigue estos pasos detallados para publicar tu aplicacion.', body))

story.append(Paragraph('<b>7.1 Crear cuenta de Google Play Console</b>', h2))
steps = [
    'Ve a play.google.com/console y注册ate como desarrollador',
    'Completa el registro y paga la tarifa de $25 USD (pago unico)',
    'Verifica tu identidad con un documento de identidad',
    'Espera la aprobacion (generalmente 24-48 horas)',
]
for i, s in enumerate(steps):
    story.append(Paragraph(f'<b>{i+1}.</b> {s}', bullet_style))

story.append(Paragraph('<b>7.2 Crear la ficha de la aplicacion</b>', h2))
story.append(Paragraph('Una vez aprobada tu cuenta, crea una nueva aplicacion en la consola. Necesitaras preparar los siguientes elementos antes de completar la ficha:', body))

ficha_items = [
    ['Nombre de la app', 'EcoFridge'],
    ['Descripcion corta', 'Max 80 caracteres'],
    ['Descripcion completa', 'Max 4000 caracteres con keywords'],
    ['Categoria', 'Alimentos y Bebidas / Estilo de vida'],
    ['Icono', '512x512px PNG (ya generado)'],
    ['Capturas de pantalla', 'Min 2, max 8, formato 16:9'],
    ['Firma del desarrollador', 'Nombre legal o seudonimo'],
    ['Politicad de privacidad', 'URL obligatoria'],
    ['Clasificacion de contenido', 'Cuestionario obligatorio'],
]
ficha_data = [
    [Paragraph('<b>Elemento</b>', header_style), Paragraph('<b>Detalle</b>', header_style)],
]
for item, detail in ficha_items:
    ficha_data.append([Paragraph(item, cell_style_left), Paragraph(detail, cell_style_left)])
ficha_table = Table(ficha_data, colWidths=[5.5*cm, 11*cm])
ficha_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    *[('BACKGROUND', (0, i), (-1, i), colors.white if i % 2 == 1 else colors.HexColor('#F5F5F5')) for i in range(1, len(ficha_data))],
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(Spacer(1, 8))
story.append(ficha_table)
story.append(Spacer(1, 12))

story.append(Paragraph('<b>7.3 Subir el AAB</b>', h2))
story.append(Paragraph('Ve a Produccion > Crear nueva version. Sube el archivo .aab generado en la seccion 5. Completa la informacion de la version (numero de version, notas de la version) y envia a revision. El proceso de revision de Google suele tardar entre 3 y 7 dias laborables para la primera version. Las actualizaciones posteriores suelen ser mas rapidas, a menudo menos de 24 horas.', body))

story.append(Paragraph('<b>7.4 Tiempos de revision de Google Play</b>', h2))
story.append(Paragraph('Google ha mejorado significativamente sus tiempos de revision en los ultimos anos. Para la primera publicacion, el tiempo medio es de 3 a 7 dias laborables. Para actualizaciones de aplicaciones ya publicadas, el tiempo se reduce a menudo a menos de 24 horas. Si tu aplicacion es rechazada, Google proporcionara un informe detallado con los motivos y pasos para corregir los problemas. Los motivos mas comunes de rechazo son: capturas de pantalla de baja calidad, descripcion insuficiente, o problemas de permisos excesivos.', body))

# ===== SECTION 8: APP STORE =====
story.append(Spacer(1, 24))
story.append(Paragraph('<b>8. Publicar en Apple App Store</b>', h1))
story.append(Paragraph('La publicacion en Apple App Store tiene requisitos mas estrictos que Google Play. Necesitas una cuenta de desarrollador de Apple con suscripcion anual de $99 USD. Ademas, Apple revisa manualmente cada aplicacion, lo que puede extender el tiempo de publicacion hasta 2 semanas.', body))

story.append(Paragraph('<b>8.1 Requisitos especificos de Apple</b>', h2))
apple_reqs = [
    'Politicad de privacidad accesible desde la app (obligatorio)',
    'Metadatos completos y descripciones en el idioma de cada region',
    'Capturas de pantalla en multiples tamanos (6.7", 6.5", 5.5", etc.)',
    'Icono sin canal alpha ni transparencias',
    'La app no debe requerir conexion a internet sin explicarlo',
    'Debes justificar todos los permisos que la app solicita',
    'Si la app accede a la camara, debe explicar por que en la descripcion',
]
for r in apple_reqs:
    story.append(Paragraph(f'- {r}', bullet_style))

story.append(Paragraph('<b>8.2 Proceso de envio</b>', h2))
story.append(Paragraph('El envio se realiza a traves de Xcode: abre Product > Archive, luego distribuye a traves del Organizer de Xcode. Selecciona "App Store Connect" como metodo de distribucion. En App Store Connect, completa la ficha de la aplicacion con toda la informacion requerida, sube las capturas de pantalla en todos los tamanos solicitados, y envia a revision.', body))

story.append(Paragraph('<b>8.3 Comparativa de costes y tiempos</b>', h2))
comp_data = [
    [Paragraph('<b>Aspecto</b>', header_style), Paragraph('<b>Google Play</b>', header_style), Paragraph('<b>App Store</b>', header_style)],
    [Paragraph('Coste cuenta', cell_style_left), Paragraph('$25 (unico)', cell_style), Paragraph('$99/ano', cell_style)],
    [Paragraph('Tiempo revision', cell_style_left), Paragraph('3-7 dias', cell_style), Paragraph('1-14 dias', cell_style)],
    [Paragraph('Revision', cell_style_left), Paragraph('Automatica + humana', cell_style), Paragraph('100% humana', cell_style)],
    [Paragraph('Rechazo comun', cell_style_left), Paragraph('Permisos', cell_style), Paragraph('GUI/privacidad', cell_style)],
    [Paragraph('Requisito PC', cell_style_left), Paragraph('Windows/Mac/Linux', cell_style), Paragraph('Mac unicamente', cell_style)],
    [Paragraph('Politica privacidad', cell_style_left), Paragraph('Recomendada', cell_style), Paragraph('Obligatoria', cell_style)],
]
comp_table = Table(comp_data, colWidths=[4.5*cm, 5.5*cm, 6.5*cm])
comp_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    *[('BACKGROUND', (0, i), (-1, i), colors.white if i % 2 == 1 else colors.HexColor('#F5F5F5')) for i in range(1, len(comp_data))],
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(Spacer(1, 8))
story.append(comp_table)

# ===== SECTION 9: QUICK REFERENCE =====
story.append(Spacer(1, 24))
story.append(Paragraph('<b>9. Comandos de Referencia Rapida</b>', h1))
story.append(Paragraph('A continuacion se presenta una tabla de referencia con todos los comandos utiles para el desarrollo y publicacion de EcoFridge como aplicacion nativa. Estos comandos deben ejecutarse desde la raiz del proyecto.', body))
story.append(Spacer(1, 8))

cmds_data = [
    [Paragraph('<b>Comando</b>', header_style), Paragraph('<b>Descripcion</b>', header_style)],
    [Paragraph('npm run dev', cell_style_left), Paragraph('Iniciar servidor de desarrollo', cell_style_left)],
    [Paragraph('npm run build', cell_style_left), Paragraph('Compilar para produccion', cell_style_left)],
    [Paragraph('npm run mobile:assets', cell_style_left), Paragraph('Generar iconos y splash screens', cell_style_left)],
    [Paragraph('npm run mobile:sync', cell_style_left), Paragraph('Sincronizar web con proyectos nativos', cell_style_left)],
    [Paragraph('npm run mobile:android', cell_style_left), Paragraph('Abrir proyecto en Android Studio', cell_style_left)],
    [Paragraph('npm run mobile:ios', cell_style_left), Paragraph('Abrir proyecto en Xcode', cell_style_left)],
    [Paragraph('npm run mobile:android:build', cell_style_left), Paragraph('Compilar APK de debug', cell_style_left)],
    [Paragraph('npm run mobile:android:release', cell_style_left), Paragraph('Compilar APK de release firmado', cell_style_left)],
    [Paragraph('npm run mobile:android:aab', cell_style_left), Paragraph('Compilar AAB para Google Play', cell_style_left)],
    [Paragraph('npx cap sync', cell_style_left), Paragraph('Sincronizar ambas plataformas', cell_style_left)],
    [Paragraph('npx cap add android', cell_style_left), Paragraph('Anadir plataforma Android', cell_style_left)],
    [Paragraph('npx cap add ios', cell_style_left), Paragraph('Anadir plataforma iOS', cell_style_left)],
]
cmds_table = Table(cmds_data, colWidths=[6*cm, 10.5*cm])
cmds_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    *[('BACKGROUND', (0, i), (-1, i), colors.white if i % 2 == 1 else colors.HexColor('#F5F5F5')) for i in range(1, len(cmds_data))],
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
story.append(cmds_table)

# ===== SECTION 10: TROUBLESHOOTING =====
story.append(Spacer(1, 24))
story.append(Paragraph('<b>10. Solucion de Problemas Comunes</b>', h1))

story.append(Paragraph('<b>10.1 La app muestra pantalla blanca</b>', h2))
story.append(Paragraph('Esto ocurre cuando la URL del servidor no esta configurada correctamente o el servidor no esta accesible. Verifica que la URL en capacitor.config.ts es correcta y que el servidor esta funcionando. Para probar localmente, puedes cambiar temporalmente la URL a la direccion IP de tu maquina de desarrollo (por ejemplo, http://192.168.1.100:3000). Asegurate de que tu telefono y tu ordenador estan en la misma red WiFi y de que el server.url incluye http:// (no https://) para conexiones locales.', body))

story.append(Paragraph('<b>10.2 Error de Gradle en Android</b>', h2))
story.append(Paragraph('Los errores de Gradle son comunes en la primera compilacion. Asegurate de tener instalado el JDK 17 correcto. Puedes verificarlo ejecutando java -version en tu terminal. Si el error persiste, intenta limpiar el proyecto: en Android Studio, ve a Build > Clean Project y luego Build > Rebuild Project. Tambien puedes eliminar la carpeta android/.gradle y android/app/build para forzar una reconstruccion completa.', body))

story.append(Paragraph('<b>10.3 Error de firma en Android</b>', h2))
story.append(Paragraph('Si no has configurado un keystore de release, el build de release fallara. Para el desarrollo y pruebas, usa el build de debug que no requiere firma especial. Para produccion, genera un keystore como se describe en la seccion 5.3 y configura las rutas correctas. Verifica que las variables de entorno ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_ALIAS y ANDROID_KEYSTORE_PASSWORD estan configuradas correctamente.', body))

story.append(Paragraph('<b>10.4 Error de provisioning en iOS</b>', h2))
story.append(Paragraph('Los errores de provisioning son los mas frecuentes en iOS. Asegurate de que tu cuenta de Apple Developer esta activa y de que has seleccionado el Team correcto en Xcode (Signing & Capabilities). Si usas una cuenta gratuita, el numero de dispositivos en los que puedes instalar la app es limitado a 3. Para distribucion en la App Store necesitas una cuenta de pago.', body))

story.append(Paragraph('<b>10.5 La camara no funciona en el dispositivo</b>', h2))
story.append(Paragraph('EcoFridge usa la API del navegador (getUserMedia) para la camara, que funciona perfectamente en el WebView de Capacitor. Sin embargo, debes asegurarte de que los permisos de camara estan correctamente configurados en el AndroidManifest.xml (ya incluidos en el proyecto) y en el Info.plist de iOS. Para iOS, tambien debes anadir una descripcion del uso de la camara en Info.plist con la clave NSCameraUsageDescription.', body))

story.append(Spacer(1, 18))
story.append(Paragraph('Para cualquier problema adicional, consulta la documentacion oficial de Capacitor en capacitorjs.com/docs o la comunidad en GitHub.', info_style))

# Build
doc.build(story)
print(f"PDF generado: {pdf_filename}")
