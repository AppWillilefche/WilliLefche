/**
 * auth.js - Gestión de Sesiones Reales y Control de Acceso por Rol
 * Roles: Administrador (admin), Entrenador (Cristian Javier Torres), Atletas y Familias
 * Escuela Municipal de Atletismo Willilefche · Valcheta, Río Negro
 */

const SESSION_KEY = 'willilefche_session_real_v1';

// Limpiar sesiones de prueba anteriores
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
    .replace(/\./g, '')
    .replace(/\s+/g, '');
}

function getAuthEmailForUser(usuario, dni) {
  const clean = normalizeUserStr(usuario || dni).replace(/[^a-z0-9._-]/g, '');
  return `${clean || 'user'}@willilefche.app`;
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

  async ensureFirebaseAuth(session) {
    if (!session || !window.firebase || typeof window.firebase.auth !== 'function') return null;
    const auth = window.firebase.auth();
    if (auth.currentUser) return auth.currentUser;

    let email = null;
    let rawPass = null;
    const eq = window.DB?.equipo || {};

    if (session.subRole === 'admin') {
      email = 'admin@willilefche.app';
      rawPass = eq.adminPass || 'Admin123@';
    } else if (session.role === 'coach') {
      email = 'cristian.torres@willilefche.app';
      rawPass = eq.coachPass || '27884821';
    } else if (session.atletaId) {
      const a = (window.DB?.atletas || []).find((x) => x.id === session.atletaId);
      if (a) {
        if (session.role === 'guardian' && a.tutor) {
          email = getAuthEmailForUser(a.tutor.usuario, a.dni);
          rawPass = a.tutor.password || a.password || a.dni;
        } else {
          email = getAuthEmailForUser(a.usuario, a.dni);
          rawPass = a.password || a.dni;
        }
      }
    }

    if (!email || !rawPass) return null;
    const fbPass = String(rawPass).length >= 6 ? String(rawPass) : String(rawPass).padEnd(6, '0');

    try {
      let user = null;
      try {
        const cred = await auth.signInWithEmailAndPassword(email, fbPass);
        user = cred.user;
      } catch (err) {
        const code = err && err.code;
        if (
          code === 'auth/user-not-found' ||
          code === 'auth/invalid-credential' ||
          code === 'auth/invalid-login-credentials'
        ) {
          const newCred = await auth.createUserWithEmailAndPassword(email, fbPass);
          user = newCred.user;
        } else {
          console.warn('Aviso ensureFirebaseAuth signIn:', err.message || err);
        }
      }

      if (user) {
        session.uid = user.uid;
        session.authEmail = user.email;
        this.setSession(session);
        if (window.firebase.firestore) {
          const roleToStore =
            session.subRole === 'admin'
              ? 'admin'
              : session.role === 'coach'
              ? 'entrenador'
              : session.role === 'athlete'
              ? 'atleta'
              : 'familia';
          window.firebase
            .firestore()
            .collection('usuarios')
            .doc(user.uid)
            .set(
              {
                uid: user.uid,
                usuario: session.usuario || '',
                nombre: session.nombre || '',
                role: roleToStore,
                atletaId: session.atletaId || null,
                dni: session.dni || null,
                updatedAt: Date.now(),
              },
              { merge: true }
            )
            .catch(() => {});
        }
        return user;
      }
    } catch (e) {
      console.warn('Error en ensureFirebaseAuth:', e);
    }
    return null;
  },

  async logout() {
    try {
      localStorage.removeItem(SESSION_KEY);
      if (window.firebase && typeof window.firebase.auth === 'function') {
        await window.firebase.auth().signOut().catch(() => {});
      }
      if (window.CloudSync && window.CloudSync._unsubscribe) {
        window.CloudSync._unsubscribe();
        window.CloudSync._unsubscribe = null;
      }
    } catch (e) {}
    location.hash = '#/ingresar';
  },

  async login(userInput, passwordInput) {
    const rawUser = String(userInput || '').trim();
    const rawPass = String(passwordInput || '').trim();

    if (!rawUser || !rawPass) {
      return { ok: false, error: 'Ingresá tu usuario y contraseña.' };
    }

    const u = normalizeUserStr(rawUser);
    const uDni = cleanDniStr(rawUser);
    const pDni = cleanDniStr(rawPass);

    const eq = window.DB?.equipo || {};
    const adminUser = normalizeUserStr(eq.adminUser || 'admin');
    const adminPass = String(eq.adminPass || 'Admin123@');

    let session = null;
    let redirect = '#/entrenador';

    // 1. Verificar Usuario Administrador (admin / Admin123@)
    if (u === adminUser && rawPass === adminPass) {
      session = {
        role: 'coach',
        subRole: 'admin',
        usuario: eq.adminUser || 'admin',
        nombre: 'Administrador General',
        loginAt: Date.now(),
      };
      redirect = '#/entrenador';
    }

    // 2. Verificar Usuario Entrenador (Fila 19: Cristian Javier Torres · DNI 27.884.821)
    if (!session) {
      const coachUser = normalizeUserStr(eq.coachUser || 'cristian.torres');
      const coachPass = cleanDniStr(eq.coachPass || '27884821');
      const coachDni = cleanDniStr(eq.entrenadorDni || '27.884.821');

      if (
        (u === coachUser || u === 'cristian.torres' || uDni === coachDni) &&
        (rawPass === (eq.coachPass || '27884821') || pDni === coachPass)
      ) {
        session = {
          role: 'coach',
          subRole: 'coach',
          usuario: eq.coachUser || 'cristian.torres',
          nombre: `Prof. ${eq.entrenador || 'Cristian Javier Torres'}`,
          dni: eq.entrenadorDni || '27.884.821',
          loginAt: Date.now(),
        };
        redirect = '#/entrenador';
      }
    }

    // 3. Verificar Usuarios Atletas y Cuentas Familiares
    if (!session) {
      const atletas = window.DB?.atletas || [];
      for (const a of atletas) {
        const aUser = normalizeUserStr(a.usuario);
        const aDni = cleanDniStr(a.dni);
        const aPass = String(a.password || aDni);
        const aPassClean = cleanDniStr(aPass);
        const altUsers = Array.isArray(a.altUsuarios) ? a.altUsuarios.map(normalizeUserStr) : [];
        const altPasses = Array.isArray(a.altPasswords) ? a.altPasswords.map(cleanDniStr) : [];

        // Coincidencia de Atleta (por nombre.apellido, variante o por DNI)
        const userMatchesAthlete =
          u === aUser ||
          altUsers.includes(u) ||
          (aDni && uDni === aDni) ||
          (uDni && altPasses.includes(uDni)) ||
          (a.email && u === normalizeUserStr(a.email));

        const passMatchesAthlete =
          rawPass === aPass ||
          (pDni && pDni === aPassClean) ||
          (pDni && altPasses.includes(pDni));

        if (userMatchesAthlete && passMatchesAthlete) {
          session = {
            role: 'athlete',
            atletaId: a.id,
            usuario: a.usuario,
            dni: a.dni,
            nombre: `${a.nombre} ${a.apellido}`,
            loginAt: Date.now(),
          };
          redirect = `#/atleta/${a.id}`;
          break;
        }

        // 4. Verificar Cuenta Familiar (Tutores de menores)
        if (a.tutor) {
          const tUser = normalizeUserStr(a.tutor.usuario);
          const tPass = String(a.tutor.password || aPass);
          const tPassClean = cleanDniStr(tPass);
          const altTutorUsers = Array.isArray(a.tutor.altUsuarios) ? a.tutor.altUsuarios.map(normalizeUserStr) : [];

          const userMatchesTutor =
            u === tUser ||
            altTutorUsers.includes(u) ||
            (a.tutor.email && u === normalizeUserStr(a.tutor.email));
          const passMatchesTutor =
            rawPass === tPass ||
            (pDni && pDni === tPassClean) ||
            (pDni && altPasses.includes(pDni));

          if (userMatchesTutor && passMatchesTutor) {
            session = {
              role: 'guardian',
              atletaId: a.id,
              usuario: a.tutor.usuario,
              nombre: a.tutor.nombre,
              vinculo: a.tutor.vinculo,
              loginAt: Date.now(),
            };
            redirect = `#/familia/${a.id}`;
            break;
          }
        }
      }
    }

    if (!session) {
      return {
        ok: false,
        error: 'Usuario o contraseña incorrectos. Verificá tus datos o consultá con el entrenador.',
      };
    }

    // -----------------------------------------------------------------
    // SINCRONIZACIÓN TRANSPARENTE CON FIREBASE AUTHENTICATION
    // Firma cada petición hacia Firestore con request.auth.uid
    // -----------------------------------------------------------------
    if (window.firebase && typeof window.firebase.auth === 'function') {
      try {
        const auth = window.firebase.auth();
        let email = null;
        if (session.subRole === 'admin') {
          email = 'admin@willilefche.app';
        } else if (session.role === 'coach') {
          email = 'cristian.torres@willilefche.app';
        } else {
          email = getAuthEmailForUser(session.usuario, session.dni);
        }
        const fbPass = String(rawPass).length >= 6 ? String(rawPass) : String(rawPass).padEnd(6, '0');

        let fbUser = null;
        try {
          const cred = await auth.signInWithEmailAndPassword(email, fbPass);
          fbUser = cred.user;
        } catch (signInErr) {
          const code = signInErr && signInErr.code;
          if (
            code === 'auth/user-not-found' ||
            code === 'auth/invalid-credential' ||
            code === 'auth/invalid-login-credentials'
          ) {
            try {
              const newCred = await auth.createUserWithEmailAndPassword(email, fbPass);
              fbUser = newCred.user;
            } catch (createErr) {
              console.warn('Aviso auto-creación Firebase Auth:', createErr.message || createErr);
            }
          } else {
            console.warn('Aviso signInWithEmailAndPassword:', signInErr.message || signInErr);
          }
        }

        if (fbUser) {
          session.uid = fbUser.uid;
          session.authEmail = fbUser.email;

          // Registrar / asegurar documento en 'usuarios/{uid}' de Firestore
          if (window.firebase.firestore) {
            try {
              const db = window.firebase.firestore();
              const roleToStore =
                session.subRole === 'admin'
                  ? 'admin'
                  : session.role === 'coach'
                  ? 'entrenador'
                  : session.role === 'athlete'
                  ? 'atleta'
                  : 'familia';

              await db.collection('usuarios').doc(fbUser.uid).set(
                {
                  uid: fbUser.uid,
                  usuario: session.usuario || '',
                  nombre: session.nombre || '',
                  role: roleToStore,
                  atletaId: session.atletaId || null,
                  dni: session.dni || null,
                  updatedAt: Date.now(),
                },
                { merge: true }
              );
            } catch (docErr) {
              console.warn('Aviso guardando doc en usuarios/{uid}:', docErr.message || docErr);
            }
          }
        }
      } catch (authErr) {
        console.warn('Firebase Auth no disponible:', authErr);
      }
    }

    this.setSession(session);
    return { ok: true, session, redirect };
  },
};

window.Auth = Auth;
