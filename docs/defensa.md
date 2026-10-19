# Guía de defensa

Mi preparación para la instancia de **Examen Final — Programación Multimedial IV**. La defensa me pide: explicar la intención y el recorrido, justificar mis decisiones (diseño/arquitectura/tecnología), mostrar el portfolio publicado, responder preguntas sobre código, datos y estados, y hacer una **modificación menor en vivo**.

> Tengo esto a mano junto con `docs/proceso.md` (mi evidencia de proceso) y `docs/consigna.md` (el enunciado).

## 1. Discurso de apertura (30–60 segundos)

1. **Qué es:** es mi portfolio personal, donde me presento como diseñadora multimedia y desarrolladora full stack.
2. **La idea:** una web con identidad propia (tema oscuro, violeta en los botones, verde en los detalles de texto) que además demuestra mi recorrido técnico completo: sitio estático con Astro, componentes React interactivos, una API REST propia y una base MongoDB.
3. **El recorrido:** inicio (quién soy y qué destaco) → sobre mí → proyectos (dinámicos, filtrables, con detalle tipo Behance) → servicios (páginas propias por categoría) → contacto (formulario que guarda en la base). Y el panel `/admin`, que se abre **solo cuando la sesión es la mía** (cuenta de Firebase, token validado en el backend): desde ahí gestiono TODO el contenido, incluido el **historial de proyectos con restauración**.
4. **Decisión clave de arquitectura:** elegí un sitio estático (Astro) y llevo la interactividad consumiendo mi propia API, que lee MongoDB Atlas. En producción la API **queda oculta para el visitante**: el navegador solo llama a `/api` en el dominio del sitio y un rewrite de Vercel la enruta al backend por atrás. Cada push a `main` redespliega frontend y backend en Vercel.

## 2. Mis decisiones (para tener a mano)

| Pregunta posible | Mi respuesta |
| ---------------- | ------------ |
| ¿Por qué Astro? | Es la única tecnología obligatoria. Elegí Astro estático porque la mayoría de las páginas no necesitan interactividad; solo los "islands" (buscador, grilla, admin) montan React. El resultado es un sitio rápido y simple de desplegar. |
| ¿Por qué una API separada + MongoDB? | Para que el contenido sea **dinámico y administrable** sin tocar el código: entro al panel, edito un proyecto y la web cambia sola. La consigna pide API externa o fuente dinámica; ahí está mi fuente dinámica (y además importo del feed RSS de Behance como fuente externa). |
| ¿Por qué `?id=` para el detalle y no una ruta `/proyectos/[id]`? | Porque el sitio es **estático**: Astro no puede pregenerar rutas para ids que vienen de la base en runtime. Con `?id=` el mismo HTML de `/proyectos` resuelve el detalle con un componente React y sincronizo el historial del navegador (funciona el botón "atrás"). |
| ¿Cómo manejo el peso de las imágenes? | Las imágenes viajan en base64 en MongoDB. Vercel limita el tamaño del request, así que **comprimo en el navegador** (canvas: máx. 1280px, JPG ~0.8, fondo blanco) antes de guardar, y aviso si la galería excede el límite. |
| ¿Por qué no redirigir a Behance? | Porque la web dejaría de comunicar algo propio y perdería la interacción. En su lugar **importo** los proyectos de mi feed de Behance a la base (script) y los muestro acá, con detalle propio: **galería completa, video, descripción, estadísticas y fecha**, sincronizados desde cada galería y cacheados en Mongo. Behance queda solo como link externo "Ver proyecto completo". |
| ¿Qué interacción significativa hay? | Varias: el **buscador** filtra en vivo; los **chips de categoría** modifican qué proyectos se ven; el **detalle tipo Behance** navega la galería por miniaturas; desde el **panel admin** modifico el contenido real de la web. |
| ¿Qué estados manejo? | Carga (spinner/texto), error (API caída → mensaje), vacío ("no hay proyectos"), contenido disponible, sesión (logueada/cerrada), confirmación antes de borrar. |

## 3. Mapa del código (para intervenir en vivo rápido)

- **`tp2-frontend/src/`**
  - `pages/*.astro` — cada página (index, sobre-mi, proyectos, servicios, contacto, perfil, admin).
  - `layouts/Layout.astro` — HTML común (head, título, skip-link).
  - `components/*.jsx` — mis islands React: `Buscador`, `GrillaProyectos`, `ProyectoDetalle`, `SelectorImagenes`, `AdminProyectos`, `HistorialProyectos`, `CuentaUsuario`, `Comentarios`, `AdminMensajes`, `ServicioDetalle`, `Contacto`.
  - `data/servicios-respaldo.js` — respaldo estático (slug + nombre) que el build usa para generar las páginas de los 5 servicios base; la fuente real de los textos es la API (editable desde el panel).
  - `api/*.js` — funciones que llaman al backend (fetch).
  - `styles/global.css` — estilos globales y ajustes de accesibilidad.
- **`tp2-backend/`**
  - `server.js` — arranque. `routes/` — endpoints (`proyectos`, `servicios`, `mensajes`, `comentarios`, `historial-proyectos`, `behance`, `admin`, `perfil`, `usuarios`). `models/` — esquemas.
  - `scripts/importar-behance.js` — importa proyectos nuevos desde el RSS de Behance y sincroniza el detalle de cada galería (imágenes completas, video, descripción, estadísticas, fecha, keywords, y título/descripción/portada tomados de la propia página) con tope de 15 por corrida.
  - `.env` — `MONGODB_URI`, `ADMIN_EMAIL` y las credenciales de firebase admin (no se sube al repo).

**Ejercicios de modificación en vivo** (practicá estos):

