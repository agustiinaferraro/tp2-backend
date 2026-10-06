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
  },
  {
    //agrega automaticamente "createdat" y "updatedat"
    timestamps: true,
  }
);

//se exporta el modelo. el nombre en mongodb sera "proyectos" (en plural, en minusculas)
export default mongoose.model('Proyecto', proyectoSchema);