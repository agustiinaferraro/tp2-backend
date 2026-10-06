//script de importacion de proyectos desde el feed rss de behance
//se corre una sola vez (o varias, porque no repite proyectos) para poblar la base sin cargar a mano
//tambien actualiza titulo/resumen/imagen de proyectos que ya existan por link (si cambiaron en behance)
//uso: node scripts/importar-behance.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Proyecto from '../models/Proyecto.js';

dotenv.config();

const URL_RSS = 'https://www.behance.net/agustiinaferraro.rss';

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

//saca el valor de un campo con cdata de un trozo de xml
function obtenerCampo(bloque, nombre) {
  const m = bloque.match(new RegExp(`<${nombre}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]\\s*>`, 'i'));
  return m ? m[1] : '';
}

//primera imagen del bloque html de la descripcion (miniatura del proyecto)
function obtenerPortada(descripcion) {
  const m = descripcion.match(/<img[^>]+src=['"]([^'"]+)['"]/i);
  return m ? m[1] : '';
}

async function importar() {
  await mongoose.connect(process.env.MONGODB_URI);

  const respuesta = await fetch(URL_RSS);
  if (!respuesta.ok) {
    console.error('No se pudo descargar el feed, codigo:', respuesta.status);
    process.exit(1);
  }
  const xml = await respuesta.text();

  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  console.log('proyectos encontrados en el feed:', items.length);
  if (items.length === 0) {
    console.error('El feed llego vacio (posible bloqueo de behance). No se hace ningun cambio.');
    process.exit(1);
  }

  let creados = 0;
  let actualizados = 0;
  let aldia = 0;
  const importados = [];

  for (const item of items) {
    const titulo = limpiarHTML(obtenerCampo(item, 'title'));
    const link = obtenerCampo(item, 'link').trim();
    const descripcion = obtenerCampo(item, 'description');
    const resumen = limpiarHTML(descripcion);
    const imagen = obtenerPortada(descripcion);

    if (!titulo || !link) continue;

    const existente = await Proyecto.findOne({ link });
    if (existente) {
      const cambios = {};
      if (existente.titulo !== titulo) cambios.titulo = titulo;
      if (existente.resumen !== resumen) cambios.resumen = resumen;
      if (existente.imagen !== imagen) cambios.imagen = imagen;
      if (Object.keys(cambios).length) {
        await Proyecto.updateOne({ _id: existente._id }, cambios);
        actualizados++;
      } else {
        aldia++;
      }
      continue;
    }

    const creado = await Proyecto.create({
      titulo,
      resumen,
      imagen,
      imagenes: [],
      link,
      servicio: '',
      tags: [],
      destacado: false,
    });
    creados++;
    importados.push(creado);
  }

  console.log(`creados nuevos: ${creados}`);
  console.log(`actualizados por cambios en behance: ${actualizados}`);
  console.log(`ya estaban al dia: ${aldia}`);
  for (const p of importados) {
    console.log(`- ${p.titulo} | ${p.link}`);
  }

  await mongoose.disconnect();
}

importar().catch(async (error) => {
  console.error('Error al importar:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});