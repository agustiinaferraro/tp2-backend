//rutas de la api para sincronizar el portfolio con behance (automatico)
//behance protege las paginas con un desafio de javascript: se resuelve reenviando
//la cookie js_challenge_value que el propio desafio entrega en la respuesta
//- los proyectos nuevos se importan del feed rss (los ultimos 12 publicados)
//- el detalle de cada galeria (imagenes completas, video, descripcion, estadisticas,
//  fecha de publicacion y keywords) se raspa de la propia pagina de la galeria y se
//  guarda cacheado en mongo, para que el detalle del sitio no tenga que salir a behance
import { Router } from 'express';
import Proyecto from '../models/Proyecto.js';
import esAdmin from '../middlewares/esAdmin.js';

const router = Router();

const URL_RSS = 'https://www.behance.net/agustiinaferraro.rss';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

//fetchea una url de behance saltando el desafio que pide evaluar javascript
//(el desafio llega como 403 y entrega la cookie js_challenge_value; se repite con esa cookie,
//volviendo a leer el valor si behance vuelve a desafiar)
//devuelve el status y el texto juntos: el status hace falta para distinguir una galeria
//borrada (404) de una pagina viva que vino en otra variante (behance no siempre manda el
//mismo html, y sin el codigo no se podria saber si el proyecto existe o no)
async function fetchBehance(url, intentos = 4) {
  let cookie = '';
  let status = 0;
  for (let i = 0; i < intentos; i++) {
    const respuesta = await fetch(url, {
      headers: cookie ? { 'user-agent': USER_AGENT, cookie } : { 'user-agent': USER_AGENT },
    });
    status = respuesta.status;
    const texto = await respuesta.text();
    const desafio = texto.match(/js_challenge_value=([a-f0-9]{64,})/);
    if (desafio) {
      //la cookie va con nombre: mandando solo el valor behance vuelve a responder 403
      cookie = `js_challenge_value=${desafio[1]}`;
      continue;
    }
    return { status, texto };
  }
  //si se agotaron los intentos devuelve vacio (behance no dejo entrar)
  return { status, texto: '' };
}

//orden de preferencia de las variantes de imagen que behance repite para cada archivo:
//se elige la mas chica que sirva bien en pantalla (el "source" es el original y pesa una bocha)
const VARIANTES = ['max_1200', '1400', 'hd', 'disp', 'source', 'fs'];

//prioridad de una variante para elegir la mejor de cada archivo;
//las webp y las desconocidas quedan ultimas: sirven si no hay otra cosa
function prioridadVariante(variante) {
  const i = VARIANTES.indexOf(variante);
  if (i !== -1) return i;
  return VARIANTES.length + (/_webp$/.test(variante) ? 1 : 0);
}

//lee un string json que abre en "inicio" (la posicion de la comilla de apertura)
//devuelve el texto ya desescapado (\n, \", \uXXXX) y la posicion despues de la comilla de cierre;
//hace falta porque las descripciones del estado embebido traen saltos de linea escapados
function leerTextoJson(texto, inicio) {
  let i = inicio + 1;
  let salida = '';
  while (i < texto.length) {
    const c = texto[i];
    if (c === '\\') {
      const sig = texto[i + 1];
      if (sig === 'n') salida += '\n';
      else if (sig === 't') salida += '\t';
      else if (sig === 'u') {
        salida += String.fromCharCode(parseInt(texto.slice(i + 2, i + 6), 16) || 0);
        i += 6;
        continue;
      } else salida += sig;
      i += 2;
      continue;
    }
    if (c === '"') return { texto: salida, fin: i + 1 };
    salida += c;
    i += 1;
  }
  return { texto: salida, fin: texto.length };
}

//hash del nombre de archivo de behance (ej: da20c2195685239.66123b817731c.jpg -> 66123b817731c)
//la portada y la galeria usan prefijos distintos para el mismo render, pero el hash coincide;
//asi se puede comparar la portada con las imagenes de la galeria sin repetirlas
function hashDeArchivo(nombre) {
  return String(nombre ?? '').split('.')[1] ?? '';
}

