//middleware de autenticacion de usuarios
//valida el token de sesion de firebase que llega en el header authorization (formato bearer)
//se usa en las rutas que necesitan estar logueado (ej. publicar comentarios)
import { verificarTokenFirebase } from '../config/firebaseAdmin.js';

export default async function esAutenticado(req, res, next) {
  const encabezado = req.headers.authorization ?? '';
  const token = encabezado.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({ mensaje: 'Necesitás iniciar sesión' });
  }

  try {
    req.usuario = await verificarTokenFirebase(token);
    next();
  } catch (error) {
    const sinConfiguracion = /sin-configuracion-firebase/.test(error.message);
    return res.status(sinConfiguracion ? 503 : 401).json({
      mensaje: sinConfiguracion
        ? 'El acceso con cuentas todavía no está configurado por la dueña del sitio.'
        : 'La sesión expiró. Entrá de nuevo.',
    });
  }
}