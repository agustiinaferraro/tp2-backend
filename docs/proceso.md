# Evidencia de proceso

Bitácora del desarrollo de mi portfolio para el Examen Final de Programación Multimedial IV (Tecnología Multimedia — UMAI).

> El **historial de git** de este repositorio es en sí mismo evidencia del proceso: cada feature y cada corrección las commiteé y pusheé de forma incremental.

## El problema de comunicación que quise resolver

Presentarme como **diseñadora multimedia y desarrolladora full stack** de forma profesional, con identidad propia. Además de "mostrar fotos de trabajos", quería demostrar que yo puedo **construir** una experiencia completa: sitio + API + base de datos + administración.

Partí de una estructura clásica de portfolio (inicio, sobre mí, servicios, contacto) y le sumé el sello técnico: **proyectos dinámicos administrables**, con detalle tipo Behance y panel propio.

## Alternativas exploradas y por qué elegí cada una

| Alternativa | Qué probé/consideré | Mi decisión |
| ----------- | ------------------- | ----------- |
| Redirigir a Behance en cada tarjeta | Era lo más barato (no cargar nada) | **Descartada.** La consigna pide experiencia e interactividad propias; un portfolio vacío que solo enlaza afuera no comunica nada. Elegí **importar** el contenido de Behance a la base y mostrarlo en la app. |
| Login en un modal que aparece en la página (candado) | Nav con candado que abría un login | **Descartado por UX**: el modal con scroll era incómodo y no se veía bien en mobile. Lo reemplacé por el candado que **linkea directo a `/admin`** (página dedicada). |
| Ruta dinámica `/proyectos/[id]` para el detalle | Lo natural en un SSR | **Imposible en Astro estático** (no se pueden pregenerar páginas para ids arbitrarios de la base). Lo resolví con `?id=` en la URL + el componente `GrillaProyectos` que decide entre grilla y detalle. |
| Subir imágenes grandes en base64 | Grababa, pero con imágenes pesadas fallaba | **Rechazado por el límite de tamaño de request de Vercel.** Implementé **compresión en el navegador** (canvas → máx. 1280px, JPG q~0.8, fondo blanco para transparencias) antes de guardar. |
| Una sola imagen por proyecto | Lo mínimo viable | **Superado:** el detalle pide galería. Agregué `imagenes` (colección), primera = portada, con selector que acepta varias a la vez. |
| Guardar categorías solo estáticas | Fácil | Quise crear categorías nuevas desde el admin; se agregaron a la base (`servicios` + slug automático) y documenté que su **página propia** requiere sumarlas al data estático + redeploy. |

## Evolución de la estructura, la identidad y las interacciones

