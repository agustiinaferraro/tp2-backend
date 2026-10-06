//script de sincronizacion de proyectos desde la cuenta de vercel (trabajos de programacion)
//usa la api publica de vercel con un token propio (secret VERCEL_TOKEN)
//solo muestra el link del front: cada proyecto queda con link al deploy de produccion
//uso: VERCEL_TOKEN=xxx node scripts/importar-vercel.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Proyecto from '../models/Proyecto.js';

dotenv.config();

const API = 'https://api.vercel.com';
const TOKEN = process.env.VERCEL_TOKEN;
const SERVICIO = 'desarrollo-full-stack';

//portada generada (svg en base64) para que la tarjeta siempre tenga imagen
function generarPortada(titulo) {
  const texto = titulo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fuente = texto.length <= 18 ? 44 : texto.length <= 30 ? 34 : 26;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#18181b"/><stop offset="0.55" stop-color="#10312a"/><stop offset="1" stop-color="#14594c"/>` +
    `</linearGradient></defs>` +
    `<rect width="800" height="450" fill="url(#g)"/>` +
    `<circle cx="700" cy="70" r="140" fill="#69f5cc" opacity="0.18"/>` +
    `<circle cx="100" cy="410" r="180" fill="#34d399" opacity="0.15"/>` +
    `<text x="45" y="245" font-family="Arial, Helvetica, sans-serif" font-size="${fuente}" font-weight="bold" fill="#ffffff" opacity="0.95">${texto}</text>` +
    `<text x="47" y="288" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#69f5cc">Programación · Desplegado en Vercel</text>` +
    `</svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

//nombre legible de un proyecto ("maimo-prog3-2025-tp4-ecommerce-ferraro" -> "TP4 Ecommerce")
function aTitulo(nombre) {
  let limpio = nombre.replace(/^maimo-prog3-2025-/i, '');
  limpio = limpio.replace(/-ferraro(agustina)?$/i, '');
  //sufijo aleatorio que agrega vercel a proyectos repetidos (ej: "-1wrm", "-1xu5")
  limpio = limpio.replace(/-[a-z0-9]{3,5}$/i, '');
  const palabras = limpio.split(/[-_]+/).filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  let titulo = palabras.join(' ');
  titulo = titulo.replace(/^Tp(?=\d)/, 'TP');
  titulo = titulo.replace(/\bTp\s*Final\b/i, 'TP Final');
  titulo = titulo.replace(/^Parcial(?=\d)/i, 'Parcial ');
  return titulo || nombre;
}

//clave para juntar duplicados (vercel agrega un sufijo aleatorio cuando se recrea un proyecto)
function claveDuplicado(nombre) {
  const reducido = nombre.toLowerCase().replace(/-[a-z0-9]{3,5}$/, '');
  return reducido.length >= 4 ? reducido : nombre.toLowerCase();
}

//pedido a la api de vercel
async function pedirVercel(ruta) {
  const respuesta = await fetch(API + ruta, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!respuesta.ok) {
    throw new Error(`Vercel respondió ${respuesta.status} en ${ruta}`);
  }
  return respuesta.json();
}

async function importar() {
  if (!TOKEN) {
    console.error('Falta VERCEL_TOKEN. Configurarlo en el entorno.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  //1) listar todos los proyectos de la cuenta (con paginacion)
  const proyectos = [];
  let hasta = undefined;
  for (let pagina = 0; pagina < 10; pagina++) {
    const q = `limit=100${hasta ? `&until=${hasta}` : ''}`;
    const datos = await pedirVercel(`/v6/projects?${q}`);
    proyectos.push(...datos.projects);
    hasta = datos.pagination?.next;
    if (!hasta) break;
  }
  console.log('proyectos en vercel:', proyectos.length);

  //2) filtrar el portfolio propio y juntar duplicados
  const sinPortfolio = proyectos.filter((p) => !/^agustinaportfolio/.test(p.name));
  const porClave = new Map();
  for (const p of sinPortfolio) {
    const clave = claveDuplicado(p.name);
    const actual = porClave.get(clave);
    if (!actual || p.name.length < actual.name.length) porClave.set(clave, p);
  }
  const elegidos = [...porClave.values()];
  console.log('proyectos a sincronizar:', elegidos.length);

  //3) sacar la url de produccion de cada uno (se prefiere el alias mas corto, que es el amigable)
  const conUrl = [];
  for (const p of elegidos) {
    try {
      const lista = await pedirVercel(`/v6/deployments?projectId=${p.id}&target=production&limit=1`);
      const dep = lista.deployments?.[0];
      if (!dep) continue;
      const detalle = await pedirVercel(`/v11/deployments/${dep.uid}`);
      const alias = (detalle.alias ?? []).sort((a, b) => a.length - b.length)[0];
      const link = `https://${alias ?? dep.url}`;
      conUrl.push({ ...p, link });
    } catch (error) {
      console.warn(`no se pudo obtener la url de ${p.name}: ${error.message}`);
    }
  }

  //4) crear o actualizar en la base
  const esProg3 = (nombre) => /maimo-prog3|^prog3/i.test(nombre);
  let creados = 0;
  let actualizados = 0;
  for (const p of conUrl) {
    const titulo = aTitulo(p.name);
    const resumen = esProg3(p.name)
      ? 'Trabajo práctico de Programación 3 desplegado en Vercel.'
      : 'Proyecto desplegado en Vercel.';
    const portada = generarPortada(titulo);

    const existente = await Proyecto.findOne({ link: p.link });
    if (existente) {
      const cambios = { titulo, resumen, link: p.link };
      //la portada generada se sobreescribe si sigue siendo generada; una imagen propia no se toca
      if ((existente.imagen ?? '').startsWith('data:image/svg')) cambios.imagen = portada;
      await Proyecto.updateOne({ _id: existente._id }, cambios);
      actualizados++;
      console.log(`actualizado: ${titulo} | ${p.link}`);
      continue;
    }

    await Proyecto.create({
      titulo,
      resumen,
      imagen: portada,
      imagenes: [],
      link: p.link,
      servicio: SERVICIO,
      tags: esProg3(p.name) ? ['Programación'] : ['Vercel'],
      destacado: false,
    });
    creados++;
    console.log(`creado: ${titulo} | ${p.link}`);
  }

  console.log(`creados nuevos: ${creados}`);
  console.log(`actualizados: ${actualizados}`);
  await mongoose.disconnect();
}

importar().catch(async (error) => {
  console.error('Error al importar:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});