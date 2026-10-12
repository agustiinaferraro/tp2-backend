//reparacion de inventario (corrida unica, idempotente):
//1) agrega la entrada en el historial del proyecto que se borro antes de existir el historial
//   (The Driver Era - Diseño Web / Diseño Gráfico) para poder restaurarlo desde el panel
//2) completa los 2 links de behance que estaban sin slug (devuelven 404)
//uso: node scripts/reparar-inventario.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Proyecto from '../models/Proyecto.js';
import HistorialProyecto from '../models/HistorialProyecto.js';

dotenv.config();

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

//behance protege las paginas con un desafio de javascript (llega como 403 con la cookie)
async function fetchBehance(url, intentos = 4) {
  let cookie = '';
  for (let i = 0; i < intentos; i++) {
    const respuesta = await fetch(url, {
      headers: cookie ? { 'user-agent': UA, cookie } : { 'user-agent': UA },
    });
    const texto = await respuesta.text();
    const desafio = texto.match(/js_challenge_value=([a-f0-9]{64,})/);
    if (desafio) {
      cookie = `js_challenge_value=${desafio[1]}`;
      continue;
    }
    return texto;
  }
  return '';
}

function meta(html, atributo, valor) {
  const re = new RegExp(
    `<meta[^>]+${atributo}=["']${valor}["'][^>]*content=["']([^"']+)["']`,
    'i'
  );
  const m = html.match(re);
  return m ? m[1] : '';
}

const LINK_FALTANTE = 'https://www.behance.net/gallery/227076343/The-Driver-Era-Diseno-Web-Diseno-Grafico';

//links que faltaban y Behance solo sirve con el slug
const LINKS_ARREGLADOS = [
  { viejo: 'https://www.behance.net/gallery/195685239', nuevo: 'https://www.behance.net/gallery/195685239/Melincu' },
  { viejo: 'https://www.behance.net/gallery/191654843', nuevo: 'https://www.behance.net/gallery/191654843/Demo-Moon-to-Mars' },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  //1) links sin slug
  for (const { viejo, nuevo } of LINKS_ARREGLADOS) {
    const r = await Proyecto.updateOne({ link: viejo }, { $set: { link: nuevo } });
    console.log(`${r.modifiedCount ? 'arreglado' : 'ya estaba'}: ${nuevo}`);
  }

  //2) entrada en el historial para poder restaurar el proyecto faltante
  const yaEnHistorial = await HistorialProyecto.findOne({
    tipo: 'eliminar',
    'proyecto.link': LINK_FALTANTE,
  }).lean();
  const yaEnProyectos = await Proyecto.findOne({ link: LINK_FALTANTE }).lean();

  if (yaEnHistorial) {
    console.log('historial: la entrada ya existia');
  } else if (yaEnProyectos) {
    console.log('historial: el proyecto ya esta dado de alta, no se siembra');
  } else {
    const html = await fetchBehance(LINK_FALTANTE);
    const titulo = 'The Driver Era - Diseño Web / Diseño Gráfico';
    const imagen = meta(html, 'property', 'og:image');
    const resumen = meta(html, 'property', 'og:description') || meta(html, 'name', 'description');
    const servicios = ['diseno-ux-ui', 'diseno-grafico-identidad'];

    const proyecto = {
      titulo,
      resumen,
      imagen,
      imagenes: [],
      servicio: servicios[0],
      servicios,
      tags: ['diseño web', 'diseño gráfico', 'the driver era'],
      link: LINK_FALTANTE,
      video: '',
      destacado: false,
    };

    await HistorialProyecto.create({ tipo: 'eliminar', proyecto, titulo, usuario: 'reparacion-inventario' });
    console.log('historial: entrada creada para restaurar =>', titulo);
    console.log('  imagen:', imagen || '(sin og:image en la pagina)');
    console.log('  resumen:', (resumen || '').slice(0, 120));
  }

  const [totalProyectos, totalHistorial] = await Promise.all([
    Proyecto.countDocuments(),
    HistorialProyecto.countDocuments(),
  ]);
  console.log(`\nproyectos: ${totalProyectos} | entradas de historial: ${totalHistorial}`);

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('Error:', e.message);
  await mongoose.disconnect();
  process.exit(1);
});
