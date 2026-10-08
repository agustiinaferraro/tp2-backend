//modelo (esquema) de perfil
//define los datos publicos de la persona: nombre, titulo, imagen, contacto
//y el contenido de "sobre mi": estadisticas, recorrido, habilidades y certificaciones
//es un documento unico: se crea con valores por defecto al primer acceso y se actualiza desde el panel
import mongoose from 'mongoose';

//contenido por defecto de la seccion "sobre mi"
//se usa cuando el perfil todavia no tiene ese contenido cargado en la base
export const CONTENIDO_POR_DEFECTO = {
  estadisticas: [
    { valor: '4º', descripcion: 'año de la Licenciatura en Tecnología Multimedial' },
    { valor: '3', descripcion: 'materias que enseño como ayudante de cátedra' },
    { valor: '2022', descripcion: 'desde cuando diseño, programo y animo' },
    { valor: '1', descripcion: 'pieza ganadora en una competencia por votación' },
  ],
  recorrido: [
    {
      periodo: '2010 – 2015',
      tipo: 'estudio',
      titulo: 'Bachiller en Economía y Administración',
      lugar: 'Escuela Comercial N.º 22 Héroes de Malvinas',
      texto: 'El punto de partida: en la escuela descubrí que quería crear y comunicar.',
    },
    {
      periodo: 'Mar 2022 – Actualidad',
      tipo: 'estudio',
      titulo: 'Licenciatura en Tecnología Multimedial',
      lugar: 'Universidad Maimónides',
      texto:
        'Mi formación principal: diseño, programación, video y UX/UI conviviendo en un mismo plan. Hoy estoy en 4º año.',
    },
    {
      periodo: 'Mar 2022 – Abr 2026',
      tipo: 'logro',
      titulo: 'Técnica en Comunicación Interactiva y Diseño Multimedial',
      lugar: 'Universidad Maimónides',
      insignia: 'Título obtenido',
      texto:
        'Primera etapa terminada: ya soy técnica en comunicación interactiva y diseño multimedial.',
    },
    {
      periodo: 'Mar 2022 – Actualidad',
      tipo: 'trabajo',
      titulo: 'Diseñadora multimedial',
      lugar: 'Iglesia Cristiana Evangélica',
      texto:
        'Diseño gráfico, edición de video, animación, desarrollo web y UX/UI aplicados a proyectos reales.',
    },
    {
      periodo: 'Abr 2022 – Actualidad',
      tipo: 'trabajo',
      titulo: 'Freelance: diseño y desarrollo web',
      lugar: 'Proyectos propios',
      texto: 'Llevo proyectos de punta a punta, desde la idea hasta el código.',
    },
    {
      periodo: 'Oct 2022',
      tipo: 'trabajo',
      titulo: 'UI Designer – UX Challenge',
      lugar: 'Universidad Maimónides',
      texto: 'Mi primera inmersión en UX/UI aplicada a un desafío real.',
    },
    {
      periodo: 'Dic 2022 – Feb 2023',
      tipo: 'trabajo',
      titulo: 'UI Designer – Gift Blame',
      lugar: 'Proyecto de producto digital',
      texto: 'Diseñé la interfaz de un producto digital completo, trabajando en equipo.',
    },
    {
      periodo: 'Mar 2024 – Jun 2024',
      tipo: 'trabajo',
      titulo: 'Ayudante de cátedra – Diseño de Interfaces',
      lugar: 'Universidad Maimónides',
      texto: 'Enseñar me hizo entender el diseño todavía mejor.',
    },
    {
      periodo: 'Sep 2024 – Dic 2024',
      tipo: 'logro',
      titulo: 'Diseñadora gráfica institucional',
      lugar: 'Universidad Maimónides',
      destacado: true,
      texto:
        'Creé los certificados de Illustrator y Photoshop para la universidad. Uno de ellos fue elegido ganador en una competencia por votación.',
    },
    {
      periodo: 'Ago 2025 – Nov 2025',
      tipo: 'trabajo',
      titulo: 'Ayudante de cátedra – Negocios Digitales II',
      lugar: 'Universidad Maimónides',
      texto: 'Lo digital también se trata de estrategia y de entender el negocio.',
    },
    {
      periodo: 'Mar 2026 – Actualidad',
      tipo: 'trabajo',
      titulo: 'Ayudante de cátedra – Marketing Digital',
      lugar: 'Universidad Maimónides',
      texto: 'Sumo la mirada de marketing a todo lo que diseño.',
    },
  ],
  //habilidades agrupadas por area. cada item puede ser un texto suelto
  //o un objeto { texto, logo } cuando tiene un logo asociado
  habilidades: [
    {
      grupo: 'Diseño',
      version: 'pen-tool',
      items: [
        { texto: 'Photoshop', logo: 'photoshop' },
        { texto: 'Illustrator', logo: 'illustrator' },
        'Certificados institucionales',
      ],
    },
    {
      grupo: 'UX / UI',
      version: 'layout',
      items: [
        { texto: 'Figma', logo: 'figma' },
        'Experiencia de usuario',
        'Diseño de interfaces',
      ],
    },
    {
      grupo: 'Video',
      version: 'video',
      items: [
        { texto: 'Premiere', logo: 'premiere' },
        { texto: 'After Effects', logo: 'aftereffects' },
        'Animación',
      ],
    },
    {
      grupo: 'Desarrollo',
      version: 'codigo',
      items: [
        { texto: 'HTML', logo: 'html' },
        { texto: 'CSS', logo: 'css' },
        { texto: 'JavaScript', logo: 'javascript' },
        { texto: 'React', logo: 'react' },
      ],
    },
  ],
  certificaciones: [
    {
      nombre: 'Photoshop',
      descripcion: 'Certificado académico de Adobe Photoshop',
      imagen: '/img/certificaciones/photoshop.jpg',
    },
    {
      nombre: 'Illustrator',
      descripcion: 'Certificado académico de Adobe Illustrator',
      imagen: '/img/certificaciones/illustrator.jpg',
    },
    {
      nombre: 'Figma',
      descripcion: 'Certificado de diseño de interfaces con Figma',
      imagen: '/img/certificaciones/figma.jpg',
    },
    {
      nombre: 'Ayudantía en Negocios Digitales II',
      descripcion: 'Ayudantía en la materia Negocios Digitales II',
      imagen: '/img/certificaciones/negocios-digitales.png',
    },
    {
      nombre: 'Ayudantía en Diseño de Interfaces',
      descripcion: 'Ayudantía en la materia Diseño de Interfaces',
      imagen: '/img/certificaciones/diseno-de-interfaces.png',
    },
  ],
};

