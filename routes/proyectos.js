//rutas de la api para los proyectos
//el get es publico (cualquiera ve los proyectos), las modificaciones piden clave de administrador
import { Router } from 'express';
import Proyecto from '../models/Proyecto.js';
import esAdmin from '../middlewares/esAdmin.js';

const router = Router();

//get a /api/proyectos
//devuelve la lista de todos los proyectos cargados en la base
//soportan ?destacados=true (solo destacados), ?ligero=true (sin imagenes) y ?servicio=slug (solo esa categoria)
router.get('/', async (req, res) => {
  try {
    const { destacados, ligero, servicio } = req.query;

    //filtro: se arman las condiciones que lleguen (destacados y/o servicio)
    //un proyecto entra en una categoria si es su servicio principal o si esta en su lista de servicios
    const filtro = {};
    if (destacados === 'true') filtro.destacado = true;
    if (servicio) {
      filtro.$or = [{ servicio }, { servicios: servicio }];
    }

    //proyeccion: el modo ligero no manda las imagenes (pesan bastante en base64)
    const proyeccion = ligero === 'true' ? { titulo: 1, resumen: 1, tags: 1 } : null;

    const proyectos = await Proyecto.find(filtro, proyeccion).lean();
    res.json(proyectos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener los proyectos', error: error.message });
  }
});

//get a /api/proyectos/:id
//devuelve un solo proyecto segun su id (para la pagina de detalle)
router.get('/:id', async (req, res) => {
  try {
    const proyecto = await Proyecto.findById(req.params.id).lean();
    if (!proyecto) {
      return res.status(404).json({ mensaje: 'Proyecto no encontrado' });
    }
    res.json(proyecto);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el proyecto', error: error.message });
  }
});

//post a /api/proyectos (solo admin)
//crea un proyecto nuevo con titulo (obligatorio), y resumen, imagenes, imagen, servicio y destacado opcionales
router.post('/', esAdmin, async (req, res) => {
  try {
    const { titulo, resumen, imagen, imagenes, servicio, servicios, destacado, link, video } = req.body ?? {};

    //validacion: el titulo es obligatorio
    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ mensaje: 'El titulo es obligatorio' });
    }

    //las imagenes extra se guardan sin vacias ni espacios de mas
    const galeria = (imagenes ?? []).map((i) => (typeof i === 'string' ? i.trim() : '')).filter(Boolean);

    //la lista de servicios se normaliza (sin vacios); el primero queda como servicio principal
    const listaServicios = Array.isArray(servicios)
      ? [...new Set(servicios.map((s) => String(s).trim()).filter(Boolean))]
      : servicio
        ? [servicio.trim()]
        : [];

    const nuevoProyecto = await Proyecto.create({
      titulo: titulo.trim(),
      resumen: resumen ?? '',
      imagen: imagen ?? '',
      imagenes: galeria,
      servicio: listaServicios[0] ?? '',
      servicios: listaServicios,
      tags: [],
      link: link ?? '',
      video: video ?? '',
      destacado: destacado === true,
    });

    res.status(201).json({ mensaje: 'Proyecto creado', datos: nuevoProyecto });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear el proyecto', error: error.message });
  }
});

//put a /api/proyectos/:id (solo admin)
//actualiza los campos que lleguen (titulo, resumen, imagenes, imagen o servicio)
router.put('/:id', esAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, resumen, imagen, imagenes, servicio, servicios, destacado, link, video } = req.body ?? {};

    //se arma un objeto solo con los campos que vinieron en la peticion
    const cambios = {};
    if (titulo !== undefined) cambios.titulo = titulo;
    if (resumen !== undefined) cambios.resumen = resumen;
    if (imagen !== undefined) cambios.imagen = imagen;
    if (link !== undefined) cambios.link = link;
    if (video !== undefined) cambios.video = video;
    if (imagenes !== undefined) {
      cambios.imagenes = (imagenes ?? []).map((i) => (typeof i === 'string' ? i.trim() : '')).filter(Boolean);
    }
    //si llegó la lista de servicios se normaliza y el primero queda como principal
    if (servicios !== undefined || servicio !== undefined) {
      const lista = Array.isArray(servicios)
        ? [...new Set(servicios.map((s) => String(s).trim()).filter(Boolean))]
        : servicio !== undefined
          ? [String(servicio).trim()]
          : undefined;
      if (lista) {
        cambios.servicios = lista;
        cambios.servicio = lista[0] ?? '';
      } else if (servicio === '') {
        cambios.servicio = '';
      }
    }
    if (destacado !== undefined) cambios.destacado = destacado === true;

    const actualizado = await Proyecto.findByIdAndUpdate(id, cambios, {
      new: true,
      runValidators: true,
    });

    if (!actualizado) {
      return res.status(404).json({ mensaje: 'Proyecto no encontrado' });
    }

    res.json({ mensaje: 'Proyecto actualizado', datos: actualizado });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar el proyecto', error: error.message });
  }
});

//delete a /api/proyectos/:id (solo admin)
//borra el proyecto de la base
router.delete('/:id', esAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const borrado = await Proyecto.findByIdAndDelete(id);

    if (!borrado) {
      return res.status(404).json({ mensaje: 'Proyecto no encontrado' });
    }

    res.json({ mensaje: 'Proyecto borrado' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al borrar el proyecto', error: error.message });
  }
});

export default router;