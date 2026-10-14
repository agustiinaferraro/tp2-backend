# Guía de defensa

Mi preparación para la instancia de **Examen Final — Programación Multimedial IV**. La defensa me pide: explicar la intención y el recorrido, justificar mis decisiones (diseño/arquitectura/tecnología), mostrar el portfolio publicado, responder preguntas sobre código, datos y estados, y hacer una **modificación menor en vivo**.

> Tengo esto a mano junto con `docs/proceso.md` (mi evidencia de proceso) y `docs/consigna.md` (el enunciado).

## 1. Discurso de apertura (30–60 segundos)

1. **Qué es:** es mi portfolio personal, donde me presento como diseñadora multimedia y desarrolladora full stack.
2. **La idea:** una web con identidad propia (tema oscuro, violeta en los botones, verde en los detalles de texto) que además demuestra mi recorrido técnico completo: sitio estático con Astro, componentes React interactivos, una API REST propia y una base MongoDB.
3. **El recorrido:** inicio (quién soy y qué destaco) → sobre mí → proyectos (dinámicos, filtrables, con detalle tipo Behance) → servicios (páginas propias por categoría) → contacto (formulario que guarda en la base). Y el panel `/admin`, que se abre **solo cuando la sesión es la mía** (cuenta de Firebase, token validado en el backend): desde ahí gestiono TODO el contenido, incluido el **historial de proyectos con restauración**.
4. **Decisión clave de arquitectura:** elegí un sitio estático (Astro) y llevo la interactividad consumiendo mi propia API (`agustinaportfolio-api.vercel.app`), que lee MongoDB Atlas. Cada push a `main` redespliega frontend y backend en Vercel.

## 2. Mis decisiones (para tener a mano)

| Pregunta posible | Mi respuesta |
| ---------------- | ------------ |
| ¿Por qué Astro? | Es la única tecnología obligatoria. Elegí Astro estático porque la mayoría de las páginas no necesitan interactividad; solo los "islands" (buscador, grilla, admin) montan React. El resultado es un sitio rápido y simple de desplegar. |
| ¿Por qué una API separada + MongoDB? | Para que el contenido sea **dinámico y administrable** sin tocar el código: entro al panel, edito un proyecto y la web cambia sola. La consigna pide API externa o fuente dinámica; ahí está mi fuente dinámica (y además importo del feed RSS de Behance como fuente externa). |
| ¿Por qué `?id=` para el detalle y no una ruta `/proyectos/[id]`? | Porque el sitio es **estático**: Astro no puede pregenerar rutas para ids que vienen de la base en runtime. Con `?id=` el mismo HTML de `/proyectos` resuelve el detalle con un componente React y sincronizo el historial del navegador (funciona el botón "atrás"). |
| ¿Cómo manejo el peso de las imágenes? | Las imágenes viajan en base64 en MongoDB. Vercel limita el tamaño del request, así que **comprimo en el navegador** (canvas: máx. 1280px, JPG ~0.8, fondo blanco) antes de guardar, y aviso si la galería excede el límite. |
| ¿Por qué no redirigir a Behance? | Porque la web dejaría de comunicar algo propio y perdería la interacción. En su lugar **importo** los proyectos de mi feed de Behance a la base (script) y los muestro acá, con detalle propio. Behance queda solo como link externo "Ver en Behance". |
| ¿Qué interacción significativa hay? | Varias: el **buscador** filtra en vivo; los **chips de categoría** modifican qué proyectos se ven; el **detalle tipo Behance** navega la galería por miniaturas; desde el **panel admin** modifico el contenido real de la web. |
| ¿Qué estados manejo? | Carga (spinner/texto), error (API caída → mensaje), vacío ("no hay proyectos"), contenido disponible, sesión (logueada/cerrada), confirmación antes de borrar. |

## 3. Mapa del código (para intervenir en vivo rápido)

