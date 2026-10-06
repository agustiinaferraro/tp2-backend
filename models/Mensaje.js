//modelo de un mensaje del formulario de contacto
//"timestamps: true" agrega createdat y updatedat automaticamente
//esrespuesta marca los mensajes que son respuestas del dueño del portfolio
//respondido marca si el mensaje original ya tiene una respuesta guardada
import mongoose from 'mongoose';

const mensajeSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
    },
    mensaje: {
      type: String,
      required: [true, 'El mensaje es obligatorio'],
    },
    esRespuesta: {
      type: Boolean,
      default: false,
    },
    respondido: {
      type: Boolean,
      default: false,
    },
    token: {
      //clave secreta de la conversacion: la usa el visitante para ver su propio chat
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Mensaje = mongoose.model('Mensaje', mensajeSchema);

export default Mensaje;