//el texto del estado de behance a veces viene con los escapes de json anidados (\\n, \\"), que
//quedan como texto literal dentro del string ya parseado: se les da una pasada mas para dejar
//texto plano con saltos de linea reales (sin eso el resumen mostraria "\n" a la vista)
function desescapar(texto) {
  return String(texto ?? '')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/');
}

//lee la descripcion del bloque json-ld de la pagina: es la descripcion canonica del proyecto
//(la que behance muestra en la ficha) y la unica fuente que no depende de la variante de la
//pagina que toque; devuelve vacio si el bloque no la trae, para que se use el estado embebido
function descripcionDelJsonLd(html) {
  const bloque = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (!bloque) return '';
  try {
    const datos = JSON.parse(bloque[1]);
    let mejor = '';
    const recorrer = (nodo) => {
      if (!nodo || typeof nodo !== 'object') return;
      if (Array.isArray(nodo)) {
        nodo.forEach(recorrer);
        return;
      }
      if (typeof nodo.description === 'string' && nodo.description.length > mejor.length) {
        mejor = nodo.description;
      }
      Object.values(nodo).forEach(recorrer);
    };
    recorrer(datos);
    return mejor;
  } catch {
    //json roto: se ignora y se sigue con el estado embebido
    return '';
  }
}

