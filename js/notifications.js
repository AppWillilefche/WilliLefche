/**
 * notifications.js · Sistema de Notificaciones Push (Nativas + OneSignal)
 * Willilefche · Escuela Municipal de Valcheta
 */

window.OneSignalService = {
  APP_ID: '60403ec1-b02c-482f-9632-3796ceff041a',
  REST_API_KEY: 'os_v2_app_mbad5qnqfzec7frsg6lm57yedlxiyzffa4fetsu7q2ebk2jcgkiy4uzlho65tfxd2kpgqlf5eare5whunzrml7p5rwbigad5itbnkvq',
  BASE_URL: 'https://appwillilefche.github.io/WilliLefche/',

  init() {
    // Si no estamos en un entorno seguro HTTPS o localhost, omitir inicialización externa
    if (typeof window === 'undefined') return;
    const isHttpsOrLocal = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isHttpsOrLocal) {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          const path = window.location.pathname;
          const scope = path.includes('/WilliLefche') ? '/WilliLefche/' : '/';

          await OneSignal.init({
            appId: this.APP_ID,
            serviceWorkerPath: 'OneSignalSDKWorker.js',
            serviceWorkerParam: { scope },
            allowLocalhostAsSecureOrigin: true,
            notifyButton: { enable: false },
          });

          console.log('OneSignal inicializado con scope:', scope);

          const session = window.Auth && typeof window.Auth.getSession === 'function' ? window.Auth.getSession() : null;
          if (session) {
            this.vincularUsuario(session);
          }
        } catch (err) {
          console.warn('OneSignal init warning:', err);
        }
      });
    }
  },

  async vincularUsuario(user) {
    if (!user) return;
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        const idExterno =
          user.role === 'coach' || user.role === 'entrenador' || user.subRole === 'admin'
            ? 'coach'
            : (user.atletaId || user.uid || 'atleta');

        if (OneSignal.login) {
          await OneSignal.login(idExterno);
        }
        if (OneSignal.User && OneSignal.User.addTags) {
          await OneSignal.User.addTags({
            role: user.role || 'atleta',
            atletaId: user.atletaId || '',
            nombre: user.nombre || '',
          });
        }
      } catch (e) {
        console.warn('OneSignal login warning:', e);
      }
    });
  },

  async desvincularUsuario() {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        if (OneSignal.logout) {
          await OneSignal.logout();
        }
      } catch (e) {
        console.warn('OneSignal logout warning:', e);
      }
    });
  },

  /**
   * Solicita permisos de notificación usando la API nativa del navegador
   * y los sincroniza con OneSignal sin bloquear nunca la interfaz.
   */
  async pedirPermiso() {
    let nativeGranted = false;

    // 1. Solicitar permiso mediante la API nativa del navegador
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        nativeGranted = perm === 'granted';
      } catch (e) {
        console.warn('Error en Notification.requestPermission nativo:', e);
      }
    }

    // 2. Intentar registrar en OneSignal con timeout de seguridad (máximo 2 segundos)
    const oneSignalPromise = new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          resolve(nativeGranted);
        }
      }, 2000);

      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          if (OneSignal.Notifications && OneSignal.Notifications.requestPermission) {
            await OneSignal.Notifications.requestPermission();
          }
          if (!done) {
            done = true;
            clearTimeout(timer);
            const perm = OneSignal.Notifications ? OneSignal.Notifications.permission : nativeGranted;
            resolve(Boolean(perm) || nativeGranted);
          }
        } catch (e) {
          if (!done) {
            done = true;
            clearTimeout(timer);
            resolve(nativeGranted);
          }
        }
      });
    });

    const result = await oneSignalPromise;
    return Boolean(result || nativeGranted);
  },

  async obtenerEstadoPermiso() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true;
    }
    return false;
  },

  /**
   * Envía una notificación push inmediata (nativa + OneSignal REST)
   */
  async enviarPush({ titulo, cuerpo, url, target = 'todos', destinatariosIds = [] }) {
    // 1. Disparo de notificación local nativa si el permiso está concedido
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(titulo || 'Willilefche', {
          body: (cuerpo || '').substring(0, 180),
          icon: 'img/icon-192.png',
          badge: 'img/icon-192.png',
        });
      } catch (e) {}
    }

    // 2. Envío a la nube por OneSignal REST
    try {
      const payload = {
        app_id: this.APP_ID,
        target_channel: 'push',
        headings: { es: titulo || 'Willilefche' },
        contents: { es: (cuerpo || '').substring(0, 180) },
        url: url || this.BASE_URL,
      };

      if (target === 'todos') {
        payload.included_segments = ['Subscribed Users'];
      } else if (target === 'coach') {
        payload.include_aliases = { external_id: ['coach'] };
        payload.include_external_user_ids = ['coach'];
      } else if (Array.isArray(destinatariosIds) && destinatariosIds.length > 0) {
        if (destinatariosIds.includes('TODOS')) {
          payload.included_segments = ['Subscribed Users'];
        } else {
          const validIds = destinatariosIds.filter((id) => id && id !== 'TODOS');
          if (validIds.length === 0) return;
          payload.include_aliases = { external_id: validIds };
          payload.include_external_user_ids = validIds;
        }
      }

      const endpoints = ['https://api.onesignal.com/notifications', 'https://onesignal.com/api/v1/notifications'];
      const prefixes = ['Key', 'Bearer', 'Basic'];

      for (const ep of endpoints) {
        for (const prefix of prefixes) {
          try {
            const resp = await fetch(ep, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `${prefix} ${this.REST_API_KEY}`,
                'accept': 'application/json',
              },
              body: JSON.stringify(payload),
            });

            if (resp.ok) {
              console.log('Push enviado exitosamente por OneSignal!');
              return;
            }
          } catch (fetchErr) {}
        }
      }
    } catch (err) {
      console.warn('OneSignal push dispatch error:', err);
    }
  },
};

// Auto-inicializar OneSignal al cargar
if (typeof window !== 'undefined') {
  window.OneSignalService.init();
}
