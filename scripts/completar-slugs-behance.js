//completa los links de behance que quedaron sin slug (solo id) usando la pagina del perfil
//(la galeria con la url completa hace falta para poder ver si tiene video: sin slug da 404)
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Proyecto from '../models/Proyecto.js';

dotenv.config();

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function fetchBehance(url, intentos = 4) {
  let cookie = '';
  for (let i = 0; i < intentos; i++) {
    const respuesta = await fetch(url, {
      headers: cookie ? { 'user-agent': USER_AGENT, cookie } : { 'user-agent': USER_AGENT },
    });
    const texto = await respuesta.text();
    const desafio = texto.match(/js_challenge_value=([a-f0-9]{64,})/);
    if (desafio) {
      cookie = desafio[1];
      continue;
    }
    return texto;
  }
  return '';
}

async function completar() {
  await mongoose.connect(process.env.MONGODB_URI);

  const html = await fetchBehance('https://www.behance.net/agustiinaferraro');
  const pares = [...new Set([...html.matchAll(/gallery\\\/(\d+)\\\/([A-Za-z0-9_%().-]+)/g)].map((m) => `${m[1]}/${m[2]}`))];
  if (pares.length < 10) throw new Error('El perfil no respondio con la lista de proyectos');

  const proyectos = await Proyecto.find({ link: /behance\.net\/gallery\// }).select('link -_id').lean();
  let actualizados = 0;
  for (const p of proyectos) {
    const id = String(p.link).match(/gallery\/(\d+)/)?.[1];
    if (!id) continue;
    const par = pares.find((x) => x.startsWith(`${id}/`));
    if (!par) continue;
    const completa = `https://www.behance.net/gallery/${par}`;
    if (p.link === completa) continue;
    await Proyecto.updateOne({ link: p.link }, { $set: { link: completa } });
    actualizados++;
  }

  console.log(`perfil con ${pares.length} proyectos; links completados: ${actualizados}`);
  await mongoose.disconnect();
}

completar().catch((e) => {
  console.error('error:', e.message);
  process.exit(1);
});