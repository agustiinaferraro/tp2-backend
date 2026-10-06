//sincroniza una vez el portfolio con behance (misma logica que /api/behance/sincronizar)
//importa proyectos nuevos del feed rss y busca los videos de las galerias que falten
//uso: node scripts/sincronizar-behance.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Proyecto from '../models/Proyecto.js';
import { sincronizar } from '../routes/behance.js';

dotenv.config();

async function correr() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('conectado a mongo');

  const resultado = await sincronizar();
  console.log('resultado:', JSON.stringify(resultado, null, 2));

  const conVideo = await Proyecto.countDocuments({ video: { $ne: '' } });
  console.log('proyectos que ahora tienen video:', conVideo);

  await mongoose.disconnect();
}

correr().catch(async (error) => {
  console.error('Error al sincronizar:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});