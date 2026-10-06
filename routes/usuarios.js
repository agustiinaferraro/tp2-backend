//rutas de la api de las cuentas de los usuarios (las que se crean desde el perfil)
//las cuentas viven en firebase authentication; aca solo se borra lo que la persona dejo en el sitio
import { Router } from 'express';
import Mensaje from '../models/Mensaje.js';
import Comentario from '../models/Comentario.js';
import esAutenticado from '../middlewares/esAutenticado.js';
import { borrarUsuarioFirebase, metodosRecuperacion } from '../config/firebaseAdmin.js';

const router = Router();

//get a /api/usuarios/metodos-recuperacion
//dice con que metodos se puede recuperar una clave: por email siempre, por sms solo si el
//proyecto de firebase tiene un proveedor de telefono cargado (twilio) y plan de pago
router.get('/metodos-recuperacion', async (_req, res) => {
  try {
    res.json({ metodos: await metodosRecuperacion() });
  } catch {
    //si algo falla se contesta solo email, que es lo que siempre funciona
    res.json({ metodos: { email: true, sms: false } });
  }
});

//delete a /api/usuarios/mi (el usuario loggedueado, con su token)
//eliminar la cuenta borra TODO lo que esa persona dejo en el sitio:
//  - la cuenta de firebase authentication (ya no se puede volver a entrar con esa clave)
//  - la conversacion de contacto: sus mensajes y las respuestas del admin
//  - los comentarios que publico en los proyectos
//despues se puede volver a registrar con el mismo email, pero empieza de cero
router.delete('/mi', esAutenticado, async (req, res) => {
  try {
    const { id, email } = req.usuario;
    const emailNormalizado = String(email).trim().toLowerCase();

    //primero se borra lo que la persona dejo en el sitio, asi queda garantizado:
    //si se vuelve a registrar con el mismo email, no aparece nada de la cuenta anterior
    //la conversacion se busca por email: incluye lo que escribio y lo que le respondio el admin
    const mensajes = await Mensaje.deleteMany({ email: emailNormalizado });
    //los comentarios guardan el id de firebase del usuario
    const comentarios = await Comentario.deleteMany({ usuario: id });

    //despues se borra la cuenta de firebase: si eso falla, el usuario puede intentar de nuevo
    const borradaEnFirebase = await borrarUsuarioFirebase(id);

    res.json({
      mensaje: 'Cuenta eliminada',
      datos: {
        mensajes: mensajes.deletedCount ?? 0,
        comentarios: comentarios.deletedCount ?? 0,
        firebase: borradaEnFirebase,
      },
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo eliminar la cuenta', error: error.message });
  }
});

export default router;