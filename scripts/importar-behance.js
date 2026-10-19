//script de importacion de proyectos desde el feed rss de behance
//se corre desde el github action (y tambien a mano para no esperar al cron):
//crea los proyectos nuevos del feed, refresca titulo/resumen/portada/link de los que ya estan
//y ademas raspa el detalle de las galerias (imagenes completas, video, descripcion, stats,
//fecha, keywords, titulo y resumen): la logica vive en routes/behance.js para que el script,
//el endpoint del panel y el cron usen exactamente lo mismo
//uso: node scripts/importar-behance.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { importarRss, importarDetalles } from '../routes/behance.js';

dotenv.config();

async function importar() {
  await mongoose.connect(process.env.MONGODB_URI);

  const rss = await importarRss();
  console.log('proyectos encontrados en el feed:', rss.items);
  console.log(`creados nuevos: ${rss.creados}`);
  console.log(`actualizados por cambios en behance: ${rss.actualizados}`);
  console.log(`ya estaban al dia: ${rss.aldia}`);
  for (const p of rss.importados) {
    console.log(`- ${p.titulo} | ${p.link}`);
  }

  //detalle de las galerias pendientes (imagenes, video, descripcion, stats, fecha, keywords,
  //titulo y resumen); cada proyecto se refresca como maximo 1 vez por dia y por corrida se
  //tienen hasta 15
  const detalles = await importarDetalles();
  console.log(
    `detalle de galerias: ${detalles.sincronizados} sincronizados de ${detalles.pendientes} pendientes` +
      ` (${detalles.fallidos} sin poder entrar, ${detalles.sinGaleria} sin galeria en behance,` +
      ` ${detalles.imagenes} imagenes guardadas)`
  );

  await mongoose.disconnect();
}

importar().catch(async (error) => {
  console.error('Error al importar:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
