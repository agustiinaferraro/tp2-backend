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
4. **Detalle tipo Behance:** click en una tarjeta → vista en grande del proyecto; si estoy logueada como dueña, botón "Editar" en el mismo detalle.
5. **Categorías:** selector de servicio en el panel, páginas por servicio, chips de filtro en la grilla y posibilidad de **crear categorías nuevas** desde el modo admin.
6. **Galería:** varias imágenes por proyecto con miniaturas en el detalle.
7. **Contenido:** importación desde el feed RSS de Behance para poblar la base sin carga manual (y desde la API de Vercel para los trabajos de programación). Hoy la base tiene **57 proyectos**.
8. **Sesión con Firebase:** el panel dejó de usar "usuario y clave" y pasó a abrirse solo con mi **cuenta de dueña** (token validado en el backend). Sumé el perfil público (`/perfil`) con cuentas múltiples guardadas, **cambio de cuenta** desde el panel y eliminación de cuenta.
9. **Historial y restauración:** cada alta, edición o borrado de proyecto queda registrado en `historialproyectos`; lo eliminado se puede **restaurar en un click** desde el panel (idempotente: no duplica proyectos existentes).
10. **Refinamientos de UX:** botón de volver responsive en el detalle, `/perfil` abre directo el panel cuando la sesión es la mía, y corrección de una carrera de sesión al cambiar de cuenta (cierro Firebase *antes* de navegar para que no resucite la cuenta anterior).

La decisión de identidad la sostuve desde el inicio: **tema oscuro** (zinc-950) con **violeta (#B884E7) solo en los botones** y **verde (#69F5CC) en los detalles de texto**, tipografía limpia, microanimaciones de hover y una marca gráfica consistente (logo circular, "Contactate", FAB "¡Hablemos!").

## Pruebas que hice

- **Multiplataforma:** probé el site en navegador de escritorio y en modo móvil (menú hamburguesa, grillas a 1/2/3 columnas, botón flotante). Cada deploy lo verifiqué en producción con `curl` (códigos HTTP, respuestas JSON) y navegando el sitio publicado.
- **API:** testeié los endpoints con `curl` en local y en producción: crear/editar/borrar proyectos, filtrar por `?servicio=` y `?destacados=`, detalle por id, crear categorías, y permisos (token de la dueña → 200; sin token o de otra cuenta → 401).
- **Límites:** probé el guardado de imágenes en pesos límite (cerca de 0.5 MB y más pesadas) para calibrar la compresión y el mensaje de error amigable.
- **Estados:** verifiqué el estado vacío (sin proyectos cargados), error (API apagada) y carga.
- **Script de importación:** lo corrí contra la base real: los proyectos de Behance y de Vercel se importaron y la re-ejecución no duplica (dedupe por link). Hoy la base tiene 57 proyectos (42 esperados de Behance + 15 de Vercel; los links los reparé uno por uno hasta que los 41 de Behance en la base responden 200).

## Dificultades técnicas y cómo las resolví

1. **El guardado de imágenes grandes fallaba en Vercel** (límite de tamaño de request). → Compresión de imagen en el navegador antes de subir; si sigue pesando, mensaje de error claro.
2. **El build de Astro crasheaba al leer `window`** (lectura de `?id=` en el servidor del build). → Moví todo acceso a `window`/`location` a `useEffect` (solo cliente).
3. **Verdad de que el sitio es estático** para los detalles de proyectos. → Adopté `?id=` y la sincronización con el historial (botón "atrás").
4. **Tests con `curl` en PowerShell:** los JSON inline se deformaban (los acentos y las comillas se escapaban). → Escribo los bodies a un archivo temporal con `--data "@archivo"`; y para tildes (p. ej. "Fotografía") el archivo con UTF-8 sin BOM.
5. **Artefacto de encoding en test:** al crear una categoría con un archivo ASCII se guardó "Fotograf?a" (tildes rotas). → Lo rehice con UTF-8 real; las categorías de prueba quedaron limpiadas al final.
6. **Sin `rg` disponible en PowerShell** para revisar código. → Uso `Select-String` o las herramientas de búsqueda del editor.

## Estado pendiente o mejorable (reconocido)

- Las **miniaturas importadas de Behance** son las que publica el feed (resolución media): para gran calidad se reemplazan desde el panel admin (imágenes propias a máx. 1280px).
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
