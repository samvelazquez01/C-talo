# 💈 AgendaBarber - Plataforma Multi-Negocio de Gestión de Citas (Costo Cero)

> Plataforma moderna, mobile-first y 100% en español para barberías y peluquerías. Permite a los clientes reservar en segundos y al barbero tener el control total de su día con alertas en tiempo real, modo pantalla de local y recordatorios por Telegram.
> 
> **Restricción cumplida**: 100% gratuita. Todo funciona con planes Spark / Free, sin tarjeta de crédito.

---

## 🏗️ Arquitectura Técnica de Costo Cero

- **Frontend**: Vanilla HTML5 + CSS moderno + JavaScript (módulos ES). Sin frameworks pesados. Instalable como PWA en Android e iOS. Alojado en **Firebase Hosting (Plan Spark - $0)**.
- **Autenticación**: **Firebase Authentication** (Email y contraseña).
- **Base de Datos**: **Cloud Firestore (Plan Spark - $0)**. Una sola base de datos optimizada con documentos de disponibilidad (`disponibilidad/{barberoId_fecha}`) para minimizar lecturas y respetar la cuota gratuita de 50,000 lecturas/día.
- **Backend Único**: **Cloudflare Worker (Plan Free - $0)** con **Cron Trigger (`* * * * *`)** cada minuto. Procesa transacciones atómicas de reserva, anti-spam, webhook de Telegram, compresión/subida a ImgBB y envío de recordatorios.
- **Fotografías**: **ImgBB API ($0)**. El navegador comprime la imagen a ~400px en Canvas antes de enviarla.
- **Bot de Telegram**: Alertas de citas nuevas, botones inline, resumen matutino y recordatorios X minutos antes.

---

## 🚀 Probar de Inmediato (Modo Demostración Offline)

Puedes probar la plataforma ahora mismo de forma local sin configurar claves:

1. **Ejecutar los tests unitarios del algoritmo de disponibilidad**:
   ```bash
   npm test
   ```
   *Valida los 9 casos del algoritmo: huecos de 10 min vs 15 min, bordes de turno, días bloqueados, compactación y colisiones.*

2. **Abrir la aplicación**:
   Simplemente sirve la carpeta `frontend` con cualquier servidor estático local:
   ```bash
   npx serve frontend -p 3000
   ```
   Abre `http://localhost:3000` en tu navegador. Incluye datos precargados de la "Barbería VIP", 2 barberos, 5 servicios y citas interactivas.

---

## 🛠️ Guía Paso a Paso para Despliegue en Producción ($0)

