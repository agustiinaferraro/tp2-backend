import mongoose from 'mongoose';

const historialSchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: ['eliminar', 'crear', 'actualizar'], required: true },
    proyecto: { type: Object, required: true },
    titulo: { type: String, default: '' },
    usuario: { type: String, default: '' },
    //marcador de que el eliminado ya volvio al portafolio (evita restaurar dos veces)
    restaurado: { type: Boolean, default: false },
    restauradoEn: { type: Date },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('HistorialProyecto', historialSchema);
