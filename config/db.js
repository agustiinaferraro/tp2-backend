//archivo de configuracion de la conexion a mongodb
//importa mongoose (la libreria que conecta y habla con mongodb)
import mongoose from 'mongoose';

//se guarda la conexion para reutilizarla y no abrir una en cada peticion
let conexion = null;

//esta funcion conecta el backend con mongodb atlas
//se usa la variable mongodb_uri que esta en el archivo .env
export async function conectarDB() {
  //si ya hay una conexion abierta, se reutiliza
  if (conexion) return conexion;

  conexion = mongoose.connect(process.env.MONGODB_URI);
  await conexion;
  console.log('✅ Conectado a MongoDB Atlas');
  return conexion;
}