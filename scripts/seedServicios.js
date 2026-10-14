//script para cargar (o actualizar) los servicios en mongodb
//uso: node scripts/seedServicios.js
//hace upsert por slug: crea los que falten y actualiza nombre, descripcion e "incluye"
//sin borrar lo que ya hay (antes hacia deleteMany y eso borraba las ediciones
//hechas desde el panel admin, que ahora es la forma principal de mantenerlos)

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Servicio from '../models/Servicio.js';

dotenv.config();

//los 5 servicios que ofrece el portfolio
//el "slug" es el identificador que aparece en la url de cada servicio
//cada "incluye" es la lista que se muestra con un check en la pagina del servicio
const servicios = [
  {
    nombre: 'Desarrollo Full Stack',
    slug: 'desarrollo-full-stack',
    descripcion:
      'Creación de sitios y aplicaciones web completas: desde una landing hasta un panel administrable con base de datos. Conecto la interfaz (frontend) con la lógica de negocio, las APIs y la base de datos (backend), y dejo todo publicado en la nube.',
    incluye: [
      'Sitio o aplicación a medida (frontend y backend)',
      'API y base de datos para administrar el contenido',
      'Panel de administración para editar sin tocar código',
      'Publicación en la nube (Vercel y MongoDB Atlas)',
      'Versión responsive para celular y escritorio',
    ],
  },
  {
    nombre: 'Diseño UX/UI',
    slug: 'diseno-ux-ui',
    descripcion:
      'Investigación, prototipos interactivos y diseño de interfaces intuitivas, funcionales y centradas en el usuario: del problema a una interfaz lista para desarrollar.',
    incluye: [
      'Análisis del problema y de los usuarios',
      'Wireframes y flujos de navegación',
      'Prototipo interactivo en Figma',
      'Diseño de interfaces con sistema de diseño',
      'Entrega con especificaciones para desarrollo',
    ],
  },
  {
    nombre: 'Diseño Gráfico e Identidad',
    slug: 'diseno-grafico-identidad',
    descripcion:
      'Sistemas de marca, piezas digitales, gráfica publicitaria y material para redes: del logo a su aplicación en piezas concretas.',
    incluye: [
      'Identidad visual: logo, paleta y tipografías',
      'Manual básico de uso de la marca',
      'Piezas para redes y campañas',
      'Aplicaciones en papelería y packaging',
    ],
  },
  {
    nombre: 'Edición de Video',
    slug: 'edicion-de-video',
    descripcion:
      'Montaje audiovisual para redes, presentaciones y proyectos personales: del material en bruto al video final listo para publicar.',
    incluye: [
      'Montaje y ritmo narrativo',
      'Colorización y corrección de audio',
      'Subtítulos y gráficos en pantalla',
      'Adaptación a cada formato (vertical, cuadrado, 16:9)',
      'Entrega en los formatos que se necesiten',
    ],
  },
  {
    nombre: 'Motion Graphics / Animación',
    slug: 'motion-graphics',
    descripcion:
      'Animación 2D y gráficos en movimiento para videos, presentaciones e interfaces: contenido que explica y da vida a la marca.',
    incluye: [
      'Animación de logos y aperturas (intro/outro)',
      'Explicadores animados',
      'Infografía y datos en movimiento',
      'Microinteracciones para interfaces',
      'Exportación optimizada para web y redes',
    ],
  },
];

async function cargarServicios() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    let creados = 0;
    let actualizados = 0;
    for (const servicio of servicios) {
      //upsert por slug: si ya existe se actualizan solo esos tres campos,
      //asi no se pisan campos extra ni timestamps de cuando se creo
      const resultado = await Servicio.updateOne(
        { slug: servicio.slug },
        { $set: { nombre: servicio.nombre, descripcion: servicio.descripcion, incluye: servicio.incluye } },
        { upsert: true }
      );
      if (resultado.upsertedCount) creados += 1;
      else actualizados += resultado.modifiedCount;
    }

    console.log(`✅ Servicios listos: ${creados} creados, ${actualizados} actualizados`);
    await mongoose.disconnect();
    console.log('🔌 Conexión cerrada');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

cargarServicios();