//trae el detalle completo de una galeria de behance con un solo fetch de su pagina:
//el html trae embebido el estado con todos los modulos (imagenes y players de video),
//la descripcion completa, las estadisticas, la fecha de publicacion y las keywords
//recibe tambien la portada del proyecto para no repetirla dentro de la galeria
//devuelve null si behance no dejo entrar (se reintenta en la proxima corrida), o un detalle
//con disponible: false si la galeria llego entera pero ya no existe (proyecto borrado o
//retirado de behance): ese caso se marca sincronizado para no rasparlo en cada corrida
export async function detalleDeGaleria(link, imagenPortada = '') {
  //el id viene casi siempre en el propio link; el oembed es el plan b por los links viejos sin slug
  let id = link.match(/behance\.net\/gallery\/(\d+)/)?.[1] ?? '';
  if (!id) {
    try {
      const oembed = await fetchBehance(
        `https://www.behance.net/services/oembed?url=${encodeURIComponent(link)}`
      );
      id = JSON.parse(oembed.texto)?.url?.match(/gallery\/(\d+)/)?.[1] ?? '';
    } catch {
      //sin oembed no hay como saber el id de la galeria
    }
  }
  if (!id) return null;

  const { status, texto: html } = await fetchBehance(`https://www.behance.net/gallery/${id}/modules`);
  //respuestas cortas significan que el desafio no se pudo saltear: se reintenta en la proxima corrida
  if (html.length < 100000) return null;
  //la galeria responde 404: behance borro o retiro el proyecto, se marca para no volver a
  //entrar; los datos que ya se tenian se conservan tal cual
  if (status === 404) {
    return {
      imagenes: [],
      titulo: '',
      portada: '',
      descripcion: '',
      estadisticas: null,
      publicadoEn: null,
      palabrasClave: [],
      ccv: null,
      disponible: false,
    };
  }

  //imagenes: behance repite cada archivo en varias variantes (calidades); se dedupea por
  //nombre de archivo quedandose con la mejor variante, en el orden en que aparecen los modulos
  const porArchivo = new Map();
  const regexImagen =
    /https:\\?\/\\?\/mir-s3-cdn-cf\.behance\.net\/project_modules\/([a-z0-9_]+)\/([A-Za-z0-9._-]+)/g;
  for (const m of html.matchAll(regexImagen)) {
    const variante = m[1];
    const archivo = m[2];
    const actual = porArchivo.get(archivo);
    if (actual === undefined || prioridadVariante(variante) < prioridadVariante(actual)) {
      porArchivo.set(archivo, variante);
    }
  }

  //sin la portada repetida: si es la misma pieza que behance usa de miniatura, ya esta arriba
  const hashPortada =
    imagenPortada && !/^data:/i.test(imagenPortada)
      ? hashDeArchivo(imagenPortada.split('/').pop())
      : '';
  const imagenes = [];
  for (const [archivo, variante] of porArchivo) {
    if (hashPortada && hashDeArchivo(archivo) === hashPortada) continue;
    imagenes.push(`https://mir-s3-cdn-cf.behance.net/project_modules/${variante}/${archivo}`);
  }

  //titulo del proyecto: el og:title viene como "Titulo - Autor" y es la unica fuente confiable,
  //porque el feed rss de behance manda los titulos con un "?" donde deberia ir el separador
  //(behance rompe ese caracter al generar el feed, pero la pagina lo muestra bien)
  const ogTitulo = html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? '';
  const titulo = decodificarEntidades(ogTitulo).replace(/\s*-\s*Agustina Ferraro\s*$/, '').trim();

  //portada actual: el og:image trae la variante mas grande y es la unica forma de enterarse
  //de que la dueña cambio la miniatura en behance (el feed rss solo cubre los ultimos 12)
  const portada = html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? '';

  //descripcion completa: primero la del json-ld (canonica); si no esta, la mas larga de las que
  //aparezcan en el estado embebido de la pagina
  let descripcion = descripcionDelJsonLd(html);
  if (!descripcion) {
    let posicion = 0;
    while (posicion < html.length) {
      const marca = html.indexOf('"description":"', posicion);
      if (marca === -1) break;
      //marca apunta a la comilla que abre la clave; el valor arranca 14 caracteres mas adelante
      const leido = leerTextoJson(html, marca + 14);
      if (leido.texto.length > descripcion.length) descripcion = leido.texto;
      posicion = Math.max(leido.fin, marca + 15);
    }
  }
  descripcion = decodificarEntidades(desescapar(descripcion));

  //estadisticas: behance las guarda juntas en "stats" cerca del cierre del estado
  let estadisticas = null;
  const marcaStats = html.indexOf('"stats":{');
  if (marcaStats !== -1) {
    const ventana = html.slice(marcaStats, marcaStats + 400);
    const apreciaciones = ventana.match(/"appreciations":\{"all":(\d+)\}/);
    const vistas = ventana.match(/"views":\{"all":(\d+)\}/);
    const comentarios = ventana.match(/"comments":\{"all":(\d+)\}/);
    if (apreciaciones || vistas || comentarios) {
      estadisticas = {
        vistas: vistas ? Number(vistas[1]) : 0,
        apreciaciones: apreciaciones ? Number(apreciaciones[1]) : 0,
        comentarios: comentarios ? Number(comentarios[1]) : 0,
      };
    }
  }

  //fecha de publicacion: behance la muestra en un <time datetime="April 7th 2024">;
  //el created_on del estado es el plan b (y se trata como utc para que no corra de dia)
  let publicadoEn = null;
  const marcaTiempo = html.match(/<time[^>]*datetime="([^"]+)"/);
  if (marcaTiempo) {
    const sinOrdinal = marcaTiempo[1].replace(/(\d)(st|nd|rd|th)/i, '$1');
    const fecha = new Date(sinOrdinal);
    if (!Number.isNaN(fecha.getTime())) publicadoEn = fecha;
  }
  if (!publicadoEn) {
    const creada = html.match(/"created_on":"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})"/);
    if (creada) {
      const fecha = new Date(creada[1].replace(' ', 'T') + 'Z');
      if (!Number.isNaN(fecha.getTime())) publicadoEn = fecha;
    }
  }

  //keywords del proyecto: el meta keywords trae la lista separada por comas
  const keywords = html.match(/<meta name="keywords" content="([^"]*)"/)?.[1] ?? '';
  const palabrasClave = keywords
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  //video: el embed de adobe ccv (el mismo que resuelve el hero de la home en vivo)
  const ccv = html.match(/player\/ccv\/([A-Za-z0-9_-]{6,})\/embed/)?.[1] ?? null;

  return { imagenes, titulo, portada, descripcion, estadisticas, publicadoEn, palabrasClave, ccv };
}

