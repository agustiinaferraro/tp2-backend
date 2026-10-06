//modelo (esquema) de usuario del portfolio
//los visitantes se registran para poder comentar en los proyectos
//la clave nunca se guarda en texto plano: se guarda el hash generado con bcrypt
import mongoose from 'mongoose';

const usuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },
    email: {
      //se guarda siempre en minusculas para que sea unico
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    clave: {
      //hash de la contraseña, nunca la contraseña original
      type: String,
      required: [true, 'La contraseña es obligatoria'],
    },
  },
  {
    //agrega automaticamente "createdat" y "updatedat"
    timestamps: true,
  }
);

//se exporta el modelo. el nombre en mongodb sera "usuarios"
export default mongoose.model('Usuario', usuarioSchema);