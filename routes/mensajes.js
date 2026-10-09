//rutas de la api de mensajes
//el post es publico (el formulario de contacto lo usa), la lectura y el borrado piden clave de admin
import { Router } from 'express';
import Mensaje from '../models/Mensaje.js';
import esAdmin from '../middlewares/esAdmin.js';
import esAutenticado from '../middlewares/esAutenticado.js';

const router = Router();

//get a /api/mensajes (solo admin)
//devuelve todos los mensajes recibidos, los mas nuevos primero
router.get('/', esAdmin, async (req, res) => {
  try {
    const mensajes = await Mensaje.find().sort({ createdAt: -1 }).lean();
    res.json(mensajes);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener los mensajes', error: error.message });
  }
});

//get a /api/mensajes/conversaciones (solo admin)
//agrupa los mensajes por persona (mismo email) para verlos como chats
//cada conversacion trae nombre, cantidad, fecha del ultimo y todos sus mensajes
router.get('/conversaciones', esAdmin, async (req, res) => {
  try {
    const conversaciones = await Mensaje.aggregate([
      //los nuevos primero para que el primer mensaje de cada grupo sea el ultimo
      { $sort: { createdAt: -1 } },
      {
        $group: {
          //se agrupa por email normalizado (sin espacios y en minusculas): asi la misma
          //persona cae siempre en el mismo chat aunque el email venga con mayusculas o espacios
          _id: { $toLower: { $trim: { input: '$email' } } },
          nombre: { $first: '$nombre' },
          email: { $first: { $toLower: { $trim: { input: '$email' } } } },
          //la cantidad cuenta solo los mensajes de la persona, no las respuestas del admin
          cantidad: { $sum: { $cond: [{ $ifNull: ['$esRespuesta', false] }, 0, 1] } },
          ultimaFecha: { $first: '$createdAt' },
          mensajes: { $push: '$$ROOT' },
        },
      },
      //las conversaciones con actividad mas reciente quedan arriba
      { $sort: { ultimaFecha: -1 } },
    ]);
    res.json(conversaciones);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener las conversaciones', error: error.message });
  }
});

//get a /api/mensajes/mio (visitante logueado)
//devuelve la conversacion de la persona que está logueada (sus mensajes y las respuestas del admin)
//el email sale del token de sesion: no se puede espiar la conversacion de otro usuario
router.get('/mio', esAutenticado, async (req, res) => {
  try {
    const { email } = req.usuario;
    const emailNormalizado = String(email).trim().toLowerCase();

    const mensajes = await Mensaje.find({ email: emailNormalizado })
      .sort({ createdAt: 1 })
      .lean();

    //no se devuelve el token de la conversacion (sigue siendo interno)
    res.json(mensajes.map(({ token: omitido, ...resto }) => resto));
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener la conversación', error: error.message });
  }
});

//get a /api/mensajes/publico/:email (publico pero con token)
//devuelve los mensajes de la conversacion del visitante (los suyos y las respuestas del admin)
//el token se genera al enviar el primer mensaje y solo lo conoce esa persona
//es el mecanismo viejo (sin cuenta); la api nueva usa /mio con la sesion de la cuenta
router.get('/publico/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { token } = req.query;

    if (!token || !String(token).trim()) {
      return res.status(400).json({ mensaje: 'Falta el token de la conversación' });
    }

    const mensajes = await Mensaje.find({ email: String(email).toLowerCase(), token: String(token) })
      .sort({ createdAt: 1 })
      .lean();

    if (mensajes.length === 0) {
      return res.status(404).json({ mensaje: 'No se encontró esa conversación' });
    }

    //no se devuelve el token: sigue siendo secreto
    res.json(mensajes.map(({ token: omitido, ...resto }) => resto));
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener la conversación', error: error.message });
  }
});

