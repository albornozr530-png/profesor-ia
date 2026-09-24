# Publicar Profesor IA en un servidor propio

Esta guía deja el frontend y el backend en el mismo dominio. Es importante para que `/api` funcione y para que el navegador permita usar el micrófono.

## Opción sin servidor propio: Render

Si no tienes VPS, la forma más sencilla es usar un servicio gestionado:

1. Crea una cuenta en Render y un repositorio gratuito en GitHub.
2. Sube este proyecto al repositorio.
3. En Render elige **New > Blueprint**, selecciona el repositorio y detecta `render.yaml`.
4. Completa `CLIENT_ORIGINS` con `https://TU-SUBA-DOMAIN.onrender.com`.
5. Añade `POLLINATIONS_API_KEY` como variable secreta si quieres usar el endpoint oficial de IA.
6. Despliega y comparte `https://TU-SUBA-DOMAIN.onrender.com`.

El plan gratuito puede suspender el servicio por inactividad, por lo que la primera visita puede tardar unos segundos. Para una URL permanentemente activa se requiere un plan pagado o un servidor propio. La configuración incluida usa Docker, HTTPS y el mismo origen para frontend/API.

## Opción recomendada: Ubuntu/Debian + Docker + Nginx

1. Instala Docker Engine y el plugin Compose en el servidor.
2. Copia este proyecto al servidor, por ejemplo en `/opt/profesor-ia`.
3. Crea la configuración:

```bash
cd /opt/profesor-ia
cp .env.example .env
nano .env
```

Configura como mínimo:

```dotenv
HOST=0.0.0.0
PORT=3001
CLIENT_ORIGINS=https://profesor.example.com
VITE_API_BASE_URL=
POLLINATIONS_API_KEY=
```

`VITE_API_BASE_URL` debe quedar vacío porque el frontend y la API están en el mismo dominio. Para activar la transcripción de audio, configura `POLLINATIONS_API_KEY` o `TRANSCRIPTION_API_URL`.

4. Construye y arranca:

```bash
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:3001/api/health
```

5. En el panel DNS del dominio crea un registro `A` con la IP pública del servidor. Espera a que `https://dominio.example` resuelva al servidor.

6. Instala Nginx y Certbot:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

7. Para el primer certificado usa temporalmente `deploy/nginx-http.conf`, sustituyendo `profesor.example.com` por el dominio real. Después ejecuta:

```bash
sudo certbot --nginx -d dominio.example
```

8. Copia la configuración final `deploy/nginx.conf`, sustituyendo el dominio y las rutas del certificado, y recarga:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/profesor-ia
sudo ln -sf /etc/nginx/sites-available/profesor-ia /etc/nginx/sites-enabled/profesor-ia
sudo nginx -t
sudo systemctl reload nginx
```

9. Comprueba:

```bash
curl https://dominio.example/api/health
```

El enlace que se comparte con el profesor será `https://dominio.example`.

## Acceso restringido

Como los endpoints de IA consumen recursos, no publiques el servicio sin una protección adicional. En `deploy/nginx.conf` se puede activar autenticación básica:

```bash
sudo apt install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd-profesor-ia profesor
```

Después descomenta las líneas `auth_basic` y `auth_basic_user_file` y recarga Nginx. También puedes usar Cloudflare Access o una VPN si el profesor debe usar una clave institutional.

## Hosting compartido/cPanel

Si el hosting permite Node.js:

```bash
npm run install:all
npm run build:web
npm start
```

Configura el comando de inicio como `npm start`, el directorio como la raíz del proyecto y las variables de `.env` en el panel. El proceso debe escuchar en `0.0.0.0` y el proxy del panel debe enviar `/api` al mismo proceso.

## Verificaciones

```bash
curl https://dominio.example/api/health
curl -I https://dominio.example/manifest.webmanifest
```

No abras la aplicación únicamente por una IP HTTP: el micrófono necesita HTTPS. Si usas un proxy, no cambies las rutas `/api` a un servidor diferente sin configurar `VITE_API_BASE_URL` y CORS.
