# Evidencia de proceso

Bitácora del desarrollo del portfolio para el Examen Final de Programación Multimedial IV (Tecnología Multimedia — UMAI).

> El **historial de git** de este repositorio es en sí mismo evidencia del proceso: cada feature y cada corrección quedó commiteada y pusheada de forma incremental.

## Problema de comunicación que se quiso resolver

Presentar a Agustina Ferraro como **diseñadora multimedia y desarrolladora full stack** de forma profesional, con identidad propia. Además de "mostrar fotos de trabajos", la idea era demostrar que la persona puede **construir** una experiencia completa: sitio + API + base de datos + administración.

Se partió de una estructura clásica de portfolio (inicio, sobre mí, servicios, contacto) y se le sumó el sello técnico: **proyectos dinámicos administrables**, con detalle tipo Behance y panel propio.

## Alternativas exploradas y por qué se eligió cada una

| Alternativa | Qué se probó/consideró | Decisión |
| ----------- | ----------------------- | -------- |
| Redirigir a Behance en cada tarjeta | Era lo más barato (no cargar nada) | **Descartada.** La consigna pide experiencia e interactividad propias; un portfolio vacío que solo enlaza afuera no comunica nada. Se eligió **importar** el contenido de Behance a la base y mostrarlo en la app. |
| Login en un modal que aparece en la página (candado) | Nav con candado que abría un login | **Descartado por UX**: el modal con scroll era incómodo y no se veía bien en móvil. Se reemplazó por el candado que **linkea directo a `/admin`** (página dedicada). |
| Ruta dinámica `/proyectos/[id]` para el detalle | Lo natural en un SSR | **Imposible en Astro estático** (no se pueden pregenerar páginas para ids arbitrarios de la base). Se resolvió con `?id=` en la URL + el componente `GrillaProyectos` que decide entre grilla y detalle. |
| Subir imágenes grandes en base64 | Grababa, pero con imágenes pesadas fallaba | **Rechazado por el límite de tamaño de request de Vercel.** Se implementó **compresión en el navegador** (canvas → máx. 1280px, JPG q~0.8, fondo blanco para transparencias) antes de guardar. |
| Una sola imagen por proyecto | Lo mínimo viable | **Superado:** el detalle pide galería. Se agregó `imagenes` (colección), primera = portada, con selector que acepta varias a la vez. |
| Guardar categorías solo estáticas | Fácil | Se pidió crear categorías nuevas desde el admin; se agregaron a la base (`servicios` + slug automático) y se documentó que su **página propia** requiere sumarlas al data estático + redeploy. |

## Evolución de la estructura, la identidad y las interacciones

1. **Base:** site Astro + Tailwind con secciones estáticas; primer backend básico conectado a MongoDB Atlas.
2. **Proyectos dinámicos:** endpoint público + grilla React que consume la API; estados de carga/error/vacío; buscador.
3. **Admin real:** panel en `/admin` con usuario y clave en variables de entorno; alta/edición/borrado; subida de imágenes con compresión; bandeja de mensajes del formulario de contacto.
4. **Detalle tipo Behance:** click en una tarjeta → vista en grande del proyecto; si sos admin, botón "Editar" en el mismo detalle (con login si no hay sesión).
5. **Categorías:** selector de servicio en el panel, páginas por servicio, chips de filtro en la grilla y posibilidad de **crear categorías nuevas** desde el modo admin.
6. **Galería:** varias imágenes por proyecto con miniaturas en el detalle.
7. **Contenido:** importación desde el feed RSS de Behance para poblar la base sin carga manual.