//subesquema de cada estadistica (numero + descripcion)
const estadisticaSchema = new mongoose.Schema(
  {
    valor: { type: String, default: '' },
    descripcion: { type: String, default: '' },
  },
  { _id: false }
);

//subesquema de cada paso del recorrido (linea de tiempo del cv)
const recorridoSchema = new mongoose.Schema(
  {
    periodo: { type: String, default: '' },
    //tipo de paso: estudio, trabajo o logro (define el color en la interfaz)
    tipo: { type: String, default: 'estudio' },
    titulo: { type: String, default: '' },
    lugar: { type: String, default: '' },
    texto: { type: String, default: '' },
    insignia: { type: String, default: '' },
    destacado: { type: Boolean, default: false },
  },
  { _id: false }
);

//subesquema de cada grupo de habilidades
//items admite texto plano o un objeto { texto, logo } (por eso Mixed)
const habilidadSchema = new mongoose.Schema(
  {
    grupo: { type: String, default: '' },
    version: { type: String, default: '' },
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

//subesquema de cada certificacion
const certificacionSchema = new mongoose.Schema(
  {
    nombre: { type: String, default: '' },
    descripcion: { type: String, default: '' },
    imagen: { type: String, default: '' },
  },
  { _id: false }
);

const perfilSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      default: 'Agustina Ferraro',
    },
    titulo: {
      type: String,
      default: 'Diseñadora Multimedia & Desarrolladora Full Stack',
    },
    sobreMi: {
      type: String,
      default: '',
    },
    foto: {
      //foto de perfil en base64 (se sube desde el panel con el lapiz)
      type: String,
      default: '',
    },
    portada: {
      //foto de portada del banner del panel en base64
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
    },
    telefono: {
      //numero para mostrar (ej. "+54 9 11 3166-6948")
      type: String,
      default: '',
    },
    whatsapp: {
      //numero en formato internacional para el link de wa.me (ej. "5491131166948")
      type: String,
      default: '5491131166948',
    },
    redes: {
      //se guardan las urls reales por defecto para que el footer muestre todas las redes
      linkedin: { type: String, default: 'https://www.linkedin.com/feed/' },
      instagram: {
        type: String,
        default:
          'https://www.instagram.com/multimediagus?utm_source=ig_web_button_share_sheet&stkn=ZDNlZDc0MzIxNw==',
      },
      threads: { type: String, default: 'https://www.threads.net/@multimediagus' },
      behance: { type: String, default: 'https://www.behance.net/agustiinaferraro' },
    },
    //contenido de la seccion "sobre mi"
    estadisticas: { type: [estadisticaSchema], default: [] },
    recorrido: { type: [recorridoSchema], default: [] },
    habilidades: { type: [habilidadSchema], default: [] },
    certificaciones: { type: [certificacionSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

//se exporta el modelo. el nombre en mongodb sera "perfiles"
export default mongoose.model('Perfil', perfilSchema);