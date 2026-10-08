//middleware compartido de administracion
//solo deja pasar a la dueña del sitio: valida la sesion de firebase que llega
//en el header authorization (formato bearer) y comprueba que el email sea el suyo
//todas las rutas que solo puede tocar la dueña pasan por aca
import { verificarTokenFirebase } from '../config/firebaseAdmin.js';

//email de la cuenta de firebase que es dueña del sitio (se puede cambiar con admin_email)
const EMAIL_DUENA = process.env.ADMIN_EMAIL ?? 'ferraroagustina19@gmail.com';

export default async function esAdmin(req, res, next) {
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

  res.status(401).json({ mensaje: 'No autorizado: solo la dueña del portfolio puede hacer esto' });
}