1. **Base:** site Astro + Tailwind con secciones estáticas; primer backend básico conectado a MongoDB Atlas.
2. **Proyectos dinámicos:** endpoint público + grilla React que consume la API; estados de carga/error/vacío; buscador.
3. **Admin real:** panel en `/admin` con usuario y clave en variables de entorno; alta/edición/borrado; subida de imágenes con compresión; bandeja de mensajes del formulario de contacto.
4. **Detalle tipo Behance:** click en una tarjeta → vista en grande del proyecto, con **galería completa, video, descripción, estadísticas y fecha de publicación sincronizadas desde Behance** (el visitante ve el proyecto entero sin salir del sitio). El detalle es solo lectura: cargar y editar proyectos lo hago desde el panel `/admin`, que tiene todos los campos (título, descripción, "Qué aprendí", tags, categorías, video, imágenes y destacado) más los checkboxes que le devuelven el control del texto a Behance. Primero el editor también vivía en el detalle con un botón "Editar", pero lo mudé entero al panel: en una página pública el botón se veía raro y daba la sensación de que solo se podía editar la descripción.
5. **Categorías:** selector de servicio en el panel, páginas por servicio, chips de filtro en la grilla y posibilidad de **crear categorías nuevas** desde el modo admin.
6. **Galería:** varias imágenes por proyecto con miniaturas en el detalle.
7. **Contenido:** importación desde el feed RSS de Behance para poblar la base sin carga manual (y desde la API de Vercel para los trabajos de programación). Hoy la base tiene **56 proyectos**.
8. **Sesión con Firebase:** el panel dejó de usar "usuario y clave" y pasó a abrirse solo con mi **cuenta de dueña** (token validado en el backend). Sumé el perfil público (`/perfil`) con cuentas múltiples guardadas, **cambio de cuenta** desde el panel y eliminación de cuenta.
9. **Historial y restauración:** cada alta, edición o borrado de proyecto queda registrado en `historialproyectos`; lo eliminado se puede **restaurar en un click** desde el panel (idempotente: no duplica proyectos existentes).
10. **Refinamientos de UX:** botón de volver responsive en el detalle, `/perfil` abre directo el panel cuando la sesión es la mía, y corrección de una carrera de sesión al cambiar de cuenta (cierro Firebase *antes* de navegar para que no resucite la cuenta anterior).
11. **Detalle sincronizado con Behance:** el script de importación ahora también **raspa cada galería** (imágenes completas en el orden original, video embebido, descripción completa, vistas/apreciaciones/comentarios, fecha de publicación y palabras clave) y lo guarda cacheado en Mongo. Corre cada 6 horas por GitHub Actions, con **tope de 15 galerías por corrida** y refresco máximo diario por proyecto (pausas de 2 segundos entre galerías para no molestar a Behance). Así el detalle del sitio es idéntico al de Behance sin depender de Behance en runtime; si una galería fue retirada, se detecta y no se vuelve a raspar. **Por defecto Behance manda** con título y descripción, pero si edito esos textos desde el panel quedan como propios (el sync no los pisa más) y un checkbox en el editor permite devolverles el control a Behance.
12. **API oculta tras el propio dominio:** el profesor me señaló que la API no debería saberla el usuario final. Como el sitio es estático no tengo backend propio en runtime, pero lo resolví con un **rewrite de Vercel**: el navegador llama a `/api` en el dominio del sitio y Vercel enruta eso al backend por atrás. El código del frontend ya no contiene la URL de la API (en desarrollo y en el build sigue usando `PUBLIC_API_URL`).
13. **Textos propios y servicios completos (feedback del profesor):** me pidió destacar más los proyectos ("no solo una foto y un enlace") y reflejar **qué aprendí** de cada uno, y señaló que faltaba completar Servicios. Sumé a cada proyecto un campo **"Qué aprendí"**: texto propio que se escribe desde el panel, se muestra como sección destacada del detalle y que el sync de Behance nunca toca (no existe allá). Además agregué una vista **Servicios** en el panel para editar nombre, descripción y una lista **"Qué incluye"** de cada categoría; esos textos se ven en la página del servicio **al instante**, sin redeploy.
14. **Ediciones de Behance sin duplicados (bug propio):** como ahora edito todo desde Behance, un renombre rompía el sync: al cambiar el título cambia también el slug del link, y como el importador buscaba por el link completo, cada renombre **creaba un proyecto duplicado**. Lo arreglé buscando por el **número de galería** (el id que lleva la URL, que nunca cambia), refrescando el link al slug nuevo y actualizando el registro existente. También cambié de dónde salen los datos: **título, descripción y portada** ahora los toma el scrape de la galería (`og:title`, `og:image` y el bloque `json-ld` de la propia página), porque el feed RSS manda los títulos con un "?" donde va el separador y solo cubre los últimos 12 proyectos. Así puedo renombrar, reescribir la descripción o cambiar la miniatura en Behance y a la próxima corrida se ve en el portfolio, **en los 42 proyectos** (con portada en alta, en vez de las 404px del feed); lo único que sigo respetando es lo que edito a mano desde el panel. De regalo: si Behance devuelve la galería vacía (le pasa a los proyectos marcados como **contenido maduro**, que Behance bloquea a los visitantes sin sesión y hasta les pide iniciar para verlo), el sync lo detecta con el endpoint público en JSON, lo avisa en el log de GitHub Actions y completa lo que pueda desde ahí — así descubrí que *Demo de Moon to Mars* estaba con esa casilla puesta y por eso no bajaba su video.

15. **Videos y animaciones que se mueven solos (misma vuelta del feedback):** no quería que los proyectos de video/animación se vieran recién adentro del detalle. Sumé un **preview en cada tarjeta**: si el proyecto tiene video, la grilla y los carruseles lo reproducen **solo, mudo y en loop** (recién cuando la tarjeta entra en pantalla, así con la página cargada no se bajan todos los videos de una); si lo que subí es un **gif animado**, la tarjeta y el **hero** de la home lo muestran moviéndose igual. El hero ahora filtra **solo con "tiene video" o "está categorizado como video/animación"** (antes exigía las dos cosas, y por eso los gif y los videos con categoría distinta quedaban afuera): no tengo que avisar cuáles entran, el sync de Behance los trae solos cada 6 horas y si uno deja de ser de video sale solo. Y si el video no carga (sin conexión, Adobe caído o la url firmada vencida) o tarda demasiado, la tarjeta cae a la imagen de Behance y, si esa tampoco, a la miniatura con la inicial del título: nunca queda un hueco ni un cuadro negro. Y como los proyectos de animación son los que más llaman la atención (se ven moviéndose), ahora van **primero en todos los listados** —chips, secciones y tarjetas—; Edición de Video, que comparte proyectos con Motion Graphics, va al final para que no queden dos carruseles casi iguales pegados (antes era al revés: animación quedaba última).

