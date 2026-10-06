//middleware compartido de administracion
//acepta el login clasico del panel (clave en el header x-admin-clave) o
//la sesion de firebase de la duena (token en el header authorization)
//todas las rutas que solo puede tocar la dueña pasan por aca
import { verificarTokenFirebase } from '../config/firebaseAdmin.js';

//email de la cuenta de firebase que es dueña del sitio (se puede cambiar con admin_email)
const EMAIL_DUENA = process.env.ADMIN_EMAIL ?? 'ferraroagustina19@gmail.com';

export default async function esAdmin(req, res, next) {
  //primero se prueba la clave clasica del panel de administracion
  const clave = req.header('x-admin-clave');
  if (process.env.ADMIN_CLAVE && clave === process.env.ADMIN_CLAVE) {
    return next();
  }

  //sin clave: se prueba con la cuenta de firebase de la dueña
  if (!clave) {
    const autorizacion = req.header('authorization');
    if (autorizacion?.startsWith('Bearer ')) {
      try {
        const usuario = await verificarTokenFirebase(autorizacion.slice(7));
        const email = (usuario.email ?? '').toLowerCase();
        if (email && email === EMAIL_DUENA.toLowerCase()) {
          return next();
        }
      } catch {
        //token invalido o firebase sin configurar: se sigue como no autorizado
      }
    }
  }

  res.status(401).json({ mensaje: 'No autorizado: solo la dueña del portfolio puede hacer esto' });
}