//el endpoint publico de behance devuelve el proyecto en json, con los modulos (imagenes y
//video) adentro; se usa de red de seguridad cuando la pagina no muestra la galeria en html:
//behance la entrega vacia a los visitantes sin sesion cuando el proyecto esta marcado como
//contenido maduro (ahi ni el video ni las imagenes aparecen en el html, solo en json y solo
//para quien tenga sesion)
export async function detalleDeApi(id) {
  if (!id) return null;
  const { status, texto } = await fetchBehance(
    `https://www.behance.net/v2/projects/${id}?client_id=BehanceWebSusi1`
  );
  if (status !== 200 || !texto) return null;
  let proyecto;
  try {
    proyecto = JSON.parse(texto)?.project;
  } catch {
    //respuesta rara: se ignora y se vuelve a probar en la proxima corrida
    return null;
  }
  if (!proyecto) return null;

  const imagenes = [];
  let video = '';
  for (const modulo of proyecto.modules ?? []) {
    if (modulo.type === 'image') {
      const tamanios = modulo.sizes ?? {};
      imagenes.push(tamanios.max_1200 ?? tamanios.disp ?? modulo.src ?? '');
    }
    if (modulo.type === 'video' && !video) {
      const src = String(modulo.src ?? '');
      if (/player\/ccv\//.test(src)) video = src;
      else if (/^https?:.*\.mp4/i.test(src)) video = src;
      else {
        //algunos videos no traen src directo: se busca dentro del modulo (embed o renditions)
        const pegado = JSON.stringify(modulo);
        const ccv = pegado.match(/player\/ccv\/([A-Za-z0-9_-]{6,})\/embed/);
        const mp4 = pegado.match(/https?:\/\/[^"\\]+\.mp4[^"\\]*/);
        if (ccv) video = `https://www-ccv.adobe.io/v1/player/ccv/${ccv[1]}/embed?api_key=behance1`;
        else if (mp4) video = mp4[0];
      }
    }
  }

  return {
    matureContent: proyecto.mature_content === 1,
    imagenes: imagenes.filter(Boolean),
    video,
  };
}

//decodifica las entidades html que behance deja en los textos (&quot;, &amp;, &lt;, ...);
//hace falta en el titulo y en la descripcion completa, que se guardan como se ven en la pagina
function decodificarEntidades(texto) {
  return String(texto ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

//quita etiquetas de html y deja el texto limpio
function limpiarHTML(texto) {
  return decodificarEntidades(String(texto ?? '').replace(/<img[^>]*>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

//saca el valor de un campo con cdata de un trozo de xml del feed
function obtenerCampo(bloque, nombre) {
  const m = bloque.match(new RegExp(`<${nombre}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]\\s*>`, 'i'));
  return m ? m[1] : '';
}

//primera imagen del bloque html de la descripcion (miniatura del proyecto)
function obtenerPortada(descripcion) {
  const m = descripcion.match(/<img[^>]+src=['"]([^'"]+)['"]/i);
  return m ? m[1] : '';
}

//categorias para proyectos nuevos importados solos (se detectan por palabras del titulo)
function categoriasPorTitulo(titulo) {
  const t = (titulo ?? '').toUpperCase();
  if (/(ANIMAC|LOGO ANIMADO|TRAILER|TIPOGRAFIA ANIMADA|MOTION|VIDEO|3D)/.test(t)) {
    return ['edicion-de-video', 'motion-graphics'];
  }
  //landing con video promocional: la landing manda (ux/ui) y el video suma las categorias de motion
  //va antes de la regla de ux/ui, que tambien cazaria la palabra "landing"
  if (/LANDING/.test(t) && /(VIDEO|PROMO)/.test(t)) {
    return ['diseno-ux-ui', 'edicion-de-video', 'motion-graphics'];
  }
  if (/(WEB|APP MOBILE|INTERFAZ|LANDING|UX|UI|MOBILE|MOODBOARD|PROTOTIPO|RESTYLING)/.test(t)) {
    return ['diseno-ux-ui'];
  }
  if (/(FLYER|AFICHE|POSTER|BANNER|CERTIFICADO|BRANDING|IDENTIDAD|INVITACION|GRAFICO|LOGO|REDES)/.test(t)) {
    return ['diseno-grafico-identidad'];
  }
  if (/(PROG|PROGRAMACION|ECOMMERCE|BACKEND|FRONTEND)/.test(t)) {
    return ['desarrollo-full-stack'];
  }
  return [];
}

//trae los proyectos nuevos del feed rss (los ultimos 12 publicados), crea los que falten y
//refresca titulo, resumen, portada y link de los que ya estan;
//la busqueda es por el numero de galeria y no por el link entero, porque behance cambia el
//slug del link cada vez que cambia el titulo del proyecto (si no, un renombre duplicaria)
export async function importarRss() {
  const { texto: xml } = await fetchBehance(URL_RSS);
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  if (items.length === 0) {
    throw new Error('El feed llego vacio (posible bloqueo de behance)');
  }

  let creados = 0;
  let actualizados = 0;
  let aldia = 0;
  const importados = [];

  for (const item of items) {
    const descripcion = obtenerCampo(item, 'description');
    const titulo = limpiarHTML(obtenerCampo(item, 'title'));
    const link = obtenerCampo(item, 'link').trim();
    const resumen = limpiarHTML(descripcion);
    const imagen = obtenerPortada(descripcion);

    if (!titulo || !link) continue;

    const idGaleria = link.match(/behance\.net\/gallery\/(\d+)/)?.[1] ?? '';
    const existente = idGaleria
      ? await Proyecto.findOne({ link: new RegExp(`behance\\.net\\/gallery\\/${idGaleria}(\\/|\\?|$)`) })
      : await Proyecto.findOne({ link });
    if (existente) {
      const cambios = {};
      //el link se deja como lo tiene behance hoy, por si cambio el slug del proyecto
      if (existente.link !== link) cambios.link = link;
      //el titulo solo se toma si el feed lo mando limpio: si trae un "?" entre palabras es que
      //behance rompio el separador, y ahi manda el de la pagina (lo levanta importarDetalles)
      const tituloMangled = /\s\?\s/.test(titulo);
      if (!existente.tituloManual && !tituloMangled && existente.titulo !== titulo) {
        cambios.titulo = titulo;
      }
      //el resumen es la descripcion de behance: la misma que levanta importarDetalles
      //(las dos fuentes dan el mismo texto, asi que no se pisan entre ellas)
      if (!existente.resumenManual && resumen && existente.resumen !== resumen) cambios.resumen = resumen;
      //la portada NO se toca desde el rss: ahi viene en baja (404px) y pisaria la que ya salio
      //de la galeria; la miniatura la refresca importarDetalles, que lee el og:image en alta
      if (Object.keys(cambios).length) {
        await Proyecto.updateOne({ _id: existente._id }, cambios);
        actualizados++;
      } else {
        aldia++;
      }
      continue;
    }

    const servicios = categoriasPorTitulo(titulo);
    const creado = await Proyecto.create({
      titulo,
      resumen,
      imagen,
      imagenes: [],
      link,
      servicio: servicios[0] ?? '',
      servicios,
      tags: [],
      destacado: false,
    });
    creados++;
    importados.push(creado);
  }

  return { items: items.length, creados, actualizados, aldia, importados };
}

//refresca el detalle completo (imagenes, video, descripcion, estadisticas, fecha y keywords)
//de los proyectos de behance: cada proyecto se vuelve a raspar como maximo 1 vez por dia
//el tope por corrida evita pasarse del tiempo de una funcion de vercel y reparte el primer
//cargado (todavia sin detalle) a lo largo de varias corridas
export async function importarDetalles(tope = 15) {
  const haceVeinteHoras = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const limites = await Proyecto.find({
    link: /behance\.net\/gallery\//,
    $or: [
      { sincronizadoDetalleEn: null },
      { sincronizadoDetalleEn: { $exists: false } },
      { sincronizadoDetalleEn: { $lt: haceVeinteHoras } },
    ],
  })
    //los que mas llevan sin refrescar van primero
    .sort({ sincronizadoDetalleEn: 1 })
    .limit(tope)
    .lean();

  let sincronizados = 0;
  let fallidos = 0;
  let sinGaleria = 0;
  let imagenesTotales = 0;

  for (const proyecto of limites) {
    let detalle = null;
    try {
      detalle = await detalleDeGaleria(proyecto.link, proyecto.imagen);
    } catch {
      //cualquier error de red o de parseo se trata como galeria no disponible
      detalle = null;
    }

    if (detalle && detalle.disponible === false) {
      //behance retiro el proyecto: se marca como visto para que no vuelva a entrar en el tope
      //(los datos que ya se tenian se conservan tal cual)
      await Proyecto.updateOne(
        { _id: proyecto._id },
        { $set: { sincronizadoDetalleEn: new Date(), ultimoChequeoVideo: new Date() } }
      );
      sinGaleria++;
    } else if (detalle) {
      //si la pagina no dejo ver ni la galeria ni el video (behance la entrega vacia a los que
      //no tienen sesion, que es lo que pasa con los proyectos marcados como contenido maduro),
      //se prueba con el endpoint publico en json; ese mismo dato avisa si el proyecto esta
      //bloqueado por esa casilla, para que el log explique por que no baja nada
      let bloqueadoMadurez = false;
      if (!detalle.imagenes.length || !detalle.ccv) {
        const api = await detalleDeApi(proyecto.link.match(/gallery\/(\d+)/)?.[1] ?? '');
        if (api) {
          if (api.matureContent) {
            bloqueadoMadurez = true;
            console.warn(
              `aviso: "${proyecto.titulo}" esta marcado como contenido maduro en behance; hasta que no se saque esa casilla behance no entrega ni el video ni la galeria a los visitantes sin sesion`
            );
          }
          if (!detalle.imagenes.length && api.imagenes.length) detalle.imagenes = api.imagenes;
          if (!detalle.ccv && api.video) detalle.videoUrl = api.video;
        }
      }
      const cambios = {
        imagenesBehance: detalle.imagenes,
        palabrasClave: detalle.palabrasClave,
        estadisticas: detalle.estadisticas,
        publicadoEn: detalle.publicadoEn,
        sincronizadoDetalleEn: new Date(),
        ultimoChequeoVideo: new Date(),
      };
      //titulo y resumen salen siempre de la pagina de behance: es la fuente unica, asi un
      //renombre o una descripcion nueva hechos ahi llegan a todos los proyectos (el rss solo
      //cubre los ultimos 12) y ademas sin el "?" con el que el feed rompe el separador;
      //los campos marcados a mano desde el panel se respetan como hasta ahora
      if (!proyecto.tituloManual && detalle.titulo && detalle.titulo !== proyecto.titulo) {
        cambios.titulo = detalle.titulo;
      }
      const resumen = limpiarHTML(detalle.descripcion);
      if (!proyecto.resumenManual && resumen && resumen !== proyecto.resumen) {
        cambios.resumen = resumen;
      }
      //la descripcion completa solo se pisa cuando vino texto: una pagina a medias de behance
      //no deberia borrar la que ya estaba guardada
      if (detalle.descripcion) cambios.descripcionCompleta = detalle.descripcion;
      //la portada se refresca con la de behance, salvo que la hayan puesto a mano desde el
      //panel (data uri): ahi es decision de la dueña y el scrape no la pisa
      const portadaPropia = proyecto.imagen && !/^https?:/i.test(proyecto.imagen);
      if (detalle.portada && !portadaPropia && detalle.portada !== proyecto.imagen) {
        cambios.imagen = detalle.portada;
      }
      //el video solo se toca si behance lo tiene: asi no se pisa un video subido a mano
      if (detalle.ccv) {
        cambios.video = `https://www-ccv.adobe.io/v1/player/ccv/${detalle.ccv}/embed?api_key=behance1`;
      } else if (detalle.videoUrl) {
        cambios.video = detalle.videoUrl;
      }
      //si behance la sigue bloqueando por la casilla de contenido maduro, NO se marca como
      //sincronizado: asi la proxima corrida (cada 6 horas por el cron) la reintenta sola y
      //en cuanto se saque esa casilla baja galeria y video sin que nadie tenga que tocar nada
      const sigueBloqueada =
        bloqueadoMadurez && !detalle.imagenes.length && !detalle.ccv && !detalle.videoUrl;
      if (sigueBloqueada) {
        delete cambios.sincronizadoDetalleEn;
        delete cambios.ultimoChequeoVideo;
        //tampoco se pisan la galeria ni la portada con lo poco que entrega behance cuando la
        //bloquea: ahi la portada que manda es su imagen "blocked" y la galeria viene vacia,
        //y eso no deberia borrar lo que ya se tenia guardado del proyecto
        delete cambios.imagenesBehance;
        delete cambios.imagen;
      }
      await Proyecto.updateOne({ _id: proyecto._id }, { $set: cambios });
      if (sigueBloqueada) {
        fallidos++;
      } else {
        sincronizados++;
        imagenesTotales += detalle.imagenes.length;
      }
    } else {
      //behance no dejo entrar: no se marca nada para reintentar en la proxima corrida
      fallidos++;
    }

    //pausa entre galerias: behance bloquea si le piden muchas seguidas en poco tiempo
    await new Promise((r) => setTimeout(r, 2000));
  }

  return {
    pendientes: limites.length,
    sincronizados,
    fallidos,
    sinGaleria,
    imagenes: imagenesTotales,
  };
}

//sincronizacion completa: proyectos nuevos del rss + detalle de las galerias pendientes
export async function sincronizar(topeDetalles = 15) {
  const rss = await importarRss();
  const detalles = await importarDetalles(topeDetalles);
  return { rss, detalles };
}

//get a /api/behance/video?ccv=<id>
//publico: el hero y las tarjetas de las grillas resuelven el mp4 actual del embed de adobe
//(la url firmada expira, se pide fresca). se cachea un rato en memoria: ahora varios
//componentes piden el mismo video en la misma visita y sin este cache adobe recibiria una
//llamada por tarjeta cada vez que alguien abre la home
const DURACION_CACHE_VIDEO_MS = 10 * 60 * 1000;
const cacheDeVideos = new Map();

router.get('/video', async (req, res) => {
  const ccv = String(req.query.ccv ?? '');
  if (!/^[A-Za-z0-9_-]{6,}$/.test(ccv)) {
    return res.status(400).json({ mensaje: 'El id de video no es valido' });
  }
  const guardado = cacheDeVideos.get(ccv);
  if (guardado && guardado.hasta > Date.now()) {
    return res.json({ ccv, mp4: guardado.mp4 });
  }
  try {
    const html = await fetch(`https://www-ccv.adobe.io/v1/player/ccv/${ccv}/embed?api_key=behance1`, {
      headers: { 'user-agent': USER_AGENT },
    }).then((r) => r.text());
    const mp4 = html.match(/"mp4URL": "([^"]+)"/);
    if (!mp4) {
      return res.status(404).json({ mensaje: 'El video no esta disponible' });
    }
    cacheDeVideos.set(ccv, { mp4: mp4[1], hasta: Date.now() + DURACION_CACHE_VIDEO_MS });
    res.json({ ccv, mp4: mp4[1] });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el video', error: error.message });
  }
});

//post a /api/behance/sincronizar (solo admin)
//disparo manual desde el panel o con la clave de administrador
router.post('/sincronizar', esAdmin, async (req, res) => {
  try {
    res.json(await sincronizar());
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al sincronizar', error: error.message });
  }
});

//get a /api/behance/sincronizar
//lo usa el cron de vercel (header x-vercel-cron); con tope mas bajo porque
//la corrida completa la hace el github action (que no tiene limite de tiempo)
router.get('/sincronizar', async (req, res) => {
  const esCron = Boolean(req.headers['x-vercel-cron']);
  if (!esCron) {
    return res.status(401).json({ mensaje: 'No autorizado' });
  }
  try {
    res.json(await sincronizar(8));
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al sincronizar', error: error.message });
  }
});

export default router;