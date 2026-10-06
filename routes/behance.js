//rutas de la api para sincronizar el portfolio con behance (automatico)
//behance protege las paginas con un desafio de javascript: se resuelve reenviando
//la cookie js_challenge_value que el propio desafio entrega en la respuesta
//- los proyectos nuevos se importan del feed rss (los ultimos 12 publicados)
//- los videos de cada galeria se guardan como embed de adobe ccv y el hero los resuelve en vivo
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
async function fetchBehance(url, intentos = 4) {
  let cookie = '';
  for (let i = 0; i < intentos; i++) {
    const respuesta = await fetch(url, {
      headers: cookie ? { 'user-agent': USER_AGENT, cookie } : { 'user-agent': USER_AGENT },
    });
    const texto = await respuesta.text();
    const desafio = texto.match(/js_challenge_value=([a-f0-9]{64,})/);
    if (desafio) {
      //la cookie va con nombre: mandando solo el valor behance vuelve a responder 403
      cookie = `js_challenge_value=${desafio[1]}`;
      continue;
    }
    return texto;
  }
  //si se agotaron los intentos devuelve vacio (behance no dejo entrar)
  return '';
}

//trae el video (id de adobe ccv) de un proyecto
//los videos ya no estan en la pagina de la galeria: hay que pegarle a /modules, que es
//donde behance deja el estado de los modulos (imagenes y players de video)
//devuelve { ccv, chequeado } donde "chequeado" es si se llego a ver el proyecto de verdad
async function videoDeGaleria(link) {
  let urlCompleta = link;
  try {
    const oembed = await fetchBehance(
      `https://www.behance.net/services/oembed?url=${encodeURIComponent(link)}`
    );
    const datos = JSON.parse(oembed);
    if (datos?.url) urlCompleta = datos.url;
  } catch {
    //sin oembed (o el link sin slug) se intenta la galeria directamente
  }

  //el id numerico de la galeria hace falta para pegarle al endpoint de modulos
  const id = urlCompleta.match(/behance\.net\/gallery\/(\d+)/)?.[1];
  if (!id) return { ccv: null, chequeado: false };

  const estado = await fetchBehance(`https://www.behance.net/gallery/${id}/modules`);
  if (estado.length < 1000 || !estado.includes('fullBleed')) {
    return { ccv: null, chequeado: false };
  }
  const ccv = estado.match(/player\/ccv\/([A-Za-z0-9_-]{6,})\/embed/);
  return { ccv: ccv ? ccv[1] : null, chequeado: true };
}

//quita etiquetas de html y deja el texto limpio
function limpiarHTML(texto) {
  return texto
    .replace(/<img[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
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

//trae los proyectos nuevos del feed rss (los ultimos publicados) y crea los que falten
async function importarRss() {
  const xml = await fetchBehance(URL_RSS);
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  if (items.length === 0) {
    throw new Error('El feed llego vacio (posible bloqueo de behance)');
  }

  let creados = 0;
  let actualizados = 0;

  for (const item of items) {
    const descripcion = obtenerCampo(item, 'description');
    const titulo = limpiarHTML(obtenerCampo(item, 'title'));
    const link = obtenerCampo(item, 'link').trim();
    const resumen = limpiarHTML(descripcion);
    const imagen = obtenerPortada(descripcion);

    if (!titulo || !link) continue;

    const existente = await Proyecto.findOne({ link });
    if (existente) {
      const cambios = {};
      if (existente.titulo !== titulo) cambios.titulo = titulo;
      if (existente.resumen !== resumen) cambios.resumen = resumen;
      if (!existente.imagen && imagen) cambios.imagen = imagen;
      if (Object.keys(cambios).length) {
        await Proyecto.updateOne({ _id: existente._id }, cambios);
        actualizados++;
      }
      continue;
    }

    const servicios = categoriasPorTitulo(titulo);
    await Proyecto.create({
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
  }

  return { items: items.length, creados, actualizados };
}

//para cada proyecto de behance sin video intenta sacar el video de su galeria
//(se guarda el embed de adobe ccv, estable; la url firmada del mp4 se resuelve por separado)
//cada proyecto se vuelve a chequear como maximo una vez por semana
async function importarVideos() {
  //los proyectos viejos no tienen el campo video: se buscan los que estan vacios o no lo tienen
  const limites = await Proyecto.find({
    link: /behance\.net\/gallery\//,
    $or: [{ video: '' }, { video: { $exists: false } }],
  }).lean();
  const haceUnaSemana = Date.now() - 7 * 24 * 60 * 60 * 1000;

  let videos = 0;
  let chequeados = 0;

  for (const proyecto of limites) {
    const ultimo = proyecto.ultimoChequeoVideo ? new Date(proyecto.ultimoChequeoVideo).getTime() : 0;
    if (ultimo > haceUnaSemana) continue;
    chequeados++;

    let video = '';
    let chequeado = false;
    try {
      const resultado = await videoDeGaleria(proyecto.link);
      chequeado = resultado.chequeado;
      if (resultado.ccv) {
        video = `https://www-ccv.adobe.io/v1/player/ccv/${resultado.ccv}/embed?api_key=behance1`;
      }
      //console.log(`  videoDeGaleria ${proyecto.titulo}: ccv=${resultado.ccv ?? 'no'} chequeado=${chequeado}`);
    } catch (e) {
      //console.log(`  videoDeGaleria ${proyecto.titulo}: error ${e.message}`);
    }

    //solo se marca el chequeo cuando se vio la galeria; si no, se reintenta en el proximo cron
    const cambios = { video };
    if (chequeado) cambios.ultimoChequeoVideo = new Date();
    await Proyecto.updateOne({ _id: proyecto._id }, { $set: cambios });
    if (video) videos++;

    //pausa entre galerias: behance bloquea si le piden muchasfollowed en poco tiempo
    await new Promise((r) => setTimeout(r, 2000));
  }

  return { chequeados, videos };
}

//sincronizacion completa: proyectos nuevos + videos que falten
export async function sincronizar() {
  const rss = await importarRss();
  const videos = await importarVideos();
  return { rss, videos };
}

//get a /api/behance/video?ccv=<id>
//publico: el hero lo usa para resolver el mp4 actual del embed de adobe (la url firmada expira)
router.get('/video', async (req, res) => {
  const ccv = String(req.query.ccv ?? '');
  if (!/^[A-Za-z0-9_-]{6,}$/.test(ccv)) {
    return res.status(400).json({ mensaje: 'El id de video no es valido' });
  }
  try {
    const html = await fetch(`https://www-ccv.adobe.io/v1/player/ccv/${ccv}/embed?api_key=behance1`, {
      headers: { 'user-agent': USER_AGENT },
    }).then((r) => r.text());
    const mp4 = html.match(/"mp4URL": "([^"]+)"/);
    if (!mp4) {
      return res.status(404).json({ mensaje: 'El video no esta disponible' });
    }
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
//lo usa el cron de vercel (header x-vercel-cron) o un pedido manual con la clave en ?clave=
router.get('/sincronizar', async (req, res) => {
  const esCron = Boolean(req.headers['x-vercel-cron']);
  const claveOk = process.env.ADMIN_CLAVE && req.query.clave && req.query.clave === process.env.ADMIN_CLAVE;
  if (!esCron && !claveOk) {
    return res.status(401).json({ mensaje: 'No autorizado' });
  }
  try {
    res.json(await sincronizar());
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al sincronizar', error: error.message });
  }
});

export default router;