### 1. Crear Proyecto en Firebase (Plan Spark - Gratuito)
1. Ve a [Firebase Console](https://console.firebase.google.com/) e inicia sesión con tu cuenta de Google.
2. Haz clic en **"Crear un proyecto"** (nómbralo, por ejemplo, `agendabarber-app`).
3. Desactiva Google Analytics (opcional) y pulsa **Crear**. Asegúrate de mantener el plan **Spark** (predeterminado, sin tarjeta de crédito).
4. **Habilitar Firestore Database**:
   - En el menú lateral, ve a **Compilación > Firestore Database**.
   - Haz clic en **Crear base de datos**.
   - Elige una ubicación cercana (ej. `southamerica-east1` o `us-central1`).
   - Selecciona **Modo de producción**.
5. **Habilitar Firebase Authentication**:
   - Ve a **Compilación > Authentication > Comenzar**.
   - Activa el proveedor **Correo electrónico/Contraseña**.
6. **Obtener Credenciales Web para el Frontend**:
   - En la vista general del proyecto, haz clic en el icono web `</>` para registrar una aplicación web.
   - Copia el objeto `firebaseConfig` y pégalo en `frontend/js/config.js`.
7. **Obtener Cuenta de Servicio para el Cloudflare Worker**:
   - Ve a **Configuración del Proyecto (icono engranaje) > Cuentas de servicio**.
   - Haz clic en **"Generar nueva clave privada"**.
   - Se descargará un archivo JSON. Extrae los valores: `project_id`, `client_email` y `private_key` (se utilizarán en el Worker).

---

### 2. Crear el Bot de Telegram con @BotFather ($0)
1. Abre Telegram y busca el usuario oficial **[@BotFather](https://t.me/botfather)**.
2. Envía el comando `/newbot`.
3. Asigna un nombre a tu bot (ej. `AgendaBarber Notificaciones`) y un usuario que termine en `bot` (ej. `MiBarberiaTurnosBot`).
4. @BotFather te responderá con tu **Token de la API de Telegram** (ej. `123456789:ABCdefGHIjklMNOpqrSTUvwxYZ`). Guarda este token.
5. Configura los comandos del bot enviando a @BotFather `/setcommands`:
   ```text
   proxima - Ver próxima cita inmediata
   hoy - Citas de hoy
   manana - Citas de mañana
   ayuda - Instrucciones de uso
   ```

---

### 3. Obtener API Key de ImgBB ($0)
1. Crea una cuenta gratuita en [ImgBB](https://imgbb.com/).
2. Ve a [api.imgbb.com](https://api.imgbb.com/) y pulsa **"Obtener clave de API"**.
3. Guarda tu clave (ej. `9f8e7d6c5b4a3...`).

---

### 4. Desplegar el Cloudflare Worker ($0)
1. Si no tienes cuenta en Cloudflare, regístrate gratis en [cloudflare.com](https://www.cloudflare.com/).
2. Instala la herramienta CLI `wrangler`:
   ```bash
   cd worker
   npm install
   npx wrangler login
   ```
3. Configura los secretos de entorno en Cloudflare (nunca se guardan en el repositorio):
   ```bash
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   # Pega el token de @BotFather

   npx wrangler secret put IMGBB_API_KEY
   # Pega tu API key de ImgBB

   npx wrangler secret put FIREBASE_PROJECT_ID
   # Pega el ID de tu proyecto Firebase (ej: agendabarber-app)

   npx wrangler secret put FIREBASE_CLIENT_EMAIL
   # Pega el client_email del JSON de servicio

   npx wrangler secret put FIREBASE_PRIVATE_KEY
   # Pega la private_key completa del JSON de servicio (incluyendo -----BEGIN y -----END)
   ```
4. Despliega el Worker:
   ```bash
   npx wrangler deploy
   ```
   Obtendrás tu URL (ej. `https://agendabarber-worker.tunombre.workers.dev`).
5. **Configurar Webhook de Telegram**:
   Apunta el bot a tu Worker ejecutando en tu navegador o terminal:
   ```bash
   curl "https://api.telegram.org/bot<TU_TELEGRAM_TOKEN>/setWebhook?url=https://agendabarber-worker.tunombre.workers.dev/telegram"
   ```
6. Copia la URL del Worker y colócala en `frontend/js/config.js` en el campo `workerUrl`.

---

### 5. Desplegar el Frontend y Reglas en Firebase Hosting ($0)
1. Instala Firebase CLI si no lo tienes:
   ```bash
   npm install -g firebase-tools
   ```
2. Inicia sesión en Firebase:
   ```bash
   firebase login
   firebase use --add tu-proyecto-firebase
   ```
3. Despliega las reglas de seguridad e índices de Firestore:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```
4. Despliega la aplicación web en Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```
   ¡Tu plataforma estará en vivo y lista en `https://tu-proyecto.web.app`!

---

## 📱 Funcionalidades Destacadas

### 1. Panel del Barbero (Vista "Hoy")
- **Tarjeta PRÓXIMA CITA**: Con cuenta regresiva en vivo (`en 12 min`, `ahora`), teléfono con enlace `tel:` para llamar con 1 toque y botones de acción rápida:
  - `Llegó`
  - `En Proceso`
  - `Terminada`
  - `No se presentó`
  - `Cancelar con motivo`
- **Tarjeta DESPUÉS**: Cita siguiente inmediata.
- **Indicador de Huecos Libres**: Muestra tiempos muertos de descanso entre turnos.
- **Sonido de Alerta Discreto**: Sintetizado mediante Web Audio API cuando entra una nueva reserva.
- **Modo Pantalla del Local (Kiosk)**: Vista de alto contraste y tipografía gigante para colocar una tablet en el mostrador; utiliza **Screen WakeLock API** para evitar que la pantalla se apague.
- **Cola Walk-In**: Registro de clientes presenciales sin cita previa con botón "Atender ahora".

### 2. Algoritmo de Disponibilidad Compartido
- Resta turnos, pausas, bloqueos y descansos de limpieza post-servicio.
- Descarta huecos inútiles menores a $D_{min}$ para evitar fraccionamiento del tiempo.
- Incluye modo **"Compactar Agenda"** para ofrecer turnos pegados a citas existentes.
- Idéntica implementación usada tanto en el cliente como en el backend.

### 3. Reserva del Cliente Ultrarrápida
- Selección múltiple de servicios con suma de tiempos y precios.
- Selector de días y cuadrícula con insignias **"Recomendada"**.
- Confirmación con botón **"Agregar a mi Calendario (.ics)"**.
- Enlace privado único `/cita/{token}` para consultar el estado o cancelar sin cuenta.

---

## 🔒 Seguridad y Privacidad

- El público **NUNCA** lee la colección privada de citas de otros clientes.
- El público lee únicamente el documento resumido `disponibilidad/{barberoId_fechaLocal}`.
- Todas las escrituras de reservas públicas se ejecutan a través del Cloudflare Worker en transacciones atómicas con credenciales de cuenta de servicio.
- Anti-spam activo con límites por IP y número de teléfono.