- **`tp2-frontend/src/`**
  - `pages/*.astro` — cada página (index, sobre-mi, proyectos, servicios, contacto, perfil, admin).
  - `layouts/Layout.astro` — HTML común (head, título, skip-link).
  - `components/*.jsx` — mis islands React: `Buscador`, `GrillaProyectos`, `ProyectoDetalle`, `SelectorImagenes`, `AdminProyectos`, `HistorialProyectos`, `CuentaUsuario`, `Comentarios`, `AdminMensajes`, `ServicioDetalle`, `Contacto`.
  - `data/servicios.js` — los 5 servicios con sus páginas (si creo categorías nuevas, las agrego acá).
  - `api/*.js` — funciones que llaman al backend (fetch).
  - `styles/global.css` — estilos globales y ajustes de accesibilidad.
- **`tp2-backend/`**
  - `server.js` — arranque. `routes/` — endpoints (`proyectos`, `servicios`, `mensajes`, `comentarios`, `historial-proyectos`, `admin`, `perfil`, `usuarios`). `models/` — esquemas.
  - `scripts/importar-behance.js` — importa proyectos desde el RSS de Behance.
  - `.env` — `MONGODB_URI`, `ADMIN_EMAIL` y las credenciales de firebase admin (no se sube al repo).

**Ejercicios de modificación en vivo** (practicá estos):

1. **Cambiar un color de identidad:** en `tp2-frontend/src/styles/global.css` (o en el componente) cambio el acento `#a78bfa` o en `Layout.astro` el `bg-zinc-950`.
2. **Cambiar un texto:** edito un párrafo en `tp2-frontend/src/pages/sobre-mi.astro` o `index.astro`.
3. **Agregar un servicio/página:** sumo una entrada con slug en `tp2-frontend/src/data/servicios.js` → se genera la ruta en el build.
4. **Cambiar qué se ve en la home:** en el panel `/admin`, edito un proyecto y tildo "Destacado en la portada".
5. **Agregar un proyecto:** entro a `/admin` con mi cuenta de dueña (el panel se abre solo si esa cuenta es la mía) y cargo un proyecto con imagen; la grilla y el detalle lo muestran al instante.
6. **Restaurar algo borrado:** en el panel → *Historial*, toco **Restaurar** en una entrada de borrado; el proyecto vuelve a la grilla al toque (y si ya existe, aviso en vez de duplicar).

## 4. Preguntas difíciles típicas (para no quedarse en blanco)

- **"¿Qué pasa si la API se cae?"** → Mis componentes muestran "Verificá que el backend esté corriendo" (estado de error). El sitio estático sigue funcionando; solo las secciones dinámicas avisan que no hay datos.
- **"¿Por qué MongoDB y no otro?"** → Es un servicio administrado en la nube (Atlas, plan gratis), fácil de conectar con Mongoose y con el deploy en Vercel.
- **"¿Cómo está protegido el admin?"** → Mi panel solo se abre con **mi cuenta de Firebase**: cada operación de escritura pasa por el middleware `esAdmin`, que valida el token (`Authorization: Bearer`) y comprueba que el email sea el mío (`ADMIN_EMAIL`). Lo puede consultar con `GET /api/admin/soy-dueno`. No guardo contraseñas en el navegador: el token vive en la sesión y expira solo.
- **"¿Qué pasaría si Behance cambia su feed?"** → La web no depende de Behance en runtime: el feed lo uso solo en el script de importación. Si cambia, vuelvo a correr el import (o edito desde el panel).
- **"¿Cómo se maneja el 'vacío'?"** → Cada lista muestra un mensaje específico (grilla: "Todavía no hay proyectos…"; servicio sin proyectos: texto propio; buscador: "sin resultados").
- **"¿Cuáles son las limitaciones?"** → Miniaturas de Behance en calidad media (se reemplazan por imágenes propias), categorías nuevas sin página hasta el redeploy, base64 en la base (a futuro CDN), sin paginación aún.

## 5. Antes de cerrar

- Verifico que **https://agustinaportfolio.vercel.app** funcione (y `/proyectos`, `/servicios`, `/contacto`, `/admin`).
- Muestro el **panel `/admin`** en vivo para demostrar que el contenido es editable y se refleja al instante.
- Menciono el **registro de IA** (la consigna lo pide y el trabajo no puede ser una "caja negra"): la IA ayudó a implementar, pero las decisiones son mías y puedo explicar y modificar todo.