1. **Cambiar un color de identidad:** en `tp2-frontend/src/styles/global.css` (o en el componente) cambio el acento `#a78bfa` o en `Layout.astro` el `bg-zinc-950`.
2. **Cambiar un texto:** edito un párrafo en `tp2-frontend/src/pages/sobre-mi.astro` o `index.astro`.
3. **Agregar un servicio/página:** creo la categoría desde el panel (selector de categorías → "Crear categoría nueva"); su página propia se suma agregando el slug en `tp2-frontend/src/data/servicios-respaldo.js` + redeploy. **Editar** nombre, descripción y "qué incluye" de un servicio existente lo hago desde la vista *Servicios* del panel, al instante.
4. **Cambiar qué se ve en la home:** en el panel `/admin`, edito un proyecto y tildo "Destacado en la portada".
5. **Agregar un proyecto:** entro a `/admin` con mi cuenta de dueña (el panel se abre solo si esa cuenta es la mía) y cargo un proyecto con imagen; la grilla y el detalle lo muestran al instante.
6. **Restaurar algo borrado:** en el panel → *Historial*, toco **Restaurar** en una entrada de borrado; el proyecto vuelve a la grilla al toque (y si ya existe, aviso en vez de duplicar).

## 4. Preguntas difíciles típicas (para no quedarse en blanco)

- **"¿Qué pasa si la API se cae?"** → Mis componentes muestran "Verificá que el backend esté corriendo" (estado de error). El sitio estático sigue funcionando; solo las secciones dinámicas avisan que no hay datos.
- **"¿Por qué MongoDB y no otro?"** → Es un servicio administrado en la nube (Atlas, plan gratis), fácil de conectar con Mongoose y con el deploy en Vercel.
- **"¿Cómo está protegido el admin?"** → Mi panel solo se abre con **mi cuenta de Firebase**: cada operación de escritura pasa por el middleware `esAdmin`, que valida el token (`Authorization: Bearer`) y comprueba que el email sea el mío (`ADMIN_EMAIL`). Lo puede consultar con `GET /api/admin/soy-dueno`. No guardo contraseñas en el navegador: el token vive en la sesión y expira solo.
- **"¿Qué pasaría si Behance cambia su feed?"** → La web no depende de Behance en runtime: los proyectos y su detalle viven cacheados en Mongo y solo se refrescan en el sync (cada 6 horas por GitHub Actions). Si cambia el formato, se ve en el log del sync (los proyectos fallidos no se marcan y se reintentan) y ajusto el scraper; mientras tanto el sitio sigue mostrando lo último sincronizado.
- **"¿Y si edito un texto desde el panel, Behance me lo pisa?"** → No: por defecto Behance manda (título y descripción se actualizan solos), pero en cuanto edito ese texto desde el panel queda **marcado como propio** y el sync deja de tocarlo. En el editor hay un checkbox por campo para devolverle el control a Behance (en la próxima sincronización). El campo **"Qué aprendí"** es siempre mío: Behance no lo sincroniza.
- **"¿Qué pasa si renombro o le cambio la miniatura a un proyecto en Behance?"** → Se refleja en el portfolio en la próxima corrida (6 horas), en los 42 proyectos, no solo en los 12 del feed: título, descripción y portada los lee el scraper de la propia galería (`og:title`, `og:image`, `json-ld`). Al renombrar cambia el slug del link, por eso la búsqueda es por **número de galería** y no por el link entero: un renombre actualiza el registro en vez de duplicarlo (tuve ese bug y lo arreglé). Si la portada la reemplazo con una imagen propia desde el panel, Behance no la pisa.
- **"Los detalles son solo una foto y un enlace"** → Ya no: el detalle es tipo Behance con la **galería completa, video embebido, descripción, estadísticas y fecha** sincronizadas cada 6 horas; el enlace externo queda como complemento. Y sumé la sección **"Qué aprendí"**, que escribo yo desde el panel proyecto por proyecto (punto del feedback: reflejar el aprendizaje, no un listado de herramientas).
- **"¿Y la sección de Servicios?"** → Cada página de servicio se completa desde la vista *Servicios* del panel: descripción y lista **"Qué incluye"** (se muestra con ✓). Los cambios se publican al instante, sin redesplegar.
- **"¿El usuario final ve la URL de la API?"** → No: en producción el navegador llama a `/api` en el **mismo dominio del sitio** y un rewrite de Vercel (en `vercel.json` del frontend) enruta ese `/api` al backend por atrás. La URL de la API no aparece en el código del cliente ni en la red del visitante. (Es una buena práctica que me señaló el profesor; no era requisito de la consigna.) En local uso `PUBLIC_API_URL` para apuntar al backend, y en el build sirve para los fetchs del sitio estático.
- **"¿Cómo se maneja el 'vacío'?"** → Cada lista muestra un mensaje específico (grilla: "Todavía no hay proyectos…"; servicio sin proyectos: texto propio; buscador: "sin resultados").
- **"¿Cuáles son las limitaciones?"** → El sync depende de la periodicidad del RSS y del scrape (6 horas por GitHub Actions, hasta 15 galerías por corrida, así que un cambio tarda hasta un día en recorrer los 42 proyectos), categorías nuevas sin página hasta el redeploy, base64 en la base (a futuro CDN), sin paginación aún.

## 5. Antes de cerrar

- Verifico que **https://agustinaportfolio.vercel.app** funcione (y `/proyectos`, `/servicios`, `/contacto`, `/admin`).
- Muestro el **panel `/admin`** en vivo para demostrar que el contenido es editable y se refleja al instante.
- Menciono el **registro de IA** (la consigna lo pide y el trabajo no puede ser una "caja negra"): la IA ayudó a implementar, pero las decisiones son mías y puedo explicar y modificar todo.
