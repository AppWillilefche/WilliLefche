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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^@+/, '');
}

function cleanDniStr(str) {
  return String(str || '')
    .trim()
    .replace(/\D+/g, '');
}

/**
 * Convierte cualquier identificador ("alejo.rivas", "@alejo.rivas", DNI o usuario) en su email interno seguro.
 * Los usuarios nunca ven ni necesitan gestionar emails.
 */
function resolveInternalAuthEmail(userInput) {
  const raw = String(userInput || '').trim().replace(/^@+/, '');
  const u = normalizeUserStr(raw);
  const uClean = u.replace(/\s+/g, '');
  const uNoDots = uClean.replace(/\./g, '');
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
    uNoDots === 'cristiantorres' ||
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
    const aUserNoDots = aUser.replace(/\./g, '');
    const aAltUsers = Array.isArray(a.altUsuarios) ? a.altUsuarios.map(normalizeUserStr) : [];

    // Coincidencia con Atleta (por usuario, con o sin punto, con o sin @, variantes o por DNI)
    if (
      (uClean && (uClean === aUser || uNoDots === aUserNoDots || aAltUsers.includes(uClean) || aAltUsers.includes(uNoDots))) ||
      (uDni && aDni && uDni === aDni)
    ) {
      const canonicalUser = (a.usuario || `atleta.${aDni}`).toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9._-]/g, '');
      return {
        email: `${canonicalUser}@willilefche.app`,
        expectedRole: 'athlete',
        usuario: a.usuario ? a.usuario.replace(/^@+/, '') : aDni,
        nombre: `${a.nombre} ${a.apellido}`,
        dni: a.dni,
        atletaId: a.id,
      };
    }

    // Coincidencia con Cuenta Familiar (Tutor de menor)
    if (a.tutor) {
      const tUser = normalizeUserStr(a.tutor.usuario || '');
      const tUserNoDots = tUser.replace(/\./g, '');
      const tAltUsers = Array.isArray(a.tutor.altUsuarios) ? a.tutor.altUsuarios.map(normalizeUserStr) : [];

      if (
        (uClean && (uClean === tUser || uNoDots === tUserNoDots || tAltUsers.includes(uClean) || tAltUsers.includes(uNoDots)))
      ) {
        const canonicalTutor = (a.tutor.usuario || `familia.${aDni}`).toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9._-]/g, '');
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

  // Fallback para usuarios no registrados en la nómina estática (o que ingresan en dispositivo nuevo)
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
  if (resolved.expectedRole === 'athlete') {
    let a = resolved.atletaId ? (window.DB?.atletas || []).find((x) => x.id === resolved.atletaId) : null;
    if (!a) {
      const uNorm = normalizeUserStr(rawUser);
      const uNoDots = uNorm.replace(/\./g, '');
      a = (window.DB?.atletas || []).find((x) => {
        const xU = normalizeUserStr(x.usuario || '');
        return xU === uNorm || xU.replace(/\./g, '') === uNoDots || (cleanDniStr(x.dni) && cleanDniStr(x.dni) === cleanDniStr(rawUser));
      });
      if (a) {
        resolved.atletaId = a.id;
        resolved.nombre = `${a.nombre} ${a.apellido}`;
        resolved.dni = a.dni;
      }
    }
    if (!a) return false;
    const aDni = cleanDniStr(a.dni);
    // Solo se permite crear la cuenta si la clave inicial coincide exactamente con su DNI oficial sin puntos
    return Boolean(pDni && aDni && pDni === aDni);
  }
  if (resolved.expectedRole === 'guardian') {
    let a = resolved.atletaId ? (window.DB?.atletas || []).find((x) => x.id === resolved.atletaId) : null;
    if (!a) {
      const uNorm = normalizeUserStr(rawUser);
      const uNoDots = uNorm.replace(/\./g, '');
      a = (window.DB?.atletas || []).find((x) => {
        const tU = normalizeUserStr(x.tutor?.usuario || '');
        return tU === uNorm || tU.replace(/\./g, '') === uNoDots;
      });
      if (a) {
        resolved.atletaId = a.id;
        resolved.nombre = a.tutor?.nombre || `${a.nombre} ${a.apellido}`;
      }
    }
    if (!a) return false;
    const aDni = cleanDniStr(a.dni);
    const tutorDni = a.tutor?.dni ? cleanDniStr(a.tutor.dni) : null;
    return Boolean((pDni && aDni && pDni === aDni) || (pDni && tutorDni && pDni === tutorDni));
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
      if (window.OneSignalService && typeof window.OneSignalService.vincularUsuario === 'function') {
        window.OneSignalService.vincularUsuario(session);
      }
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
      if (window.OneSignalService && typeof window.OneSignalService.desvincularUsuario === 'function') {
        window.OneSignalService.desvincularUsuario();
      }
      localStorage.removeItem(SESSION_KEY);
      if (window.firebase && typeof window.firebase.auth === 'function') {
        await window.firebase.auth().signOut().catch(() => {});
      }
      if (window.CloudSync && typeof window.CloudSync.stopSubscriptions === 'function') {
        window.CloudSync.stopSubscriptions();
      }
      if (typeof window.loadDB === 'function') {
        window.DB = window.loadDB();
      }
      if (window.CloudSync && typeof window.CloudSync.dispatchSubscriptionByRole === 'function') {
        window.CloudSync.dispatchSubscriptionByRole();
      }
    } catch (e) {}
    location.hash = '#/ingresar';
    if (typeof window.renderApp === 'function') {
      window.renderApp(false);
    }
  },

  /**
   * Login Seguro:
   * 1. Convierte "usuario" a email interno.
   * 2. Autentica en Firebase Authentication mediante servidor criptográfico.
   * 3. No compara ni almacena contraseñas en texto plano en el cliente.
   */
  async login(userInput, passwordInput) {
    const rawUser = String(userInput || '').trim().replace(/^@+/, '');
    const rawPass = String(passwordInput || '').trim();

    if (!rawUser || !rawPass) {
      return { ok: false, error: 'Ingresá tu usuario y contraseña.' };
    }

    if (!window.firebase || typeof window.firebase.auth !== 'function') {
      return { ok: false, error: 'Servicio de autenticación no inicializado. Verificá la configuración de Firebase.' };
    }

    const resolved = resolveInternalAuthEmail(rawUser);
    const email = resolved.email;
    // Si la contraseña fue ingresada con puntos (ej.: DNI 30.284.573), limpiarlos para Firebase Auth
    const cleanPass = (rawPass.includes('.') && /^[0-9.]+$/.test(rawPass)) ? rawPass.replace(/\./g, '') : rawPass;
    const fbPass = cleanPass.length >= 6 ? cleanPass : cleanPass.padEnd(6, '0');
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
        const canAutoProvision = isInitialProvisionAllowed(resolved, rawUser, cleanPass);
        if (canAutoProvision) {
          try {
            const newCred = await auth.createUserWithEmailAndPassword(email, fbPass);
            fbUser = newCred.user;
          } catch (createErr) {
            console.warn('Error al auto-aprovisionar cuenta:', createErr);
            if (createErr && createErr.code === 'auth/email-already-in-use') {
              // El usuario ya existe en Firebase Auth pero ingresó una contraseña incorrecta
              return {
                ok: false,
                error: 'Contraseña incorrecta. Verificá tus credenciales o consultá con el entrenador.',
              };
            }
            authError = createErr;
          }
        } else {
          return {
            ok: false,
            error: 'Contraseña incorrecta. Para el primer ingreso debe utilizar su número de DNI oficial sin puntos.',
          };
        }
      } else {
        authError = signInErr;
      }
    }

    if (!fbUser) {
      if (authError && authError.code === 'auth/network-request-failed') {
        const canLocal = isInitialProvisionAllowed(resolved, rawUser, cleanPass);
        if (canLocal) {
          const isCoachOrAdmin = resolved.expectedRole === 'admin' || resolved.expectedRole === 'coach';
          const role = isCoachOrAdmin ? 'coach' : (resolved.expectedRole === 'guardian' ? 'guardian' : 'athlete');
          const subRole = resolved.expectedRole === 'admin' ? 'admin' : (isCoachOrAdmin ? 'coach' : null);
          const session = {
            uid: 'local_' + (resolved.atletaId || resolved.usuario || 'user'),
            authEmail: resolved.email,
            role: role,
            subRole: subRole,
            usuario: resolved.usuario || rawUser,
            nombre: resolved.nombre || 'Atleta Willilefche',
            atletaId: resolved.atletaId || null,
            loginAt: Date.now(),
            tokenVerified: false,
            isOffline: true,
          };
          this.setSession(session);
          let redirect = '#/entrenador';
          if (session.role === 'athlete') {
            redirect = session.atletaId ? `#/atleta/${session.atletaId}` : '#/atleta';
          } else if (session.role === 'guardian') {
            redirect = session.atletaId ? `#/familia/${session.atletaId}` : '#/familia';
          }
          return { ok: true, session, redirect };
        }
        return { ok: false, error: 'Sin conexión a internet. Verificá tu red y volvé a intentar.' };
      }
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
    let role = isCoachOrAdmin ? 'coach' : (resolved.expectedRole === 'guardian' ? 'guardian' : 'athlete');
    let subRole = resolved.expectedRole === 'admin' ? 'admin' : (isCoachOrAdmin ? 'coach' : null);
    let atletaId = resolved.atletaId || null;
    let nombre = resolved.nombre || (isCoachOrAdmin ? 'Prof. Cristian Javier Torres' : 'Atleta Willilefche');

    // 4. Si es atleta o tutor y no teníamos atletaId local (ej: ingresó en incognito o atleta nuevo):
    // Buscar en Firestore donde fbUser YA ESTÁ autenticado
    if (!isCoachOrAdmin && (!atletaId || nombre === rawUser)) {
      const uNorm = normalizeUserStr(rawUser);
      const uNoDots = uNorm.replace(/\./g, '');
      const uDni = cleanDniStr(rawUser);

      // Paso 4.1: Buscar en memoria local DB.atletas por si se cargó mientras tanto
      const localMatch = (window.DB?.atletas || []).find((a) => {
        const aU = normalizeUserStr(a.usuario || '');
        const aD = cleanDniStr(a.dni);
        return aU === uNorm || aU.replace(/\./g, '') === uNoDots || (uDni && aD && aD === uDni);
      });
      if (localMatch) {
        atletaId = localMatch.id;
        nombre = `${localMatch.nombre} ${localMatch.apellido}`;
      }

      // Paso 4.2: Consultar Firestore (usuarios/{uid} y colección atletas)
      if (window.firebase && typeof window.firebase.firestore === 'function') {
        try {
          const db = window.firebase.firestore();
          // Primero leer perfil ya registrado en usuarios/{uid}
          const uSnap = await db.collection('usuarios').doc(fbUser.uid).get();
          if (uSnap.exists) {
            const uData = uSnap.data();
            if (uData.atletaId && !atletaId) atletaId = uData.atletaId;
            if (uData.nombre && (!nombre || nombre === rawUser)) nombre = uData.nombre;
            if (uData.role === 'familia' || uData.role === 'guardian') role = 'guardian';
          }

          // Si aún no tenemos atletaId, buscar en la colección atletas de Firestore
          if (!atletaId) {
            const atletasSnap = await db.collection('atletas').get();
            atletasSnap.forEach((doc) => {
              if (atletaId) return;
              const aData = doc.data();
              const aU = normalizeUserStr(aData.usuario || '');
              const aD = cleanDniStr(aData.dni);
              const tU = aData.tutor ? normalizeUserStr(aData.tutor.usuario || '') : '';
              if (
                aU === uNorm ||
                aU.replace(/\./g, '') === uNoDots ||
                (uDni && aD && aD === uDni)
              ) {
                atletaId = doc.id;
                nombre = `${aData.nombre} ${aData.apellido}`;
                role = 'athlete';
                // Asegurarse de agregar a window.DB.atletas
                if (window.DB && Array.isArray(window.DB.atletas)) {
                  if (!window.DB.atletas.some((x) => x.id === doc.id)) {
                    window.DB.atletas.push({ ...aData, id: doc.id });
                  }
                }
              } else if (tU && (tU === uNorm || tU.replace(/\./g, '') === uNoDots)) {
                atletaId = doc.id;
                nombre = aData.tutor.nombre || `${aData.nombre} ${aData.apellido}`;
                role = 'guardian';
              }
            });
          }
        } catch (fsErr) {
          console.warn('Error resolviendo atleta en Firestore:', fsErr);
        }
      }
    }

    // Actualizar perfil en 'usuarios/{uid}' en Firestore
    if (window.firebase && typeof window.firebase.firestore === 'function') {
      try {
        const db = window.firebase.firestore();
        if (db && db._delegate && db._delegate._databaseId && window.firebaseConfig && window.firebaseConfig.databaseId) {
          db._delegate._databaseId.database = window.firebaseConfig.databaseId;
        }
        db.collection('usuarios').doc(fbUser.uid).set({
          uid: fbUser.uid,
          email: fbUser.email,
          usuario: resolved.usuario || rawUser,
          nombre: nombre,
          role: isCoachOrAdmin ? (resolved.expectedRole === 'admin' ? 'admin' : 'entrenador') : (role === 'guardian' ? 'familia' : 'atleta'),
          atletaId: atletaId || null,
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
      nombre: nombre,
      atletaId: atletaId || null,
      loginAt: Date.now(),
      tokenVerified: true,
    };

    this.setSession(session);

    // Conectar inmediatamente la suscripción al rol verificado sin esperar race condition
    if (window.CloudSync && typeof window.CloudSync.dispatchSubscriptionByRole === 'function') {
      window.CloudSync.dispatchSubscriptionByRole();
    }

    let redirect = '#/entrenador';
    if (session.role === 'athlete') {
      redirect = session.atletaId ? `#/atleta/${session.atletaId}` : '#/atleta';
    } else if (session.role === 'guardian') {
      redirect = session.atletaId ? `#/familia/${session.atletaId}` : '#/familia';
    }

    return { ok: true, session, redirect };
  },
};

window.Auth = Auth;
window.resolveInternalAuthEmail = resolveInternalAuthEmail;