Decisión de identidad sostenida desde el inicio: **tema oscuro** (zinc-950) con **violeta (#B884E7) solo en los botones** y **verde (#69F5CC) en los detalles de texto**, tipografía limpia, microanimaciones de hover y una marca gráfica consistente (logo circular, "Contactate", FAB "¡Hablemos!").

## Pruebas realizadas

- **Multiplataforma:** el site se probó en navegador de escritorio y en modo móvil (menú hamburguesa, grillas a 1/2/3 columnas, botón flotante). Cada deploy se verificó en producción con `curl` (códigos HTTP, respuestas JSON) y navegando el sitio publicado.
- **API:** se testearon los endpoints con `curl` en local y en producción: crear/editar/borrar proyectos, filtrar por `?servicio=` y `?destacados=`, detalle por id, crear categorías, verificación de clave (clave correcta → 200, clave vieja → 401).
- **Límites:** se probó el guardado de imágenes en pesos límite (cerca de 0.5 MB y más pesadas) para calibrar la compresión y el mensaje de error amigable.
- **Estados:** se verificó el estado vacío (sin proyectos cargados), error (API apagada) y carga.
- **Script de importación:** se ejecutó contra la base real: 12 proyectos importados desde Behance, re-ejecución no duplica (dedupe por link).

## Dificultades técnicas y cómo se resolvieron

1. **El guardado de imágenes grandes fallaba en Vercel** (límite de tamaño de request). → Compresión de imagen en el navegador antes de subir; si sigue pesando, mensaje de error claro.
2. **El build de Astro crasheaba al leer `window`** (lectura de `?id=` en el servidor del build). → Se movió todo acceso a `window`/`location` a `useEffect` (solo cliente).
3. **Verdad de que el sitio es estático** para los detalles de proyectos. → Se adoptó `?id=` y la sincronización con el historial (botón "atrás").
4. **Tests con `curl` en PowerShell:** los JSON inline se deformaban (los acentos y las comillas se escapaban). → Se escriben los bodies a un archivo temporal con `--data "@archivo"`; y para tildes (p. ej. "Fotografía") se escribe el archivo con UTF-8 sin BOM.
5. **Artefacto de encoding en test:** al crear una categoría con un archivo ASCII se guardó "Fotograf?a" (tildes rotas). → Se rehízo con UTF-8 real; las categorías de prueba quedaron limpiadas al final.
6. **Sin `rg` disponible en PowerShell** para revisar código. → Se usa `Select-String` o las herramientas de búsqueda del editor.

## Estado pendiente o mejorable (reconocido)

- Las **miniaturas importadas de Behance** son las que publica el feed (resolución media): para gran calidad se reemplazan desde el panel admin (imágenes propias a máx. 1280px).
- Las **categorías nuevas** creadas desde el admin no tienen página propia hasta agregarlas a `frontend/src/data/servicios.js` y redesplegar.
- **Paginación** en la grilla cuando haya muchos proyectos.
- Guardar imágenes en un **CDN** (URLs) en lugar de base64 para alivianar la base.
- Revisión de accesibilidad pendiente de una pasada con lector de pantalla (se priorizó foco visible, alt y estructura de encabezados).

## Proceso de trabajo

- Cada feature se construyó por capas: backend (modelo → ruta API), capa de datos del frontend (`src/api`), componente, y build + prueba local + deployment + verificación en producción.
- Se desarrolló con asistencia de IA (ver registro abajo) pero con revisión y prueba manual de cada paso: el código se compiló (`yarn astro build` / `node --check`), se probó contra la API local y publicada, y los cambios se deployaron incrementalmente.
- Se ramificó poco (repo personal) pero con **commits pequeños y descriptivos** que reconstruyen la evolución.

## Registro de uso de inteligencia artificial

Tal como pide la consigna, se registra el uso de herramientas de IA (asistente de programación **opencode**) durante el proceso:

**Para qué se utilizó**
- Implementar features completos (panel admin, detalle tipo Behance, galería de imágenes, filtros por categoría, buscador, importación desde Behance).
- Diagnosticar y resolver errores (límite de request de Vercel, `window` en build estático, tests con `curl`/PowerShell, problemas de encoding).
- Redactar esta documentación y el guía de defensa.

**Qué partes se revisaron, adaptaron o descartaron**
- Todo el código propuesto se **revisó, adaptó y probó** antes de considerar hecho: compilación, prueba local y en producción.
- Se descartaron sugerencias de la IA cuando no encajaban: por ejemplo "redirigir a Behance", "rutas dinámicas estándar" (inviables en estático) o subir imágenes sin límite (falaba en Vercel).

**Problemas, errores o límites detectados**
- La IA no podía prever el límite de request de Vercel ni la restricción del build estático; se detectaron probando el deploy real.
- Algunas soluciones propuestas por la IA se descartaron por no ajustarse a la identidad o al alcance elegido.

**Decisiones tomadas por la autora (no por la IA)**
- La identidad visual (tema oscuro + violeta en los botones y verde en los detalles de texto) y el tono de los textos.
- Elegir usuario y clave del panel.
- Preferir la página `/admin` dedicada al login modal.
- Elegir "importar desde Behance y mostrar en la app" en lugar de redirigir.
- Qué proyectos destacar y qué servicios incluir.
- Cuándo cada iteración estaba lista para deploy.