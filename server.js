//punto de entrada del backend (servidor + api)
//funciona en dos ambientes:
//- local:  node server.js   (arranca con app.listen)
//- vercel: la app se exporta como funcion serverless

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

//importa la conexion a mongodb y las rutas
import { conectarDB } from './config/db.js';
import proyectosRouter from './routes/proyectos.js';
import serviciosRouter from './routes/servicios.js';
import mensajesRouter from './routes/mensajes.js';
import adminRouter from './routes/admin.js';
import perfilRouter from './routes/perfil.js';
import comentariosRouter from './routes/comentarios.js';
import usuariosRouter from './routes/usuarios.js';
import behanceRouter from './routes/behance.js';

//se cargan las variables de entorno del archivo .env (solo importa en local)
dotenv.config();

//se crea la aplicacion express
const app = express();

//middlewares globales
app.use(cors());           //permite que el frontend (astro) pueda consultar la api
app.use(express.json({ limit: '25mb' }));   //permite recibir json en el body, con margen para imagenes en base64

//middleware: se conecta a mongodb antes de cada peticion
//reutiliza la conexion si ya esta abierta (la funcion de conexion lo maneja)
app.use(async (req, res, next) => {
  try {
    await conectarDB();
    next();
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al conectar a MongoDB', error: error.message });
  }
});

//rutas de la api (el get es publico, las modificaciones piden clave de admin)
app.use('/api/proyectos', proyectosRouter);
app.use('/api/servicios', serviciosRouter);
app.use('/api/mensajes', mensajesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/perfil', perfilRouter);
app.use('/api/comentarios', comentariosRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/behance', behanceRouter);

//ruta de prueba para saber que el servidor esta vivo
app.get('/', (req, res) => {
  res.json({ mensaje: 'API del portfolio funcionando' });
});

//puerto del servidor (por defecto 4000 si no esta en .env)
const PORT = process.env.PORT || 4000;

//solo se arranca el servidor en local con app.listen.
//en vercel no se usa listen: la app se exporta y vercel la ejecuta.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

//se exporta la app para que vercel pueda ejecutarla como funcion serverless
export default app;