//post a /api/mensajes/conversaciones/:email/respuesta (solo admin)
//guarda la respuesta del dueño del portfolio dentro del chat de esa persona
router.post('/conversaciones/:email/respuesta', esAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const { respuesta, nombre } = req.body ?? {};

    if (!respuesta || !String(respuesta).trim()) {
      return res.status(400).json({ mensaje: 'La respuesta no puede estar vacía' });
    }

    const emailNormalizado = String(email).trim().toLowerCase();
    const nombreResponde = String(nombre).trim() || 'Agustina Ferraro';

    //marca como respondido el mensaje mas nuevo de esa persona
    await Mensaje.findOneAndUpdate(
      { email: emailNormalizado, esRespuesta: false },
      { respondido: true },
      { sort: { createdAt: -1 } }
    );

    //la respuesta hereda el token de la conversacion para que el visitante la vea en su chat
    const ultimo = await Mensaje.findOne({ email: emailNormalizado }).sort({ createdAt: -1 }).lean();
    const token = ultimo?.token ?? '';

    //la respuesta queda dentro del mismo chat (mismo email) y se ve como burbuja propia
    const nuevaRespuesta = await Mensaje.create({
      nombre: nombreResponde,
      email: emailNormalizado,
      mensaje: String(respuesta).trim(),
      esRespuesta: true,
      token,
    });

    res.status(201).json({ mensaje: 'Respuesta enviada', datos: nuevaRespuesta });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al guardar la respuesta', error: error.message });
  }
});

//post a /api/mensajes (visitante logueado)
//recibe un mensaje de contacto y lo guarda en la base
//exige estar logueado: el nombre y el email salen del token de sesion (firebase los verifica)
router.post('/', esAutenticado, async (req, res) => {
  try {
    const { mensaje } = req.body ?? {};
    const { email, nombre } = req.usuario;

    //validacion: el mensaje no puede estar vacio
    if (!mensaje || !String(mensaje).trim()) {
      return res.status(400).json({ mensaje: 'El mensaje no puede estar vacío' });
    }

    const emailNormalizado = String(email).trim().toLowerCase();

    //validacion del email: el token de firebase lo da verificado, pero se re-chequea el formato
    const esEmailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado);
    if (!esEmailValido) {
      return res.status(400).json({ mensaje: 'El email no es válido. Registrate con un email real.' });
    }

    const nuevoMensaje = await Mensaje.create({
      nombre: String(nombre).trim() || emailNormalizado,
      email: emailNormalizado,
      mensaje: String(mensaje).trim(),
      token: '',
    });

    res.status(201).json({ mensaje: 'Mensaje recibido', datos: nuevoMensaje.toObject() });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al guardar el mensaje', error: error.message });
  }
});

//delete a /api/mensajes/conversaciones/:email (solo admin)
//borra todos los mensajes de la conversacion de esa persona (elimina el chat completo)
router.delete('/conversaciones/:email', esAdmin, async (req, res) => {
  try {
    const emailNormalizado = String(req.params.email).trim().toLowerCase();

    //se comparan los emails normalizados (sin espacios y en minusculas) para no dejar ninguno afuera
    const borrado = await Mensaje.deleteMany({
      $expr: { $eq: [{ $toLower: { $trim: { input: '$email' } } }, emailNormalizado] },
    });

    if (borrado.deletedCount === 0) {
      return res.status(404).json({ mensaje: 'No se encontró esa conversación' });
    }

    res.json({ mensaje: 'Chat eliminado', eliminados: borrado.deletedCount });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al borrar el chat', error: error.message });
  }
});

//delete a /api/mensajes/:id (solo admin)
//borra un mensaje de la base
router.delete('/:id', esAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const borrado = await Mensaje.findByIdAndDelete(id);

    if (!borrado) {
      return res.status(404).json({ mensaje: 'Mensaje no encontrado' });
    }

    res.json({ mensaje: 'Mensaje borrado' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al borrar el mensaje', error: error.message });
  }
});

export default router;