//configuracion de firebase-admin: valida los tokens de sesion de los usuarios
//las cuentas se crean en firebase authentication y el backend solo verifica el token
//las credenciales del servicio (service account) viajan en variables de entorno de vercel:
//firebase_project_id, firebase_client_email y firebase_private_key
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

//devuelve las credenciales del servicio, o null si no estan configuradas aun
function credenciales() {
  const proyecto = process.env.FIREBASE_PROJECT_ID;
  const email = process.env.FIREBASE_CLIENT_EMAIL;
  const clave = process.env.FIREBASE_PRIVATE_KEY;
  if (proyecto && email && clave) {
    return {
      projectId: proyecto,
      clientEmail: email,
      //la clave llega con \n escapados (por como se guarda en vercel); se restauran
      privateKey: clave.replace(/\\n/g, '\n'),
    };
  }
  return null;
}

let app = null;

//inicializa la app de firebase admin una sola vez (o devuelve la ya creada)
function obtenerApp() {
  if (!app) {
    const cred = credenciales();
    if (!cred) {
      throw new Error('sin-configuracion-firebase');
    }
    app = initializeApp({
      credential: cert(cred),
    });
  }
  return app;
}

//valida el token de sesion que manda el frontend y devuelve los datos del usuario
export async function verificarTokenFirebase(token) {
  const datos = await getAuth(obtenerApp()).verifyIdToken(token);
  return {
    id: datos.uid,
    //nombre elegido por el usuario (nunca se muestra el correo completo en los comentarios)
    nombre: datos.name || (datos.email ? datos.email.split('@')[0] : 'Visitante'),
    email: datos.email ?? '',
  };
}

//borra la cuenta del usuario de firebase authentication (el que se registra desde el perfil)
//devuelve false si la cuenta ya no existia en firebase
export async function borrarUsuarioFirebase(id) {
  try {
    await getAuth(obtenerApp()).deleteUser(id);
    return true;
  } catch (error) {
    //si firebase dice que la cuenta no existe, el borrado de datos sigue adelante
    //(los "/" van escapados: sin eso el "/auth/user-not-found" cortaria la expresion)
    if (/auth\/user-not-found/.test(error.message ?? '')) return false;
    throw error;
  }
}

//dice con que metodos se puede recuperar una clave.
//el email siempre esta disponible (es parte del propio firebase auth por defecto).
//el sms solo funciona si el proyecto tiene plan de pago y un proveedor de telefono dado de alta
//(twilio), asi que se le pregunta la configuracion real del proyecto a firebase en vez de suponerlo.
//firebase-admin no expone esa configuracion por api, asi que se consulta el endpoint de
//identity platform con un token del service account (alcance identitytoolkit)
export async function metodosRecuperacion() {
  const metodos = { email: true, sms: false };
  const proyecto = process.env.FIREBASE_PROJECT_ID;
  if (!proyecto) return metodos;
  const cred = credenciales();
  if (!cred) return metodos;

  try {
    const { GoogleAuth } = await import('google-auth-library');
    const cliente = new GoogleAuth({
      credentials: { client_email: cred.clientEmail, private_key: cred.privateKey },
      scopes: ['https://www.googleapis.com/auth/identitytoolkit'],
    });
    const token = await cliente.getAccessToken();
    const respuesta = await fetch(
      `https://identitytoolkit.googleapis.com/admin/v2/projects/${proyecto}/config`,
      { headers: { Authorization: `Bearer ${token.token}` } },
    );
    if (!respuesta.ok) return metodos;
    const { signIn } = await respuesta.json();
    //el proveedor de telefono viene en signIn.phoneNumber.enabled
    metodos.sms = Boolean(signIn?.phoneNumber?.enabled);
  } catch {
    //si la consulta falla se asume que solo hay email (es lo que funciona seguro)
  }
  return metodos;
}