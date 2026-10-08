//rutas de administracion: informan si la cuenta logueada es la dueña del sitio
import { Router } from 'express';
import { verificarTokenFirebase } from '../config/firebaseAdmin.js';

const router = Router();

//email de la cuenta de firebase que es dueña del sitio
const EMAIL_DUENA = (process.env.ADMIN_EMAIL ?? 'ferraroagustina19@gmail.com').toLowerCase();

//get a /api/admin/soy-dueno
//con la sesion de la cuenta (header authorization) responde si esa cuenta es la dueña.
//no expone el email: el frontend solo necesita saber si puede abrir el panel.
router.get('/soy-dueno', async (req, res) => {
  const autorizacion = req.header('authorization');
  if (!autorizacion?.startsWith('Bearer ')) {
    return res.json({ esDueno: false });
  }

  try {
    const usuario = await verificarTokenFirebase(autorizacion.slice(7));
    const email = (usuario.email ?? '').toLowerCase();
    return res.json({ esDueno: Boolean(email) && email === EMAIL_DUENA });
  } catch {
    //token invalido, vencido o firebase sin configurar: no es la dueña
    return res.json({ esDueno: false });
  }
});

export default router;
