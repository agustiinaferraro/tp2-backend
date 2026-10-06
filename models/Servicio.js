//modelo (esquema) de servicio
//define que datos tiene cada servicio que ofreces en el portfolio
import mongoose from 'mongoose';

const servicioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del servicio es obligatorio'],
    },
    //identificador amigable para las urls (ej. /servicios/diseno-ux-ui)
    slug: {
      type: String,
      required: [true, 'El slug del servicio es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    descripcion: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

//se exporta el modelo. el nombre en mongodb sera "servicios"
export default mongoose.model('Servicio', servicioSchema);