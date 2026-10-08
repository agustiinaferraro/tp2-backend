# Guía de defensa

Preparación para la instancia de **Examen Final — Programación Multimedial IV**. La defensa pide: explicar la intención y el recorrido, justificar decisiones (diseño/arquitectura/tecnología), mostrar el portfolio publicado, responder preguntas sobre código/datos/estados y hacer una **modificación menor en vivo**.

> Leé esto junto con `docs/proceso.md` (la evidencia) y `docs/consigna.md` (el enunciado).

## 1. Discurso de apertura (30–60 segundos)

1. **Qué es:** un portfolio personal que presenta a Agustina como diseñadora multimedia y desarrolladora full stack.
2. **La idea:** una web con identidad propia (oscuro, violeta en los botones, verde en los detalles de texto) que además demuestra un recorrido técnico completo: sitio estático con Astro, componentes React interactivos, una API REST propia y una base MongoDB.
3. **El recorrido del visitante:** inicio (conocés quién soy y qué destaco) → sobre mí → proyectos (dinámicos, filtrables, con detalle tipo Behance) → servicios (páginas propias por categoría) → contacto (formulario que guarda en la base). Y al final del todo, el panel `/admin` con clave: la persona puede gestionar TODO el contenido.
4. **Decisión clave de arquitectura:** el sitio es estático (Astro) y la interactividad viene de consumir mi propia API (`agustinaportfolio-api.vercel.app`), que lee MongoDB Atlas. Cada push a `main` redespliega frontend y backend en Vercel.

## 2. Justificar decisiones (para tener a mano)

| Pregunta posible | Respuesta |
| ---------------- | --------- |
| ¿Por qué Astro? | Es la única tecnología obligatoria. Elegí Astro estático porque la mayoría de las páginas no necesitan interactividad; solo los "islands" (buscador, grilla, admin) montan React. Resultado: un sitio rápido y simple de desplegar. |
| ¿Por qué una API separada + MongoDB? | Para que el contenido sea **dinámico y administrable** sin tocar el código: entra al panel, edita un proyecto, y la web cambia sola. La consigna pide API externa o fuente dinámica; esta es la fuente dinámica (además importo del feed RSS de Behance como fuente externa). |
| ¿Por qué `?id=` para el detalle y no una ruta `/proyectos/[id]`? | El sitio es **estático**: Astro no puede pregenerar rutas para ids que vienen de la base en runtime. Con `?id=` el mismo HTML de `/proyectos` resuelve el detalle con un componente React y sincroniza el historial (funciona el botón "atrás"). |
| ¿Cómo manejás el peso de las imágenes? | Las imágenes viajan en base64 en MongoDB. Vercel limita el tamaño del request, así que **comprimo en el navegador** (canvas: máx. 1280px, JPG ~0.8, fondo blanco) antes de guardar, y aviso si la galería excede el límite. |
| ¿Por qué no redirigir a Behance? | Porque la web dejaría de comunicar algo propio y perdería la interacción. En su lugar **importo** los proyectos de mi feed de Behance a la base (script) y los muestro acá, con detalle propio. Behance queda solo como link externo "Ver en Behance". |
| ¿Qué interacción significativa hay? | Varias: el **buscador** filtra en vivo; los **chips de categoría** modifican qué proyectos se ven; el **detalle tipo Behance** navega la galería por miniaturas; el **panel admin** modifica el contenido real de la web. |
| ¿Qué estados manejás? | Carga (spinner/texto), error (API caída → mensaje), vacío ("no hay proyectos"), contenido disponible, sesión admin (logeado/cerrado), confirmación antes de borrar. |

## 3. Mapa del código (para intervenir en vivo rápido)

- **`frontend/src/`**
  - `pages/*.astro` — cada página (index, sobre-mi, proyectos, servicios, contacto, admin).
  - `layouts/Layout.astro` — HTML común (head, título, skip-link).
  - `components/*.jsx` — los islands React: `Buscador`, `GrillaProyectos`, `ProyectoDetalle`, `SelectorImagenes`, `AdminProyectos`, `ServicioDetalle`, `Contacto`.
  - `data/servicios.js` — los 5 servicios con sus páginas (si creás categorías nuevas, se agregan acá).
  - `api/*.js` — funciones que llaman al backend (fetch).
  - `styles/global.css` — estilos globales y ajustes de accesibilidad.
- **`backend/src`**
  - `server.js` — arranque. `routes/proyectos.js`, `routes/servicios.js`, `routes/mensajes.js`, `routes/admin.js` — endpoints. `models/` — esquemas.
  - `scripts/importar-behance.js` — importa proyectos desde el RSS de Behance.
  - `.env` — `MONGODB_URI`, `ADMIN_USUARIO`, `ADMIN_CLAVE` (no se sube al repo).

**Ejercicios de modificación en vivo** (practicá estos):
1. **Cambiar un color de identidad:** en `frontend/src/styles/global.css` (o en el componente) cambiá el acento `#a78bfa` o en `Layout.astro` el `bg-zinc-950`.
2. **Cambiar un texto:** editá un párrafo en `frontend/src/pages/sobre-mi.astro` o `index.astro`.
3. **Agregar un servicio/página:** sumá una entrada con slug en `frontend/src/data/servicios.js` → se genera la ruta en el build.
4. **Cambiar qué se ve en la home:** en el panel `/admin`, editá un proyecto y tildá "Destacado en la portada".
5. **Agregar un proyecto:** desde `/admin` (usuario `agustina` + clave) cargá un proyecto con imagen; la grilla y el detalle lo muestran al instante.

## 4. Preguntas difíciles típicas (para no quedarse en blanco)

- **"¿Qué pasa si la API se cae?"** → Los componentes muestran "Verificá que el backend esté corriendo" (estado de error). El sitio estático sigue funcionando; solo las secciones dinámicas avisan que no hay datos.
- **"¿Por qué MongoDB y no otro?"** → Es un servicio administrado en la nube (Atlas, plan gratis), fácil de conectar con Mongoose y con el deploy en Vercel.
- **"¿Cómo está protegido el admin?"** → Usuario y clave en variables de entorno (`ADMIN_USUARIO`, `ADMIN_CLAVE`), se verifican en `POST /api/admin/verificar` y cada operación de escritura pasa por el middleware `esAdmin` (clave en header `x-admin-clave`). La sesión vive en `sessionStorage` del navegador.
- **"¿Qué pasaría si Behance cambia su feed?"** → La web no depende de Behance en runtime: el feed se usa solo en el script de importación. Si cambia, re-ejecutás el import (o usás el panel).
- **"¿Cómo se maneja el 'vacío'?"** → Cada lista muestra un mensaje específico (grilla: "Todavía no hay proyectos…"; servicio sin proyectos: texto propio; buscador: "sin resultados").
- **"¿Cuáles son las limitaciones?"** → Miniaturas de Behance en calidad media (se reemplazan por imágenes propias), categorías nuevas sin página hasta el redeploy, base64 en la base (a futuro CDN), sin paginación aún.

## 5. Antes de cerrar

- Verificá que **https://agustinaportfolio.vercel.app** funcione (y `/proyectos`, `/servicios`, `/contacto`, `/admin`).
- Se puede mostrar el **panel `/admin`** en vivo para demostrar que el contenido es editable y se refleja al instante.
- Recordá mencionar el **registro de IA** (consigna pide que lo digas y que el resultado no sea "caja negra"): ayudó a implementar, pero vos decidiste y podés explicar y cambiar todo.