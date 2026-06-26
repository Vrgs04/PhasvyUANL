# Phasvy Campus

PWA marketplace para alumnos de la UANL. Incluye filtros por facultad, categoria, precio y texto; autenticacion; publicaciones con imagenes; contacto por WhatsApp; panel de vendedor; panel administrador; y configuracion instalable como PWA.

## Stack

- Vite + React
- Tailwind CSS
- Supabase Auth, Database y Storage
- Manifest + service worker para modo standalone

## Correr localmente

1. Instala dependencias:

```bash
npm install
```

2. Crea el archivo de variables:

```bash
cp .env.example .env
```

3. Agrega tus credenciales de Supabase en `.env`:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

4. Ejecuta el servidor:

```bash
npm run dev
```

La app abre normalmente en `http://localhost:5173`.

## Configurar Supabase

1. Crea un proyecto en Supabase.
2. En SQL Editor, ejecuta `supabase/schema.sql`.
3. En Authentication, habilita Email/Password.
4. Registra tu usuario desde la app.
5. Para convertirlo en administrador, ejecuta:

```sql
update public.users
set role = 'admin'
where email = 'tu-correo@example.com';
```

El schema crea los buckets `listing-images` y `avatars`. Si tu proyecto ya existia antes de esta version, vuelve a ejecutar la parte de `avatar_url` y `avatars` del archivo SQL.

Si la pagina dice `Could not find the table 'public.listings' in the schema cache` o el registro devuelve `{}`, ejecuta `supabase/repair-current-project.sql` completo en Supabase SQL Editor. Ese archivo crea las tablas base, trigger de usuario, buckets y policies necesarias sin borrar datos.

Si aparece `email rate limit exceeded`, Supabase limito temporalmente los correos de verificacion del proyecto. Espera unos minutos o configura SMTP propio en Supabase Authentication para produccion.

Las imagenes del carrusel inicial estan en `public/carousel/`. Puedes reemplazar `slide-bebidas.svg`, `slide-comidas.svg` y `slide-postres.svg` por fotos reales manteniendo los mismos nombres.

## PWA en iPhone

1. Ejecuta `npm run build`.
2. Sirve la carpeta `dist` con HTTPS en produccion.
3. Abre el sitio desde Safari en iPhone.
4. Toca Compartir y luego "Agregar a pantalla de inicio".

Safari en iOS requiere HTTPS para service workers fuera de localhost. La app ya incluye `manifest.json`, `sw.js`, modo `standalone`, `theme-color` y meta tags de Apple.

## Deploy en Cloudflare Pages

Opcion recomendada con GitHub:

1. Sube este proyecto a un repositorio de GitHub.
2. En Cloudflare, abre Workers & Pages.
3. Crea una app de Pages e importa el repositorio.
4. Usa esta configuracion:

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
```

5. En Settings > Environment variables agrega:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Opcion directa con Wrangler:

```bash
npm run deploy:cf
```

Cloudflare Pages publicara una URL tipo `https://phasvy-campus.pages.dev`. Como Pages usa HTTPS, la PWA podra instalarse en iPhone desde Safari con "Agregar a pantalla de inicio".

## Funcionalidades

- Usuario: ver publicaciones, filtrar, buscar, abrir detalle y contactar por WhatsApp o correo.
- Vendedor: crear, editar, marcar como vendido, eliminar y ver sus publicaciones.
- Admin: ver todo, eliminar publicaciones, bloquear usuarios, gestionar facultades y categorias.
- Reglas v1: sin pagos en linea, sin envios, contacto directo entre alumnos.

## Estructura

```text
public/
  icons/
  manifest.json
  sw.js
src/
  data/defaults.js
  lib/supabase.js
  App.jsx
  main.jsx
  styles.css
supabase/
  schema.sql
```
