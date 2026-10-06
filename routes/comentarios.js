//rutas de la api de comentarios
//el get es publico (cualquiera lee los comentarios de un proyecto)
//el post pide estar logueado con el token de usuario (middleware esautenticado)
import { Router } from 'express';
import Comentario from '../models/Comentario.js';
import Proyecto from '../models/Proyecto.js';
import esAutenticado from '../middlewares/esAutenticado.js';

const router = Router();

//get a /api/comentarios/:proyecto
//devuelve los comentarios de un proyecto, los mas viejos primero (parece una conversacion)
router.get('/:proyecto', async (req, res) => {
  try {
    const comentarios = await Comentario.find({ proyecto: req.params.proyecto })
      .sort({ createdAt: 1 })
      .lean();
    res.json(comentarios);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener los comentarios', error: error.message });
  }
});

//post a /api/comentarios (solo usuarios registrados)
//publica un comentario en un proyecto
router.post('/', esAutenticado, async (req, res) => {
  try {
    const { proyecto, texto } = req.body ?? {};
    const { id, nombre, email } = req.usuario;

    if (!proyecto) {
      return res.status(400).json({ mensaje: 'Falta el proyecto' });
    }
    if (!texto || !String(texto).trim()) {
      return res.status(400).json({ mensaje: 'El comentario no puede estar vacío' });
    }

    //si el proyecto no existe (o el id no es valido) se rechaza
    const existe = await Proyecto.findById(proyecto);
    if (!existe) {
      return res.status(404).json({ mensaje: 'Proyecto no encontrado' });
    }

    const nuevoComentario = await Comentario.create({
      proyecto,
      usuario: id,
      nombre,
      texto: String(texto).trim(),
    });

    res.status(201).json({ mensaje: 'Comentario publicado', datos: nuevoComentario });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al publicar el comentario', error: error.message });
  }
});

export default router;