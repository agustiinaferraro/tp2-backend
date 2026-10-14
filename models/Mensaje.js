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
    telefono: {
      //whatsapp de la persona (formato internacional, ej. "54911..."): si lo deja,
      //la admin puede responderle por whatsapp desde el panel
      type: String,
      default: '',
    },
    porWhatsapp: {
      //marca las respuestas que la admin mando por whatsapp (el visitante lo ve en su chat)
      type: Boolean,
      default: false,
    },
    leidoEn: {
      //momento en que la admin abrio el chat: los mensajes de la persona sin esta fecha
      //son los no leidos y son los unicos que muestran contador en la lista de chats
      type: Date,
      default: null,
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