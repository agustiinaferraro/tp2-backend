//script para asignar categorias (servicios) a los proyectos de la base
//los proyectos ahora pueden estar en varias categorias (campo "servicios")
//uso: node scripts/asignar-categorias.js
//se corre cuantas veces se necesite: es idempotente (re-escribe la lista por titulo)
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Proyecto from '../models/Proyecto.js';

dotenv.config();

//mapeo por titulo exacto: que categorias le tocan a cada proyecto
//el primero de la lista queda como categoria principal (campo viejo "servicio")
const POR_TITULO = {
  'TikTec - Branding': ['diseno-grafico-identidad'],
  'Fight Club - Afiche Tipográfico': ['diseno-grafico-identidad'],
  'TIKTEC': ['edicion-de-video', 'motion-graphics'],
  'Kanto Sushi - Branding': ['diseno-grafico-identidad'],
  'Teatro - Social Media Design': ['diseno-grafico-identidad'],
  'Invitación Casamiento': ['diseno-grafico-identidad'],
  'Tótem interactivo - UMAI (Universidad Maimónides)': ['diseno-ux-ui'],
  'Flyer Noche De Terror': ['diseno-grafico-identidad'],
  'Fight Club - Movie Poster': ['diseno-grafico-identidad'],
  'The Driver Era - Banner': ['diseno-grafico-identidad'],
  'Diseño Gráfico': ['diseno-grafico-identidad'],
  'The Driver Era - Diseño Web / Diseño Gráfico': ['diseno-ux-ui', 'diseno-grafico-identidad'],
  'Energia Colectiva': ['desarrollo-full-stack'],
  'Prog3 Tp Finalback': ['desarrollo-full-stack'],
  'Iglesia Cristiana Casa Del Alfarero': ['desarrollo-full-stack'],
  'TP Final': ['desarrollo-full-stack'],
  'Parcial 1': ['desarrollo-full-stack'],
  'TP1': ['desarrollo-full-stack'],
  'Com Aplicacion': ['desarrollo-full-stack'],
  'TP4 Ecommerce': ['desarrollo-full-stack'],
  'TP0': ['desarrollo-full-stack'],
  'Cortinas Metalicas': ['desarrollo-full-stack'],
  'Prog3 Shop Backend': ['desarrollo-full-stack'],
  'TP2': ['desarrollo-full-stack'],
  'TP3': ['desarrollo-full-stack'],
  'Dags': ['desarrollo-full-stack'],
};

async function asignar() {
  await mongoose.connect(process.env.MONGODB_URI);

  const proyectos = await Proyecto.find().lean();
  let actualizados = 0;
  let sinMapeo = 0;

  for (const proyecto of proyectos) {
    const servicios = POR_TITULO[proyecto.titulo];
    if (!servicios) {
      //sin mapeo: se conserva la categoria actual (si hay) o queda sin categoria
      if (proyecto.servicio && !proyecto.servicios?.length) {
        const lista = [proyecto.servicio];
        await Proyecto.updateOne({ _id: proyecto._id }, { $set: { servicios: lista } });
        actualizados++;
      }
      sinMapeo++;
      continue;
    }
    await Proyecto.updateOne(
      { _id: proyecto._id },
      { $set: { servicios, servicio: servicios[0] } }
    );
    actualizados++;
  }

  console.log(`proyectos procesados: ${actualizados}`);
  console.log(`sin mapeo (se conservo lo que tenian): ${sinMapeo}`);
  for (const proyecto of proyectos) {
    const servicios = POR_TITULO[proyecto.titulo];
    console.log(`- ${proyecto.titulo} => ${(servicios ?? [proyecto.servicio ?? '']).join(', ') || 'sin categoria'}`);
  }

  await mongoose.disconnect();
}

asignar().catch(async (error) => {
  console.error('Error al asignar:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});