//modelo (esquema) de proyecto
//define que datos tiene cada proyecto del portfolio y sus tipos
import mongoose from 'mongoose';

const proyectoSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: [true, 'El título es obligatorio'],
    },
    resumen: {
      //que problema habia y como se resolvio
      type: String,
      default: '',
    },
    tags: {
      //roles aplicados, ej: ["ux/ui", "full stack", "motion"]
      type: [String],
      default: [],
    },
    servicio: {
      //slug del servicio principal (ej. "diseno-grafico-identidad")
      //se conserva por compatibilidad; los nuevos proyectos usan "servicios"
      //vacio = sin categoria
      type: String,
      default: '',
    },
    servicios: {
      //todos los servicios a los que pertenece el proyecto (varios: aparece en todas sus categorias)
      type: [String],
      default: [],
    },
    imagen: {
      //imagen de portada en base64 que se sube desde el panel admin
      type: String,
      default: '',
    },
    imagenes: {
      //galeria extra del proyecto en base64 (la portada queda en "imagen")
      type: [String],
      default: [],
    },
    link: {
      //url al proyecto publicado o repositorio
      type: String,
      default: '',
    },
    video: {
      //url directa a un video (mp4/webm) para el hero de la home; vacio = usa la portada
      //tambien puede ser un embed de adobe ccv (https://www-ccv.adobe.io/v1/player/ccv/<id>/embed) que el hero resuelve
      type: String,
      default: '',
    },
    ultimoChequeoVideo: {
      //cuando se intento por ultima vez traer el video desde behance (para no bombardear la galeria)
      type: Date,
      default: null,
    },
    destacado: {
      //true = proyecto destacado, false = normal
      type: Boolean,
      default: false,
    },
    imagenesBehance: {
      //galeria completa del proyecto tal como behance la publica (solo proyectos de behance)
      //se sincroniza desde la galeria; van en el orden original de los modulos de behance
      type: [String],
      default: [],
    },
    descripcionCompleta: {
      //descripcion completa de behance (el resumen del rss viene corto o con el "..." del feed)
      type: String,
      default: '',
    },
    palabrasClave: {
      //keywords que behance muestra en la ficha del proyecto (meta keywords de la galeria)
      type: [String],
      default: [],
    },
    estadisticas: {
      //vistas, apreciaciones y comentarios que behance registra en el proyecto
      //null hasta que se sincroniza el detalle (los proyectos propios no tienen)
      //_id: false para que mongo no le agregue un id interno al objeto
      type: {
        _id: false,
        vistas: { type: Number, default: 0 },
        apreciaciones: { type: Number, default: 0 },
        comentarios: { type: Number, default: 0 },
      },
      default: null,
    },
    publicadoEn: {
      //fecha de publicacion del proyecto en behance (la que behance muestra en la ficha)
      type: Date,
      default: null,
    },
    sincronizadoDetalleEn: {
      //cuando se scrapeo por ultima vez la galeria completa (para refrescar como maximo 1 vez por dia)
      type: Date,
      default: null,
    },
    tituloManual: {
      //true = el titulo lo escribio la dueña desde el panel y el sync de behance no lo pisa
      type: Boolean,
      default: false,
    },
    resumenManual: {
      //true = la descripcion la escribio la dueña desde el panel y el sync de behance no la pisa
      type: Boolean,
      default: false,
    },
    aprendizajes: {
      //texto propio: que aprendio la dueña con este proyecto (lo que el profe pide "reflejar")
      //lo escribe desde el panel; el sync de behance nunca lo toca porque no existe alla
      type: String,
      default: '',
    },
  },
  {
    //agrega automaticamente "createdat" y "updatedat"
    timestamps: true,
  }
);

//se exporta el modelo. el nombre en mongodb sera "proyectos" (en plural, en minusculas)
export default mongoose.model('Proyecto', proyectoSchema);