16. **Forma de escudo como lenguaje visual:** la identidad dejó de apoyarse solo en el color. Las tarjetas de **Servicios** ahora tienen **punta de escudo abajo al centro** (un `clip-path` en CSS; el borde va en una capa doble porque el recorte se come el borde fino), más altas para que la punta respire, con el "Ver detalles →" centrado. La card de **Sobre mí** de la home sigue el mismo lenguaje: más grande (la foto pasa a ~270 px), borde con gradiente de la paleta **en violeta** (violeta → verde) que se enciende en hover, y **toda la tarjeta es un enlace a `/sobre-mi`** (así el hover y el active llevan al recorrido completo). En la misma vuelta arreglé dos detalles del detalle de proyecto: la descripción se mostraba **dos veces** (el guard comparaba el HTML crudo contra el texto limpio y nunca matcheaba) y, si el proyecto tiene video, la galería ya no arrastra imágenes de más: muestra solo las de Behance (la captura y la portada propias quedaban repetidas).

17. **El fondo de la sección, ahora en toda la app (decisión de diseño):** el fondo que quedó detrás de la card de Sobre mí —degradé oscuro con las dos luces de la paleta (verde arriba a la izquierda, violeta abajo a la derecha) y la grama de puntos— me quedó tan bien que lo convertí en una clase compartida (`.fondo-seccion`) y lo apliqué a **todas las secciones de la home y al `main` de todas las páginas** (proyectos, servicios y su detalle, sobre mí, contacto, perfil, admin y recuperar contraseña): la app entera tiene la misma textura en lugar del negro plano. Y para que resalte sobre ese fondo, la card de Sobre mí ahora es **blanca con texto negro adentro**; el borde de escudo en colores, el halo violeta/verde de la foto y el botón verde siguen siendo los acentos de la paleta.

