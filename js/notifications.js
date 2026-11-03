/**
 * notifications.js · Sistema de Notificaciones Push (OneSignal)
 * Willilefche · Escuela Municipal de Valcheta
 */

window.OneSignalService = {
  APP_ID: '60403ec1-b02c-482f-9632-3796ceff041a',
  REST_API_KEY: 'os_v2_app_mbad5qnqfzec7frsg6lm57yedl6iyijnr5ouvhuiitx7u2pffbiq3navybonopx3ucfox5lnyecuzme34whfspqila2os5e6dhqbmli',
  BASE_URL: 'https://appwillilefche.github.io/WilliLefche/',

  init() {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        // Detectar si estamos en GitHub Pages (/WilliLefche/) o en raíz
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

        // Si ya hay usuario autenticado en la sesión, vincularlo
        if (window.Auth && window.Auth.currentUser) {
          this.vincularUsuario(window.Auth.currentUser);
        }
      } catch (err) {
        console.warn('OneSignal init warning:', err);
      }
    });
  },

  async vincularUsuario(user) {
    if (!user) return;
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        const idExterno =
          user.role === 'entrenador' || user.role === 'admin'
            ? 'coach'
            : (user.atletaId || user.uid || 'atleta');

        await OneSignal.login(idExterno);
        await OneSignal.User.addTags({
          role: user.role || 'atleta',
          atletaId: user.atletaId || '',
          nombre: user.nombre || '',
        });
        console.log('OneSignal: usuario identificado como:', idExterno);
      } catch (e) {
        console.warn('OneSignal login warning:', e);
      }
    });
  },

  async desvincularUsuario() {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.logout();
        console.log('OneSignal: usuario desvinculado.');
      } catch (e) {
        console.warn('OneSignal logout warning:', e);
      }
    });
  },

  async pedirPermiso() {
    return new Promise((resolve) => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          await OneSignal.Notifications.requestPermission();
          const permission = OneSignal.Notifications.permission;
          resolve(permission);
        } catch (e) {
          console.warn('OneSignal requestPermission error:', e);
          resolve(false);
        }
      });
    });
  },

  async obtenerEstadoPermiso() {
    return new Promise((resolve) => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          const perm = OneSignal.Notifications.permission;
          resolve(Boolean(perm));
        } catch (e) {
          resolve(false);
        }
      });
    });
  },

  /**
   * Envía una notificación push mediante la API REST de OneSignal
   * @param {Object} params
   * @param {string} params.titulo - Título de la notificación
   * @param {string} params.cuerpo - Contenido del mensaje
   * @param {string} [params.url] - Enlace al tocar la notificación
   * @param {string} [params.target] - 'todos' | 'coach' | 'atletas'
   * @param {Array<string>} [params.destinatariosIds] - Lista de atletaId
   */
  async enviarPush({ titulo, cuerpo, url, target = 'todos', destinatariosIds = [] }) {
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

      // Probar autenticación con prefijo Key y Basic
      for (const prefix of ['Key', 'Basic']) {
        try {
          const resp = await fetch('https://api.onesignal.com/notifications', {
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
        } catch (fetchErr) {
          // continuar con el siguiente formato
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
