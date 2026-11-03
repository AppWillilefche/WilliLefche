/**
 * notifications.js · Sistema de Notificaciones Inteligentes (In-App + Sonido + Push Nativo + OneSignal)
 * Willilefche · Escuela Municipal de Valcheta
 */

window.NotificationSystem = {
  // 1. Sintetizador de audio Web Audio API (agradable chime doble tono cristalino)
  tocarSonido() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(880.00, now + 0.11); // A5

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.42);
    } catch (e) {
      // Audio autoplay policy o no soportado
    }
  },

  // 2. Banner flotante interactivo en la pantalla (In-App Floating Banner)
  mostrarBanner({ titulo, cuerpo, url, autor = '' }) {
    if (typeof document === 'undefined') return;

    let container = document.getElementById('notification-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-toast-container';
      container.className = 'fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto bg-card border-2 border-primary/50 text-card-foreground shadow-2xl rounded-2xl p-4 flex gap-3 items-start transform transition-all duration-300 -translate-y-4 opacity-0 cursor-pointer hover:border-primary';
    toast.style.cssText = 'box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);';

    const snippet = (cuerpo || '').substring(0, 95) + (cuerpo && cuerpo.length > 95 ? '...' : '');

    toast.innerHTML = `
      <div class="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
        <svg xmlns="http://www.w3.org/2000/svg" class="size-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      </div>
      <div class="flex-1 min-w-0 pr-1">
        <p class="text-[11px] font-bold uppercase tracking-wider text-primary">${autor ? `Mensaje de ${autor}` : 'Notificación'}</p>
        <h4 class="font-bold text-sm text-foreground truncate mt-0.5">${titulo || 'Nuevo mensaje'}</h4>
        <p class="text-xs text-muted-foreground mt-0.5 line-clamp-2">${snippet}</p>
        ${url ? `<span class="mt-2 text-xs font-bold text-primary inline-flex items-center gap-1">Ver mensaje →</span>` : ''}
      </div>
      <button type="button" class="close-notif-btn text-muted-foreground hover:text-foreground p-1 text-sm font-bold leading-none shrink-0" title="Cerrar">✕</button>
    `;

    toast.onclick = (e) => {
      if (e.target.closest('.close-notif-btn')) {
        e.stopPropagation();
        toast.remove();
        return;
      }
      if (url) {
        if (url.startsWith('#')) {
          location.hash = url;
          if (typeof window.renderApp === 'function') window.renderApp();
        } else {
          location.href = url;
        }
      }
      toast.remove();
    };

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.transform = 'translateY(-10px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }
    }, 7000);
  },

  // 3. Disparador unificado de notificación (Sonido + Banner + Push nativo)
  notificar({ titulo, cuerpo, url, autor = '' }) {
    // a) Reproducir sonido de alerta
    this.tocarSonido();

    // b) Mostrar banner flotante en pantalla
    this.mostrarBanner({ titulo, cuerpo, url, autor });

    // c) Notificación nativa del SO (Windows/Android/Chrome) si está autorizada
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(titulo || 'Willilefche', {
          body: (cuerpo || '').substring(0, 160),
          icon: 'img/icon-192.png',
          badge: 'img/icon-192.png',
          tag: 'msg-' + Date.now()
        });
        if (url) {
          notif.onclick = () => {
            window.focus();
            if (url.startsWith('#')) {
              location.hash = url;
              if (typeof window.renderApp === 'function') window.renderApp();
            }
          };
        }
      } catch (e) {}
    }

    // d) Actualizar contadores y badges en la interfaz
    if (typeof window.renderApp === 'function') {
      window.renderApp();
    }
  },

  // 4. Contador de mensajes no leídos
  contarAvisosNoLeidos(rol, atletaId = null) {
    if (!window.DB || !Array.isArray(window.DB.avisos)) return 0;
    
    if (rol === 'coach' || rol === 'entrenador') {
      return window.DB.avisos.filter((av) => {
        if (!av) return false;
        if (av.autor === 'atleta') {
          return !av.leidoPorCoach;
        }
        if (Array.isArray(av.respuestas) && av.respuestas.length > 0) {
          const lastResp = av.respuestas[av.respuestas.length - 1];
          return lastResp.rol === 'atleta' && !av.leidoPorCoach;
        }
        return false;
      }).length;
    } else if (rol === 'atleta' && atletaId) {
      return window.DB.avisos.filter((av) => {
        if (!av) return false;
        const esParaMi =
          (Array.isArray(av.destinatarios) && (av.destinatarios.includes(atletaId) || av.destinatarios.includes('TODOS'))) ||
          av.atletaId === atletaId;
        if (!esParaMi) return false;
        
        const leidosList = Array.isArray(av.leidosAtletas) ? av.leidosAtletas : [];
        if (av.autor !== 'atleta') {
          return !leidosList.includes(atletaId);
        }
        if (Array.isArray(av.respuestas) && av.respuestas.length > 0) {
          const lastResp = av.respuestas[av.respuestas.length - 1];
          return lastResp.rol === 'entrenador' && !leidosList.includes(atletaId);
        }
        return false;
      }).length;
    }
    return 0;
  },

  // 5. Marcar como leídos
  marcarTodosLeidos(rol, atletaId = null) {
    if (!window.DB || !Array.isArray(window.DB.avisos)) return;
    let changed = false;

    if (rol === 'coach' || rol === 'entrenador') {
      window.DB.avisos.forEach((av) => {
        if (!av.leidoPorCoach) {
          av.leidoPorCoach = true;
          changed = true;
          if (window.saveDB) window.saveDB({ type: 'aviso', data: av });
        }
      });
    } else if (rol === 'atleta' && atletaId) {
      window.DB.avisos.forEach((av) => {
        av.leidosAtletas = Array.isArray(av.leidosAtletas) ? av.leidosAtletas : [];
        if (!av.leidosAtletas.includes(atletaId)) {
          av.leidosAtletas.push(atletaId);
          av.leidos = (av.leidos || 0) + 1;
          changed = true;
          if (window.saveDB) window.saveDB({ type: 'aviso', data: av });
        }
      });
    }
  }
};

window.OneSignalService = {
  APP_ID: '60403ec1-b02c-482f-9632-3796ceff041a',
  REST_API_KEY: 'os_v2_app_mbad5qnqfzec7frsg6lm57yedlxiyzffa4fetsu7q2ebk2jcgkiy4uzlho65tfxd2kpgqlf5eare5whunzrml7p5rwbigad5itbnkvq',
  BASE_URL: 'https://appwillilefche.github.io/WilliLefche/',

  init() {
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

  async enviarPush({ titulo, cuerpo, url, target = 'todos', destinatariosIds = [] }) {
    // Envío a la nube por OneSignal REST si está configurado
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
      const prefixes = ['Key', 'key', 'Bearer', 'Basic'];

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
