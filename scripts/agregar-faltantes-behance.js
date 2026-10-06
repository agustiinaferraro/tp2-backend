//importa los proyectos de behance que no estan en la base
//se listan los que faltan (el rss y la pagina solo exponia 12) con su cover y categoria
//uso: node scripts/agregar-faltantes-behance.js
//es idempotente: si el proyecto ya existe por link, se actualiza en vez de duplicar
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Proyecto from '../models/Proyecto.js';

dotenv.config();

//convierte el cover "404" del perfil a una resolucion mayor (max_808)
function cover808(archivo) {
  return archivo && `https://mir-s3-cdn-cf.behance.net/projects/max_808/${archivo}`;
}

//categorias por slug de servicio (ven de /servicios)
const GRAFICO = ['diseno-grafico-identidad'];
const MOTION = ['edicion-de-video', 'motion-graphics'];
const UXUI = ['diseno-ux-ui'];

//[titulo, id de galeria en behance, servicios, tags, resumen, cover]
const FALTANTES = [
  [
    'Flyer Concurso de Disfraces',
    '225013983',
    GRAFICO,
    ['diseño gráfico', 'afiche', 'evento'],
    'Flyer para el concurso de disfraces: una pieza gráfica con paleta festiva y tipografía expresiva para convocar al evento.',
    '554713225013983.Y3JvcCwxMDYzLDgzMiwxMDcsMA.png',
  ],
  [
    'Melincué',
    '195685239',
    GRAFICO,
    ['diseño gráfico', 'obra', 'serie'],
    'Serie gráfica inspirada en Melincué: composiciones con tratamiento fotográfico y tipografía editorial.',
    'da20c2195685239.66123b817731c.jpg',
  ],
  [
    'Flyer Recital y Testimonios',
    '225011157',
    GRAFICO,
    ['diseño gráfico', 'afiche', 'recital'],
    'Pieza gráfica para un recital con testimonios: composición con jerarquía clara y clima cálido.',
    'f8ec43225011157.Y3JvcCwxMDYzLDgzMiwxMDcsMA.png',
  ],
  [
    'Certificado - Bautismo',
    '245519009',
    GRAFICO,
    ['diseño gráfico', 'certificado'],
    'Certificado de bautismo con diseño sobrio y elegante, décors y rótulos equilibrados.',
    'a00fae245519009.Y3JvcCwxMDU2LDgyNiwxMTIsMA.png',
  ],
  [
    'Flyer Duelo de Talentos',
    '225010937',
    GRAFICO,
    ['diseño gráfico', 'afiche', 'evento'],
    'Afiche para un duelo de talentos: tipografía fuerte y paleta de alto contraste.',
    'fd0367225010937.Y3JvcCwxMDYzLDgzMiwxMDcsMA.png',
  ],
  [
    'RESTYLING APP MOBILE (PERSONAL FLOW)',
    '188474501',
    UXUI,
    ['ux/ui', 'app mobile', 'restyling'],
    'Restyling de una app mobile: rediseño del flow personal con componentes, estados y navegación clara.',
    'b41123188474501.Y3JvcCwxMjI2LDk1OSwyMDksNjA.png',
  ],
  [
    'Certificado academico',
    '197785051',
    GRAFICO,
    ['diseño gráfico', 'certificado'],
    'Certificado académico con diagramación sobria y tipografía formal.',
    '372e00197785051.Y3JvcCwxMjg3LDEwMDYsMCw5.png',
  ],
  [
    'Flyer Reunión de Jóvenes',
    '225011097',
    GRAFICO,
    ['diseño gráfico', 'afiche', 'evento'],
    'Flyer para una reunión de jóvenes: composición fresca y mensaje directo.',
    '8baa48225011097.Y3JvcCwxMDYzLDgzMiwxMDcsMA.png',
  ],
  [
    'Moodboard - NASA',
    '191650495',
    UXUI,
    ['ux/ui', 'moodboard', 'nasa'],
    'Moodboard del proyecto NASA: referencias de color, tipografía y estilo para guiar el diseño de la experiencia.',
    '4080e9191650495.Y3JvcCwxMzA5LDEwMjQsNjQsMA.png',
  ],
  [
    'LOGO ANIMADO',
    '188486323',
    MOTION,
    ['motion graphics', 'logo', 'after effects'],
    'Logo animado en After Effects: timing, easing y movimiento del isotipo para una presentación con identidad.',
    'ac0c2b188486323.Y3JvcCwxMzA5LDEwMjQsNjQsMA.png',
  ],
  [
    'Flyer Mexicano',
    '225010903',
    GRAFICO,
    ['diseño gráfico', 'afiche', 'tematico'],
    'Flyer de temática mexicana: patrones, color y tipografía inspirados en la cultura mexicana.',
    'b28659225010903.Y3JvcCwxMDYzLDgzMiwxMDcsMA.png',
  ],
  [
    'FIGHT CLUB: AFICHE FOTOGRÁFICO',
    '188495427',
    GRAFICO,
    ['diseño gráfico', 'afiche', 'fight club'],
    'Versión fotográfica del afiche de Fight Club: retrato tratado con tipografía editorial y estética de la película.',
    '44a49f188495427.659d2970b8538.jpg',
  ],
  [
    'SEGA: TIPOGRAFIA ANIMADA',
    '188487625',
    MOTION,
    ['motion graphics', 'tipografía', 'sega'],
    'Tipografía animada inspirada en SEGA: letras con velocidad, retículas y ritmo característico.',
    '5e0bf6188487625.Y3JvcCwxMzA5LDEwMjQsNjQsMA.png',
  ],
  [
    'OBRA MELINCUE: WEB DESKTOP - MOBILE',
    '188481219',
    UXUI,
    ['ux/ui', 'web', 'responsive'],
    'Web responsive de la obra Melincué para desktop y mobile: landing con cartelera, entradas e información del espectáculo.',
    'c8fd69188481219.Y3JvcCwxMzA5LDEwMjQsNjQsMA.png',
  ],
  [
    'Demo - Moon to Mars',
    '191654843',
    UXUI,
    ['ux/ui', 'iux', 'demo'],
    'Demo interactiva Moon to Mars: prototipo navegable de la experiencia con foco en la interacción y la narrativa.',
    '',
  ],
  [
    'Flyer día del niño',
    '225004189',
    GRAFICO,
    ['diseño gráfico', 'afiche', 'evento'],
    'Flyer para el día del niño: colores alegres e ilustraciones tiernas.',
    '8f9831225004189.Y3JvcCwxMDYzLDgzMiwxMDcsMA.png',
  ],
  [
    'NASA: MOON TO MARS',
    '188477013',
    UXUI,
    ['ux/ui', 'web', 'nasa'],
    'Diseño web del proyecto Moon to Mars con la identidad de la NASA: retícula, tipografía y componentes del sistema.',
    'ea3eda188477013.Y3JvcCwxMzA5LDEwMjQsNjQsMA.png',
  ],
  [
    'Dieet: App Mobile',
    '188480017',
    UXUI,
    ['ux/ui', 'app mobile', 'salud'],
    'Dieet: app mobile de nutrición con pantallas de hábitos, comidas y progreso; flujo y componentes coherentes.',
    'fe2878188480017.Y3JvcCwxMzA5LDEwMjQsNjQsMA.png',
  ],
  [
    'KENDOM! Trailer',
    '188473163',
    MOTION,
    ['motion graphics', 'trailer', 'edición'],
    'Trailer de KENDOM!: corte, motion y ritmo para presentar el juego con energía.',
    'fd28d3188473163.Y3JvcCwxMzA5LDEwMjQsNjQsMA.png',
  ],
  [
    'MOSQUITO: ANIMACION 3D',
    '188485185',
    MOTION,
    ['motion graphics', 'animación 3d'],
    'Animación 3D de un mosquito: modelado, iluminación y render para una pieza de motion.',
    '330fc0188485185.Y3JvcCwxMzA5LDEwMjQsNjQsMA.png',
  ],
  [
    'GIFT CARD: WEB INTERFAZ',
    '188479227',
    UXUI,
    ['ux/ui', 'web', 'interfaz'],
    'Interfaz web para gift cards: componentes de tarjeta, selección y confirmación con microinteracciones.',
    '0975e2188479227.Y3JvcCwxMzA5LDEwMjQsNjQsMA.png',
  ],
  [
    'MELINCUE: WEB MOBILE',
    '172349165',
    UXUI,
    ['ux/ui', 'web', 'mobile'],
    'Versión mobile de la web de Melincué: pantallas compactas y navegación táctil optimizada.',
    'ef5fbd172349165.Y3JvcCwxMzA5LDEwMjQsNjQsMA.png',
  ],
  [
    'APP MOBILE INTERFAZ',
    '171819243',
    UXUI,
    ['ux/ui', 'app mobile', 'interfaz'],
    'Interfaz de app mobile: pantallas principales con jerarquía visual y componentes claros.',
    '424cba171819243.Y3JvcCwxMzA5LDEwMjQsNjQsMA.png',
  ],
  [
    'PIXELLARY: GALERIA PIXEL ART, DESKTOP',
    '172347117',
    UXUI,
    ['ux/ui', 'web', 'galería'],
    'Pixellary: galería de pixel art para desktop con grilla de exploración y detalle de obras.',
    'bda464172347117.Y3JvcCwxMzA5LDEwMjQsNjQsMA.png',
  ],
  [
    'SUSHI: LANDING PAGE RESPONSIVE',
    '168699813',
    UXUI,
    ['ux/ui', 'landing', 'responsive'],
    'Landing page responsive de un restaurante de sushi: hero, carta y reserva adaptadas a todas las pantallas.',
    '01411f168699813.Y3JvcCwxMzA5LDEwMjQsNjQsMA.png',
  ],
  [
    'DENGUE: INFOGRAFIA INFANTIL MOBILE ANIMADA',
    '174768525',
    MOTION,
    ['motion graphics', 'infografía', 'animada'],
    'Infografía infantil animada sobre el dengue, pensada para mobile: ilustraciones simples y animación didáctica.',
    '59e658174768525.Y3JvcCwxMzA5LDEwMjQsNjQsMA.png',
  ],
  [
    'TESLA: LANDING RESPONSIVE - APP MODO CLARO, MODO OSCURO',
    '188481777',
    UXUI,
    ['ux/ui', 'landing', 'responsive', 'modo oscuro'],
    'Landing responsive con estética Tesla: versiones en modo claro y oscuro con sistema de componentes.',
    '7ec8f0188481777.Y3JvcCwxMzA5LDEwMjQsNjQsMA.png',
  ],
];

async function importar() {
  await mongoose.connect(process.env.MONGODB_URI);

  let creados = 0;
  let actualizados = 0;

  for (const [titulo, id, servicios, tags, resumen, cover] of FALTANTES) {
    const link = `https://www.behance.net/gallery/${id}`;
    const imagen = cover808(cover);
    const datos = {
      titulo,
      resumen,
      tags,
      servicios,
      servicio: servicios[0],
      imagen,
      link,
    };

    const existente = await Proyecto.findOne({ link: { $regex: id } });
    if (existente) {
      await Proyecto.updateOne({ _id: existente._id }, { $set: datos });
      actualizados++;
      console.log(`- actualizado: ${titulo}`);
    } else {
      await Proyecto.create(datos);
      creados++;
      console.log(`+ creado: ${titulo}`);
    }
  }

  console.log(`\ncreados: ${creados} | actualizados: ${actualizados}`);
  await mongoose.disconnect();
}

importar().catch(async (error) => {
  console.error('Error al importar:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});