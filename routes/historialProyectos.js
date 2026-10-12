import { Router } from 'express';
import HistorialProyecto from '../models/HistorialProyecto.js';
import Proyecto from '../models/Proyecto.js';
import esAdmin from '../middlewares/esAdmin.js';

const router = Router();

//obtener historial (los ultimos 50 movimientos)
router.get('/', esAdmin, async (req, res) => {
  try {
    const items = await HistorialProyecto.find().sort({ createdAt: -1 }).limit(50).lean();
    res.json(items);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener historial', error: error.message });
  }
});

//restaurar un proyecto eliminado desde el historial
router.post('/restaurar/:id', esAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const h = await HistorialProyecto.findById(id);
    if (!h) return res.status(404).json({ mensaje: 'Historial no encontrado' });
    if (h.tipo !== 'eliminar') return res.status(400).json({ mensaje: 'Solo se puede restaurar un eliminado' });
    if (h.restaurado) return res.status(400).json({ mensaje: 'Este proyecto ya fue restaurado' });

    const datos = h.proyecto || {};

    //si el link ya esta en la base no se crea otro: se marca como restaurado y se responde
    const yaExiste = datos.link ? await Proyecto.findOne({ link: datos.link }) : null;
    if (yaExiste) {
      h.restaurado = true;
      h.restauradoEn = new Date();
      await h.save();
      return res.json({ mensaje: 'El proyecto ya estaba en el portafolio', datos: yaExiste });
    }

    const nuevo = await Proyecto.create({
      titulo: datos.titulo ?? '',
      resumen: datos.resumen ?? '',
      imagen: datos.imagen ?? '',
      imagenes: datos.imagenes ?? [],
      servicio: datos.servicio ?? '',
      servicios: datos.servicios ?? [],
      tags: datos.tags ?? [],
      link: datos.link ?? '',
      video: datos.video ?? '',
      destacado: datos.destacado === true,
    });

    h.restaurado = true;
    h.restauradoEn = new Date();
    await h.save();

    res.json({ mensaje: 'Proyecto restaurado', datos: nuevo });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al restaurar', error: error.message });
  }
});

export default router;
