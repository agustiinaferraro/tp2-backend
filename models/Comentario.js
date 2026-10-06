//modelo (esquema) de comentario de los proyectos
//solo los usuarios registrados pueden crearlos, pero cualquiera puede leerlos
import mongoose from 'mongoose';

const comentarioSchema = new mongoose.Schema(
  {
    proyecto: {
      //id del proyecto donde se publica el comentario
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proyecto',
      required: true,
      index: true,
    },
    usuario: {
      //id del usuario que comenta (uid de firebase, la plataforma de cuentas)
      type: String,
      required: true,
    },
    nombre: {
      //nombre del usuario al momento de comentar (se guarda para no depender del usuario)
      type: String,
      required: true,
    },
    texto: {
      type: String,
      required: [true, 'El comentario no puede estar vacío'],
      trim: true,
    },
  },
  {
    //agrega automaticamente "createdat" y "updatedat"
    timestamps: true,
  }
);

//se exporta el modelo. el nombre en mongodb sera "comentarios"
export default mongoose.model('Comentario', comentarioSchema);