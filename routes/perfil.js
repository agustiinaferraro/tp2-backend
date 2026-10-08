//rutas de la api para el perfil
//el get es publico (lo usan footer, contacto y el avatar), el put pide clave de administrador
import { Router } from 'express';
import Perfil, { CONTENIDO_POR_DEFECTO } from '../models/Perfil.js';
import esAdmin from '../middlewares/esAdmin.js';

const router = Router();

//get a /api/perfil
//devuelve el perfil unico; si no existe todavia, lo crea con los valores por defecto
router.get('/', async (req, res) => {
  try {
    let perfil = await Perfil.findOne().lean();
    if (!perfil) {
      perfil = (await Perfil.create({})).toObject();
    }
    //si el perfil es viejo y todavia no tiene el contenido de "sobre mi", se completa con los defaults
    for (const campo of ['estadisticas', 'recorrido', 'habilidades', 'certificaciones']) {
      if (!Array.isArray(perfil[campo]) || perfil[campo].length === 0) {
        perfil[campo] = CONTENIDO_POR_DEFECTO[campo];
      }
    }
    res.json(perfil);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el perfil', error: error.message });
  }
});

//put a /api/perfil (solo admin)
//actualiza el perfil (o lo crea si no existe) con los campos que lleguen
router.put('/', esAdmin, async (req, res) => {
  try {
    const { nombre, titulo, sobreMi, foto, portada, email, telefono, whatsapp, redes, estadisticas, recorrido, habilidades, certificaciones } = req.body ?? {};

    const cambios = {};
    if (nombre !== undefined) cambios.nombre = String(nombre).trim() || 'Agustina Ferraro';
    if (titulo !== undefined) cambios.titulo = String(titulo).trim();
    if (sobreMi !== undefined) cambios.sobreMi = String(sobreMi).trim();
    if (foto !== undefined) cambios.foto = String(foto).trim();
    if (portada !== undefined) cambios.portada = String(portada).trim();
    if (email !== undefined) cambios.email = String(email).trim();
    if (telefono !== undefined) cambios.telefono = String(telefono).trim();
    if (whatsapp !== undefined) cambios.whatsapp = String(whatsapp).trim();
    if (redes !== undefined) {
      const r = {};
      for (const nombre of ['linkedin', 'instagram', 'threads', 'behance']) {
        if (redes[nombre] !== undefined) r[nombre] = String(redes[nombre]).trim();
      }
      cambios.redes = r;
    }
    //contenido de "sobre mi": se guarda tal cual llega (son listas de objetos)
    if (Array.isArray(estadisticas)) cambios.estadisticas = estadisticas;
    if (Array.isArray(recorrido)) cambios.recorrido = recorrido;
    if (Array.isArray(habilidades)) cambios.habilidades = habilidades;
    if (Array.isArray(certificaciones)) cambios.certificaciones = certificaciones;

    //se usa el primero que haya (si no hay ninguno, se crea)
    const existente = await Perfil.findOne();
    let perfil;
    if (existente) {
      perfil = await Perfil.findByIdAndUpdate(existente._id, cambios, {
        new: true,
        runValidators: true,
      });
    } else {
      perfil = await Perfil.create(cambios);
    }

    res.json({ mensaje: 'Perfil actualizado', datos: perfil });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar el perfil', error: error.message });
  }
});

export default router;