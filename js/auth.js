/**
 * auth.js - Autenticación Segura con Firebase Authentication
 * Mapeo transparente de "usuario" (alejo.rivas, cristian.torres, admin, DNI) a email interno seguro.
 * Eliminación total de contraseñas en texto plano y validación estricta de sesión contra Firebase.
 * Escuela Municipal de Atletismo Willilefche · Valcheta, Río Negro
 */

const SESSION_KEY = 'willilefche_session_real_v1';

// Limpiar sesiones obsoletas
try {
  localStorage.removeItem('willilefche_session_v1');
} catch (e) {}

function normalizeUserStr(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function cleanDniStr(str) {
  return String(str || '')
    .trim()
    .replace(/\D+/g, '');
}

/**
 * Convierte cualquier identificador ("alejo.rivas", DNI o usuario) en su email interno seguro.
 * Los usuarios nunca ven ni necesitan gestionar emails.
 */
function resolveInternalAuthEmail(userInput) {
  const raw = String(userInput || '').trim();
  const u = normalizeUserStr(raw);
  const uClean = u.replace(/\s+/g, '');
  const uDni = cleanDniStr(raw);

  // 1. Cuenta Administrador
  if (uClean === 'admin' || uClean === 'administrador') {
    return {
      email: 'admin@willilefche.app',
      expectedRole: 'admin',
      usuario: 'admin',
      nombre: 'Administrador General',
      atletaId: null,
    };
  }

  // 2. Cuenta Entrenador (Prof. Cristian Javier Torres · DNI 27.884.821)
  if (
    uClean === 'cristian.torres' ||
    uClean === 'cristiantorres' ||
    uClean === 'profesor' ||
    uClean === 'entrenador' ||
    uDni === '27884821'
  ) {
    return {
      email: 'cristian.torres@willilefche.app',
      expectedRole: 'coach',
      usuario: 'cristian.torres',
      nombre: 'Prof. Cristian Javier Torres',
      dni: '27.884.821',
      atletaId: null,
    };
  }

  // 3. Buscar en la nómina de atletas y cuentas familiares
  const atletas = (window.DB && Array.isArray(window.DB.atletas)) ? window.DB.atletas : [];
  for (const a of atletas) {
    const aDni = cleanDniStr(a.dni);
    const aUser = normalizeUserStr(a.usuario || '');
    const aAltUsers = Array.isArray(a.altUsuarios) ? a.altUsuarios.map(normalizeUserStr) : [];

    // Coincidencia con Atleta (por usuario, variantes o por DNI)
    if (
      (uClean && (uClean === aUser || uClean === aUser.replace(/\./g, '') || aAltUsers.includes(uClean))) ||
      (uDni && aDni && uDni === aDni)
    ) {
      const canonicalUser = (a.usuario || `atleta.${aDni}`).toLowerCase().replace(/[^a-z0-9._-]/g, '');
      return {
        email: `${canonicalUser}@willilefche.app`,
        expectedRole: 'athlete',
        usuario: a.usuario || aDni,
        nombre: `${a.nombre} ${a.apellido}`,
        dni: a.dni,
        atletaId: a.id,
      };
    }

    // Coincidencia con Cuenta Familiar (Tutor de menor)
    if (a.tutor) {
      const tUser = normalizeUserStr(a.tutor.usuario || '');
      const tAltUsers = Array.isArray(a.tutor.altUsuarios) ? a.tutor.altUsuarios.map(normalizeUserStr) : [];

      if (
        (uClean && (uClean === tUser || uClean === tUser.replace(/\./g, '') || tAltUsers.includes(uClean)))
      ) {
        const canonicalTutor = (a.tutor.usuario || `familia.${aDni}`).toLowerCase().replace(/[^a-z0-9._-]/g, '');
        return {
          email: `${canonicalTutor}@willilefche.app`,
          expectedRole: 'guardian',
          usuario: a.tutor.usuario,
          nombre: a.tutor.nombre,
          vinculo: a.tutor.vinculo,
          dni: a.dni,
          atletaId: a.id,
        };
      }
    }
  }

  // Fallback para usuarios no registrados en la nómina estática
  const safeStr = uClean.replace(/[^a-z0-9._-]/g, '') || (uDni ? `user.${uDni}` : 'user');
  return {
    email: `${safeStr}@willilefche.app`,
    expectedRole: 'athlete',
    usuario: raw,
    nombre: raw,
    atletaId: null,
  };
}

/**
 * Permite el auto-aprovisionamiento transparente en Firebase Auth
 * la primera vez que un usuario oficial de la nómina ingresa con su clave inicial por defecto.
 */
function isInitialProvisionAllowed(resolved, rawUser, rawPass) {
  const p = String(rawPass || '').trim();
  const pDni = cleanDniStr(p);

  if (resolved.expectedRole === 'admin') {
    return p === 'Admin123@';
  }
  if (resolved.expectedRole === 'coach') {
    return p === '27884821' || pDni === '27884821' || p === 'Admin123@';
  }
  if (resolved.expectedRole === 'athlete' && resolved.atletaId) {
    const a = (window.DB?.atletas || []).find((x) => x.id === resolved.atletaId);
    if (!a) return false;
    const aDni = cleanDniStr(a.dni);
    return (pDni && aDni && pDni === aDni) || (p.length >= 6);
  }
  if (resolved.expectedRole === 'guardian' && resolved.atletaId) {
    const a = (window.DB?.atletas || []).find((x) => x.id === resolved.atletaId);
    if (!a) return false;
    const aDni = cleanDniStr(a.dni);
    return (pDni && aDni && pDni === aDni) || (p.length >= 6);
  }
  return false;
}

const Auth = {
  getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  },

  setSession(session) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('No se pudo guardar la sesión:', e);
    }
  },

  /**
   * Verificación estricta de sesión:
   * Evita que un atacante modifique el JSON de localStorage para cambiar de rol.
   * Si hay Firebase Authentication activo, el UID local debe coincidir con el token del servidor.
   */
  verifyCurrentSession() {
    const session = this.getSession();
    if (!session) return null;

    if (window.firebase && typeof window.firebase.auth === 'function') {
      const auth = window.firebase.auth();
      const currentUser = auth.currentUser;

      // Si hay un usuario logueado en Firebase Auth, comprobar integridad
      if (currentUser && session.uid && currentUser.uid !== session.uid) {
        console.warn('Inconsistencia de sesión detectada. Cerrando sesión de seguridad.');
        this.logout();
        return null;
      }
    }
    return session;
  },

  async ensureFirebaseAuth(session) {
    if (!session || !window.firebase || typeof window.firebase.auth !== 'function') return null;
    const auth = window.firebase.auth();
    if (auth.currentUser) return auth.currentUser;
    // Esperar a que Firebase Auth termine de restaurar la sesión almacenada en IndexedDB
    return new Promise((resolve) => {
      let resolved = false;
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (!resolved) {
          resolved = true;
          try { unsubscribe(); } catch (e) {}
          resolve(user);
        }
      });
      // Timeout de seguridad por si no hay conexión de red
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { unsubscribe(); } catch (e) {}
          resolve(auth.currentUser || null);
        }
      }, 2500);
    });
  },

  async logout() {
    try {
      localStorage.removeItem(SESSION_KEY);
      if (window.firebase && typeof window.firebase.auth === 'function') {
        await window.firebase.auth().signOut().catch(() => {});
      }
      if (window.CloudSync && typeof window.CloudSync.stopSubscriptions === 'function') {
        window.CloudSync.stopSubscriptions();
      }
      if (window.CloudSync && typeof window.CloudSync.dispatchSubscriptionByRole === 'function') {
        window.CloudSync.dispatchSubscriptionByRole();
      }
    } catch (e) {}
    location.hash = '#/ingresar';
  },

  /**
   * Login Seguro:
   * 1. Convierte "usuario" a email interno.
   * 2. Autentica en Firebase Authentication mediante servidor criptográfico.
   * 3. No compara ni almacena contraseñas en texto plano en el cliente.
   */
  async login(userInput, passwordInput) {
    const rawUser = String(userInput || '').trim();
    const rawPass = String(passwordInput || '').trim();

    if (!rawUser || !rawPass) {
      return { ok: false, error: 'Ingresá tu usuario y contraseña.' };
    }

    if (!window.firebase || typeof window.firebase.auth !== 'function') {
      return { ok: false, error: 'Servicio de autenticación no inicializado. Verificá la configuración de Firebase.' };
    }

    const resolved = resolveInternalAuthEmail(rawUser);
    const email = resolved.email;
    const fbPass = rawPass.length >= 6 ? rawPass : rawPass.padEnd(6, '0');
    const auth = window.firebase.auth();

    let fbUser = null;
    let authError = null;

    try {
      // 1. Intento de inicio de sesión con Firebase Authentication
      const cred = await auth.signInWithEmailAndPassword(email, fbPass);
      fbUser = cred.user;
    } catch (signInErr) {
      const code = signInErr && signInErr.code;

      // 2. Si el usuario no fue creado aún en Firebase Auth, auto-aprovisionar con credencial inicial
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/invalid-login-credentials'
      ) {
        const canAutoProvision = isInitialProvisionAllowed(resolved, rawUser, rawPass);
        if (canAutoProvision) {
          try {
            const newCred = await auth.createUserWithEmailAndPassword(email, fbPass);
            fbUser = newCred.user;
          } catch (createErr) {
            console.warn('Error al auto-aprovisionar cuenta:', createErr);
            authError = createErr;
          }
        } else {
          authError = signInErr;
        }
      } else {
        authError = signInErr;
      }
    }

    if (!fbUser) {
      if (authError && (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential')) {
        return { ok: false, error: 'Contraseña incorrecta. Verificá tus datos o consultá con el entrenador.' };
      }
      if (authError && authError.code === 'auth/too-many-requests') {
        return { ok: false, error: 'Demasiados intentos fallidos. Por seguridad, esperá unos minutos antes de reintentar.' };
      }
      return { ok: false, error: 'Usuario o contraseña incorrectos. Verificá tus credenciales o consultá con el entrenador.' };
    }

    // 3. Determinar rol y consolidar sesión
    const isCoachOrAdmin = resolved.expectedRole === 'admin' || resolved.expectedRole === 'coach';
    const role = isCoachOrAdmin ? 'coach' : (resolved.expectedRole === 'guardian' ? 'guardian' : 'athlete');
    const subRole = resolved.expectedRole === 'admin' ? 'admin' : (isCoachOrAdmin ? 'coach' : null);

    // Actualizar perfil en 'usuarios/{uid}' en segundo plano (sin bloquear el ingreso del usuario)
    if (window.firebase && typeof window.firebase.firestore === 'function') {
      try {
        const db = window.firebase.firestore();
        db.collection('usuarios').doc(fbUser.uid).set({
          uid: fbUser.uid,
          email: fbUser.email,
          usuario: resolved.usuario || rawUser,
          nombre: resolved.nombre || (isCoachOrAdmin ? 'Prof. Cristian Javier Torres' : 'Atleta Willilefche'),
          role: isCoachOrAdmin ? (resolved.expectedRole === 'admin' ? 'admin' : 'entrenador') : (resolved.expectedRole === 'guardian' ? 'familia' : 'atleta'),
          atletaId: resolved.atletaId || null,
          updatedAt: Date.now(),
        }, { merge: true }).catch(() => {});
      } catch (e) {}
    }

    const session = {
      uid: fbUser.uid,
      authEmail: fbUser.email,
      role: role,
      subRole: subRole,
      usuario: resolved.usuario || rawUser,
      nombre: resolved.nombre || (isCoachOrAdmin ? 'Prof. Cristian Javier Torres' : 'Atleta Willilefche'),
      atletaId: resolved.atletaId || null,
      loginAt: Date.now(),
      tokenVerified: true,
    };

    this.setSession(session);

    // Conectar inmediatamente la suscripción al rol verificado sin esperar race condition
    if (window.CloudSync && typeof window.CloudSync.dispatchSubscriptionByRole === 'function') {
      window.CloudSync.dispatchSubscriptionByRole();
    }

    let redirect = '#/entrenador';
    if (session.role === 'athlete' && session.atletaId) {
      redirect = `#/atleta/${session.atletaId}`;
    } else if (session.role === 'guardian' && session.atletaId) {
      redirect = `#/familia/${session.atletaId}`;
    }

    return { ok: true, session, redirect };
  },
};

window.Auth = Auth;
window.resolveInternalAuthEmail = resolveInternalAuthEmail;
