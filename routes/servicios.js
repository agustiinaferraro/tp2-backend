//rutas publicas de la api para los servicios
//el frontend consulta estas rutas para mostrar los servicios ofrecidos
import { Router } from 'express';
import Servicio from '../models/Servicio.js';
import esAdmin from '../middlewares/esAdmin.js';

const router = Router();

//arma un slug (identificador de url) a partir de un nombre
//ej: "Motion Graphics" -> "motion-graphics"
function normalizarSlug(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

//get a /api/servicios
//devuelve la lista de todos los servicios cargados en la base
router.get('/', async (req, res) => {
  try {
    const servicios = await Servicio.find();
    res.json(servicios);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener los servicios', error: error.message });
  }
});

//post a /api/servicios (solo admin)
//crea una categoria nueva desde el panel. si ya existe con ese nombre, devuelve la existente
router.post('/', esAdmin, async (req, res) => {
  try {
    const { nombre, descripcion } = req.body ?? {};
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ mensaje: 'El nombre del servicio es obligatorio' });
    }

    const slug = normalizarSlug(nombre.trim());
    if (!slug) {
      return res.status(400).json({ mensaje: 'Ese nombre no sirve para crear una categoría' });
    }

    //si ya existe una categoria con ese slug, se devuelve la que hay
    const existente = await Servicio.findOne({ slug });
    if (existente) {
      return res.json({ mensaje: 'La categoría ya existía', datos: existente });
    }

    const nuevo = await Servicio.create({ nombre: nombre.trim(), slug, descripcion: descripcion ?? '' });
    res.status(201).json({ mensaje: 'Categoría creada', datos: nuevo });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear el servicio', error: error.message });
  }
});

//get a /api/servicios/:slug
//devuelve un solo servicio segun su slug (ej. /api/servicios/diseno-ux-ui)
router.get('/:slug', async (req, res) => {
  try {
    const servicio = await Servicio.findOne({ slug: req.params.slug });
    if (!servicio) {
      return res.status(404).json({ mensaje: 'Servicio no encontrado' });
    }
    res.json(servicio);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el servicio', error: error.message });
  }
});

export default router;