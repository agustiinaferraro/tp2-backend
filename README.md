# Backend del Portfolio

API REST del portfolio construida con **Node.js + Express + Mongoose**, conectada a **MongoDB Atlas**.

## Estructura

```
backend/
├── server.js          # Punto de entrada: config y arranque del servidor
├── package.json
├── .env.example       # Plantilla de variables de entorno (copiá a .env)
├── config/            # Conexión a MongoDB (a completar)
├── models/            # Modelos de datos (proyectos, mensajes, servicios...)
└── routes/            # Rutas/endpoints de la API
└── scripts/           # Scripts utilitarios (importación desde Behance)
```

## Puesta en marcha

1. Instalá las dependencias:

   ```sh
   yarn install
   ```

2. Copiá la plantilla de variables de entorno y completá tus datos de MongoDB Atlas:

   ```sh
   cp .env.example .env
   ```

3. Levantá el servidor en modo desarrollo:

   ```sh
   yarn dev
   ```

El servidor arranca en `http://localhost:4000`.

> Los modelos y rutas de datos se definen según las necesidades del portfolio (ver README de la raíz).

## Importar proyectos desde Behance (fuente externa)

El feed RSS público de **Behance** (`https://www.behance.net/agustiinaferraro.rss`) se usa como fuente externa de datos: un script lee ese feed, extrae título, descripción, link y miniatura de cada proyecto publicado y los crea en MongoDB (no repite los que ya existen; se identifica por `link`).

```sh
node scripts/importar-behance.js
```

De esta forma el portfolio queda poblado sin cargar los proyectos a mano, pero la web **siempre lee de la base de datos** (no redirige a Behance: cada tarjeta abre el detalle propio del sitio). Las miniaturas que trae el feed se usan como portada; para imágenes de mejor calidad se cargan desde el panel de administración.

**Sincronización automática:** el workflow de **GitHub Actions** `.github/workflows/importar-behance.yml` corre el script **cada 6 horas** y se puede ejecutar a mano desde la pestaña *Actions* del repositorio. Al re-correr, crea los proyectos **nuevos** y **actualiza** título, descripción y miniatura de los que ya existen (si cambiaron en Behance), sin pisar categoría, destacado ni imágenes propias cargadas desde el panel. Requiere el secret `MONGODB_URI` configurado en el repositorio (Settings → Secrets and variables → Actions).

## Importar proyectos desde Vercel (trabajos de programación)

El script `scripts/importar-vercel.js` lee la **API de Vercel** con un token (`VERCEL_TOKEN`), lista los proyectos de la cuenta, toma el **link de producción** de cada uno (el front) y los crea o actualiza en MongoDB en la categoría **Desarrollo Full Stack**. La portada es una imagen SVG generada (se puede reemplazar desde el panel; si el usuario sube una imagen propia, el script no la pisa). El workflow `.github/workflows/importar-vercel.yml` lo corre cada 6 horas (o manual desde *Actions*) con los secrets `VERCEL_TOKEN` y `MONGODB_URI`. No incluye el portfolio propio (`agustinaportfolio*`) y deduplica proyectos repetidos de Vercel.

## Deploy

Deployado en Vercel como función serverless: https://agustinaportfolio-api.vercel.app

- La variable `MONGODB_URI` se configura en Vercel (no se sube al repositorio).
- Las variables `ADMIN_USUARIO` y `ADMIN_CLAVE` (credenciales del panel `/admin`) también se configuran en Vercel.
- `vercel.json` define el build con `@vercel/node` y enruta todas las peticiones a `server.js`.
