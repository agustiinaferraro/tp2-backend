//script para cargar (o actualizar) los servicios en mongodb
//uso: node seedServicios.js
//es una herramienta de desarrollo: se ejecuta una vez y listo

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Servicio from './models/Servicio.js';

dotenv.config();

//los 5 servicios que ofrece el portfolio
//el "slug" es el identificador que aparece en la url de cada servicio
const servicios = [
  {
    nombre: 'Desarrollo Full Stack',
    slug: 'desarrollo-full-stack',
    descripcion:
      'Creación de sitios y aplicaciones web completas, conectando la interfaz de usuario (frontend) con la lógica de negocio, APIs y bases de datos (backend).',
  },
  {
    nombre: 'Diseño UX/UI',
    slug: 'diseno-ux-ui',
    descripcion:
      'Investigación, prototipos interactivos y diseño de interfaces intuitivas, funcionales y centradas en el usuario.',
  },
  {
    nombre: 'Diseño Gráfico e Identidad',
    slug: 'diseno-grafico-identidad',
    descripcion:
      'Sistemas de marca, piezas digitales, gráfica publicitaria y material para redes.',
  },
  {
    nombre: 'Edición de Video',
    slug: 'edicion-de-video',
    descripcion:
      'Montaje audiovisual y contenido adaptado a redes o presentaciones.',
  },
  {
    nombre: 'Motion Graphics / Animación',
    slug: 'motion-graphics',
    descripcion:
      'Animación 2D y gráficos en movimiento para videos, presentaciones e interfaces.',
  },
];

async function cargarServicios() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    //se borran los servicios existentes y se cargan los nuevos
    await Servicio.deleteMany({});
    await Servicio.insertMany(servicios);

    console.log(`✅ Cargados ${servicios.length} servicios`);
    await mongoose.disconnect();
    console.log('🔌 Conexión cerrada');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

cargarServicios();