La decisión de identidad la sostuve desde el inicio: **tema oscuro** (zinc-950) con **violeta (#B884E7) solo en los botones** y **verde (#69F5CC) en los detalles de texto**, tipografía limpia, microanimaciones de hover, la **forma de escudo** en las tarjetas de servicios y sobre mí, y una marca gráfica consistente (logo circular, "Contactate", FAB "¡Hablemos!").

## Pruebas que hice

- **Multiplataforma:** probé el site en navegador de escritorio y en modo móvil (menú hamburguesa, grillas a 1/2/3 columnas, botón flotante). Cada deploy lo verifiqué en producción con `curl` (códigos HTTP, respuestas JSON) y navegando el sitio publicado.
- **API:** testeié los endpoints con `curl` en local y en producción: crear/editar/borrar proyectos, filtrar por `?servicio=` y `?destacados=`, detalle por id, crear categorías, y permisos (token de la dueña → 200; sin token o de otra cuenta → 401).
- **Límites:** probé el guardado de imágenes en pesos límite (cerca de 0.5 MB y más pesadas) para calibrar la compresión y el mensaje de error amigable.
- **Estados:** verifiqué el estado vacío (sin proyectos cargados), error (API apagada) y carga.
- **Script de importación:** lo corrí contra la base real: los proyectos de Behance y de Vercel se importaron y la re-ejecución no duplica (dedupe por número de galería, que sobrevive a los renombres; el intento de duplicados que provocó un cambio de slug lo fusioné a mano y quedó en 55 proyectos: 42 de Behance + 13 de Vercel; después saqué uno de Vercel desde el panel (quedó en 54) y más adelante sumé dos trabajos de programación desde el mismo panel —*Dags* y *Prog3 Tp Finalback*—, así que hoy la base tiene **56: 42 de Behance + 14 propios**, y el historial me lo deja restaurar). Probé además la extracción de detalle contra galerías reales (imágenes, video, descripción, stats y fecha) y corrí el backfill completo: **42 proyectos con detalle**, con título, descripción y portada tomados de la propia página de Behance; la única galería que Behance responde como retirada queda marcada para no reintentar en cada corrida (el 404 es el que la detecta, no el contenido del HTML, porque Behance manda variantes de página distintas y me habían hecho marcar como borrada una galería viva).

## Dificultades técnicas y cómo las resolví

1. **El guardado de imágenes grandes fallaba en Vercel** (límite de tamaño de request). → Compresión de imagen en el navegador antes de subir; si sigue pesando, mensaje de error claro.
2. **El build de Astro crasheaba al leer `window`** (lectura de `?id=` en el servidor del build). → Moví todo acceso a `window`/`location` a `useEffect` (solo cliente).
3. **Verdad de que el sitio es estático** para los detalles de proyectos. → Adopté `?id=` y la sincronización con el historial (botón "atrás").
4. **Tests con `curl` en PowerShell:** los JSON inline se deformaban (los acentos y las comillas se escapaban). → Escribo los bodies a un archivo temporal con `--data "@archivo"`; y para tildes (p. ej. "Fotografía") el archivo con UTF-8 sin BOM.
5. **Artefacto de encoding en test:** al crear una categoría con un archivo ASCII se guardó "Fotograf?a" (tildes rotas). → Lo rehice con UTF-8 real; las categorías de prueba quedaron limpiadas al final.
6. **Sin `rg` disponible en PowerShell** para revisar código. → Uso `Select-String` o las herramientas de búsqueda del editor.

7. **El carrusel de destacados "giraba rapidísimo" y después quedaba vacío.** → La lista duplicada se anima con `translateX(-50%)`, es decir sobre el ancho de la propia fila. Las tarjetas tenían el ancho en `clamp(…, 60%, …)` y como la fila se dimensiona en `max-content`, el navegador sumaba el contenido entero de cada card (portadas a tamaño natural, ~4.000 px cada una) en vez de los 224 px finales: la fila media **63.000 px**, el loop pasaba a más de 1.000 px/s y al llegar al 50% (donde debería reiniciar) lo que se veía era puro espacio en blanco, así que parecía que nunca volvía a empezar. Lo resolví con **ancho fijo** en las tarjetas del destacado (el mismo 14rem que ya se veía) y volví a la animación global `.animate-carrusel-loop` de `global.css`, que además respeta `prefers-reduced-motion`.

## Estado pendiente o mejorable (reconocido)

- Las **portadas** se refrescan desde la propia galería de Behance (`og:image`, variante en alta), también para los proyectos que no están en el feed; si la miniatura la reemplazo con una imagen propia desde el panel (data uri), el sync la respeta y no la pisa.
- Las **categorías nuevas** creadas desde el admin no tienen página propia hasta agregarlas a `tp2-frontend/src/data/servicios.js` y redesplegar.
- **Paginación** en la grilla cuando haya muchos proyectos.
- Guardar imágenes en un **CDN** (URLs) en lugar de base64 para alivianar la base.
- Revisión de accesibilidad pendiente de una pasada con lector de pantalla (prioricé foco visible, alt y estructura de encabezados).

## Mi proceso de trabajo

- Cada feature la construí por capas: backend (modelo → ruta API), capa de datos del frontend (`src/api`), componente, y build + prueba local + deployment + verificación en producción.
- Trabajé con asistencia de IA (ver registro abajo) pero con revisión y prueba manual de cada paso: compilé el código (`yarn astro build` / `node --check`), lo probé contra la API local y publicada, y deployé los cambios incrementalmente.
- Me ramifiqué poco (repo personal) pero con **commits pequeños y descriptivos** que reconstruyen la evolución.

## Registro de uso de inteligencia artificial

Tal como pide la consigna, registro acá el uso de herramientas de IA (asistente de programación **opencode**) durante mi proceso:

**Para qué la utilicé**
- Implementar features completos (panel admin, detalle tipo Behance, galería de imágenes, filtros por categoría, buscador, importación desde Behance, historial con restauración, cambio de cuenta multi-sesión).
- Diagnosticar y resolver errores (límite de request de Vercel, `window` en build estático, tests con `curl`/PowerShell, problemas de encoding, carreras de sesión al cambiar de cuenta).
- Redactar esta documentación y la guía de defensa.

**Qué partes revisé, adapté o descarté**
- Todo el código que propuso lo **revisé, adapté y probé** antes de considerarlo hecho: compilación, prueba local y en producción.
- Descarté sus sugerencias cuando no encajaban: por ejemplo "redirigir a Behance", "rutas dinámicas estándar" (inviables en estático) o subir imágenes sin límite (falaba en Vercel).

**Problemas, errores o límites que detecté**
- La IA no podía prever el límite de request de Vercel ni la restricción del build estático; los detecté probando el deploy real.
- Algunas soluciones que propuso las descarté por no ajustarse a la identidad o al alcance elegido.

**Decisiones de diseño y arquitectura**
- La identidad visual (tema oscuro + violeta en los botones y verde en los detalles de texto) y el tono de los textos.
- Qué cuenta (mi email) es la única que puede entrar al panel.
- Preferir la página `/admin` dedicada al login modal.
- Elegir "importar desde Behance y mostrar en la app" en lugar de redirigir.
- Qué proyectos destacar y qué servicios incluir.
- Cuándo cada iteración estaba lista para deploy.
