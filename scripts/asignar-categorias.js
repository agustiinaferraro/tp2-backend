import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Proyecto from '../models/Proyecto.js';
dotenv.config();

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
  'Nubes flotando': ['edicion-de-video', 'motion-graphics'],
  'Defín nadando': ['edicion-de-video', 'motion-graphics'],
  'Caminada robótica': ['edicion-de-video', 'motion-graphics'],
};
async function asignar(){
  await mongoose.connect(process.env.MONGODB_URI);
  const proyectos = await Proyecto.find().lean();
  let actualizados = 0;
  let sinMapeo = 0;
  for(const p of proyectos){
    const servicios = POR_TITULO[p.titulo];
    if(!servicios){
      if(p.servicio && !p.servicios?.length){
        await Proyecto.updateOne({ _id: p._id }, { $set:{ servicios:[p.servicio] } });
        actualizados++;
      }
      sinMapeo++;
      continue;
    }
    await Proyecto.updateOne({ _id: p._id }, { $set:{ servicios, servicio: servicios[0] } });
    actualizados++;
  }
  console.log('proyectos procesados:', actualizados);
  console.log('sin mapeo (se conservo lo que tenian):', sinMapeo);
  const check = ['Nubes flotando','Defín nadando','Caminada robótica'];
  for(const t of check){
    const pr = await Proyecto.findOne({ titulo:t }).lean();
    if(pr) console.log('- ' + t + ' => ' + (pr.servicios||[]).join(', '));
  }
  await mongoose.disconnect();
}
asignar().catch(async(e)=>{console.error('Error al asignar:', e.message);await mongoose.disconnect();process.exit(1);});
