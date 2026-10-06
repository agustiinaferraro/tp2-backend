//rutas de administracion: validan la clave para entrar al panel del admin
import { Router } from 'express';

const router = Router();

//get a /api/admin/dueno
//es publico: dice en que cuenta de firebase esta la dueña del sitio,
//para que "mi cuenta" pueda ofrecerle la entrada al panel
router.get('/dueno', (req, res) => {
  res.json({ email: process.env.ADMIN_EMAIL ?? 'ferraroagustina19@gmail.com' });
});

//post a /api/admin/verificar
//recibe usuario y clave y responde si son validos o no
//si falla, indica cual de los dos campos no coincide (usuario/clave) para marcarlo en rojo
router.post('/verificar', (req, res) => {
  const { usuario, clave } = req.body ?? {};

  const usuarioOk = !!process.env.ADMIN_USUARIO && usuario === process.env.ADMIN_USUARIO;
  const claveOk = !!process.env.ADMIN_CLAVE && clave === process.env.ADMIN_CLAVE;

  if (usuarioOk && claveOk) {
    return res.json({ ok: true });
  }

  res.status(401).json({
    ok: false,
    mensaje: 'Ese usuario o contraseña no pertenece al dueño del portfolio',
    usuario: usuarioOk,
    clave: claveOk,
  });
});

export default router;