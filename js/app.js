/**
 * app.js - Aplicación Principal Willilefche · Escuela Municipal de Valcheta
 * Con Autenticación por Rol, Sincronización en Nube (Firebase Firestore), Backups JSON y Gestión Completa (CRUD).
 */

const State = {
  rankingDistancia: '1500 m',
  rankingGenero: 'todos',
  atletasQuery: '',
  atletasCat: 'Todas',
  atletasDisciplina: 'Todas',
  fichaTab: 'plan',
  planFiltro: 'todas',
  pagosEstado: 'Todos',
  pagosConcepto: 'Todos',
  avisoTipo: 'General',
  avisoDest: 'Todo el grupo',
  portalTab: 'semana',
  mobileMenuOpen: false,
  loginError: '',
};

function filtrarSesionesPorPeriodo(sesiones, filtro) {
  const ordenadas = [...(sesiones || [])].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  if (!filtro || filtro === 'todas') return ordenadas;
  const hoyStr = DB.hoy || new Date().toISOString().slice(0, 10);
  if (filtro === 'dia') {
    return ordenadas.filter((s) => s.fecha === hoyStr);
  }
  if (filtro === 'mes') {
    const ym = hoyStr.slice(0, 7);
    return ordenadas.filter((s) => (s.fecha || '').startsWith(ym));
  }
  if (filtro === 'semana') {
    const hoyDate = new Date(hoyStr + 'T00:00:00');
    const day = hoyDate.getDay() || 7;
    const lunes = new Date(hoyDate);
    lunes.setDate(hoyDate.getDate() - day + 1);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    const minStr = lunes.toISOString().slice(0, 10);
    const maxStr = domingo.toISOString().slice(0, 10);
    return ordenadas.filter((s) => s.fecha >= minStr && s.fecha <= maxStr);
  }
  return ordenadas;
}

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---------- Sistema de Toasts ---------- */
function showToast(msg, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className =
    'toast-item pointer-events-auto flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 text-sm font-medium shadow-lg text-card-foreground';
  const iconHtml =
    type === 'success'
      ? '<span class="grid size-6 shrink-0 place-items-center rounded-full bg-success-soft text-success">✓</span>'
      : '<span class="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">i</span>';
  el.innerHTML = `${iconHtml}<span class="flex-1">${esc(msg)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.2s ease';
    setTimeout(() => el.remove(), 220);
  }, 3200);
}
window.showToast = showToast;

/* ---------- Componentes de Marca y Badges ---------- */

function renderLogo({ invert = false, className = '' } = {}) {
  const ringCls = invert ? 'ring-white/15' : 'ring-border';
  const titleCls = invert ? 'text-ink-foreground' : 'text-foreground';
  const subCls = invert ? 'text-ink-foreground/70' : 'text-muted-foreground';
  return `
    <a href="#/" class="flex items-center gap-2.5 font-display text-2xl font-extrabold uppercase tracking-tight ${className}">
      <img
        src="img/logo-willilefche.jpg"
        alt="Willilefche"
        width="40"
        height="40"
        class="size-10 shrink-0 rounded-full bg-ink object-cover ring-2 ${ringCls}"
      />
      <span class="flex flex-col leading-none">
        <span class="${titleCls}">Willilefche</span>
        <span class="mt-0.5 font-sans text-[0.625rem] font-semibold normal-case tracking-normal ${subCls}">
          Escuela Municipal · Valcheta
        </span>
      </span>
    </a>
  `;
}

const INTENSIDAD_ESTILO = {
  Z1: 'bg-muted text-muted-foreground',
  Z2: 'bg-success-soft text-success',
  Z3: 'bg-warning-soft text-warning-text',
  Z4: 'bg-accent text-accent-foreground',
  Z5: 'bg-primary text-primary-foreground',
};

const INTENSIDAD_NOMBRE = {
  Z1: 'Muy suave',
  Z2: 'Suave',
  Z3: 'Moderado',
  Z4: 'Exigente',
  Z5: 'Máximo',
};

function renderIntensidadChip(z) {
  if (!z) return '';
  return `<span title="${esc(INTENSIDAD_NOMBRE[z])}" class="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${INTENSIDAD_ESTILO[z] || ''}">${esc(z)} · ${esc(INTENSIDAD_NOMBRE[z])}</span>`;
}

function renderEstadoSesionBadge(estado) {
  const map = {
    realizado: ['Realizado', 'bg-success-soft text-success'],
    'no-realizado': ['No realizado', 'bg-destructive/10 text-destructive'],
    pendiente: ['Pendiente', 'bg-muted text-muted-foreground'],
  };
  const [label, cls] = map[estado] || map.pendiente;
  return `<span class="rounded-full px-2 py-0.5 text-xs font-medium ${cls}">${label}</span>`;
}

function renderEstadoPagoBadge(estado, motivoRechazo = null) {
  const map = {
    pagado: ['Pagado', 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'],
    pendiente: ['Pendiente', 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'],
    vencido: ['Vencido', 'bg-destructive/15 text-destructive border border-destructive/30'],
    informado: ['En revisión', 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'],
    rechazado: ['Rechazado', 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'],
  };
  const [label, cls] = map[estado] || map.pendiente;
  const tooltip = (estado === 'rechazado' && motivoRechazo) ? ` title="Motivo: ${esc(motivoRechazo)}"` : '';
  return `<span${tooltip} class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}">${label}</span>`;
}

function renderAvatar(nombre, apellido, sizeCls = 'size-10 text-base') {
  const initials = `${(nombre || '?')[0]}${(apellido || '')[0] || ''}`;
  return `<span aria-hidden="true" class="grid shrink-0 place-items-center rounded-full bg-secondary font-display font-bold uppercase text-secondary-foreground ${sizeCls}">${esc(initials)}</span>`;
}

/* ---------- Gráfico SVG de Evolución de Ritmo (PaceChart) ---------- */
function renderPaceChart(data) {
  const puntos = (data || []).filter((d) => d.ritmoSeg > 0);
  if (puntos.length < 2) {
    return `<p class="text-sm text-muted-foreground">Aún no hay suficientes registros para mostrar la evolución.</p>`;
  }
  const w = 320;
  const h = 140;
  const pad = { t: 16, r: 44, b: 24, l: 8 };
  const vals = puntos.map((p) => p.ritmoSeg);
  const min = Math.min(...vals) - 6;
  const max = Math.max(...vals) + 6;
  const x = (i) => pad.l + (i / (puntos.length - 1)) * (w - pad.l - pad.r);
  const y = (v) => pad.t + ((v - min) / (max - min)) * (h - pad.t - pad.b);
  const path = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.ritmoSeg).toFixed(1)}`).join(' ');
  const area = `${path} L${x(puntos.length - 1).toFixed(1)},${h - pad.b} L${x(0).toFixed(1)},${h - pad.b} Z`;
  const ultimo = puntos[puntos.length - 1];
  const mejora = puntos[0].ritmoSeg - ultimo.ritmoSeg;

  const linesSvg = [0.25, 0.5, 0.75]
    .map((f) => {
      const yPos = (pad.t + f * (h - pad.t - pad.b)).toFixed(1);
      return `<line x1="${pad.l}" x2="${w - pad.r}" y1="${yPos}" y2="${yPos}" stroke="var(--border)" stroke-dasharray="2 4" />`;
    })
    .join('');

  const pointsSvg = puntos
    .map((p, i) => {
      const cx = x(i).toFixed(1);
      const cy = y(p.ritmoSeg).toFixed(1);
      const r = i === puntos.length - 1 ? 4.5 : 3;
      return `
        <g>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--card)" stroke="var(--primary)" stroke-width="2">
            <title>${esc(p.mes)}: ${Helpers.formatoRitmo(p.ritmoSeg)} /km</title>
          </circle>
          <text x="${cx}" y="${h - 6}" text-anchor="middle" fill="var(--muted-foreground)" font-size="10">${esc(p.mes)}</text>
        </g>
      `;
    })
    .join('');

  return `
    <figure class="m-0">
      <svg viewBox="0 0 ${w} ${h}" class="w-full" role="img">
        ${linesSvg}
        <path d="${area}" fill="oklch(0.55 0.17 138 / 0.12)" />
        <path d="${path}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        ${pointsSvg}
        <text x="${(x(puntos.length - 1) + 8).toFixed(1)}" y="${(y(ultimo.ritmoSeg) + 4).toFixed(1)}" fill="var(--foreground)" font-size="11" font-weight="600">
          ${Helpers.formatoRitmo(ultimo.ritmoSeg)}
        </text>
      </svg>
      <figcaption class="mt-1 text-xs text-muted-foreground">
        Ritmo promedio de rodaje (min/km).
        ${
          mejora > 0
            ? `<span class="font-medium text-success">${mejora} s/km más rápido desde ${esc(puntos[0].mes)}.</span>`
            : `<span>Sin mejora en el período.</span>`
        }
      </figcaption>
    </figure>
  `;
}

/* ---------- Tarjeta de Sesión de Entrenamiento (SessionCard) ---------- */
function renderSessionCard(sesion, actionHtml = '') {
  const d = Helpers.diaSemana(sesion.fecha);
  const esHoy = sesion.fecha === DB.hoy;
  const borderCls = esHoy ? 'border-primary ring-2 ring-primary/15' : '';
  const bgCls = sesion.tipo === 'Descanso' ? 'bg-muted/60' : 'bg-card';

  return `
    <article class="relative flex gap-4 rounded-xl border p-4 ${bgCls} ${borderCls}">
      <div class="flex w-12 shrink-0 flex-col items-center">
        <span class="text-xs font-semibold uppercase ${esHoy ? 'text-primary' : 'text-muted-foreground'}">
          ${esHoy ? 'Hoy' : d.dia}
        </span>
        <span class="font-display text-3xl font-bold leading-none">${d.num}</span>
        <span class="text-xs text-muted-foreground">${d.mes}</span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">${esc(sesion.tipo)}</span>
          ${sesion.disciplina ? `<span class="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">🏃 ${esc(sesion.disciplina)}</span>` : ''}
          ${sesion.intensidad ? renderIntensidadChip(sesion.intensidad) : ''}
          ${
            sesion.modificada
              ? `<span class="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-text">Modificado por el entrenador</span>`
              : ''
          }
          <span class="ml-auto">${renderEstadoSesionBadge(sesion.estado)}</span>
        </div>
        <h3 class="mt-1 text-xl font-bold">${esc(sesion.titulo)}</h3>
        ${sesion.detalle ? `<p class="mt-1 text-sm text-muted-foreground">${esc(sesion.detalle)}</p>` : ''}
        <dl class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          ${
            sesion.distanciaKm
              ? `<div class="flex items-center gap-1.5"><i data-lucide="route" class="size-4 text-muted-foreground"></i><dd class="font-medium tabular-nums">${esc(sesion.distanciaKm)} km</dd></div>`
              : ''
          }
          ${
            sesion.duracionMin
              ? `<div class="flex items-center gap-1.5"><i data-lucide="clock" class="size-4 text-muted-foreground"></i><dd class="font-medium tabular-nums">${esc(sesion.duracionMin)} min</dd></div>`
              : ''
          }
          ${
            sesion.ritmo
              ? `<div class="flex items-center gap-1.5"><i data-lucide="gauge" class="size-4 text-muted-foreground"></i><dd class="font-medium tabular-nums">${esc(sesion.ritmo)}</dd></div>`
              : ''
          }
          ${
            sesion.series
              ? `<div class="flex items-center gap-1.5"><i data-lucide="repeat" class="size-4 text-muted-foreground"></i><dd class="font-medium">${esc(sesion.series)}</dd></div>`
              : ''
          }
          ${
            sesion.recuperacion
              ? `<div class="flex items-center gap-1.5"><i data-lucide="rotate-ccw" class="size-4 text-muted-foreground"></i><dd class="font-medium">${esc(sesion.recuperacion)}</dd></div>`
              : ''
          }
        </dl>
        ${
          sesion.resultadoReal || sesion.distanciaRealKm || sesion.tiempoRealMin || sesion.comentario || sesion.sensacion
            ? `<div class="mt-3 space-y-1.5 rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-sm">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                    <i data-lucide="clipboard-check" class="size-3.5"></i> Informe de la sesión
                  </span>
                  ${
                    sesion.sensacion
                      ? `<span class="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-0.5 text-xs font-bold shadow-2xs">
                          Esfuerzo: ${sesion.sensacion}/5 ${['', '😣', '😕', '😐', '🙂', '💪'][sesion.sensacion] || ''}
                        </span>`
                      : ''
                  }
                </div>
                ${
                  sesion.resultadoReal || sesion.distanciaRealKm || sesion.tiempoRealMin
                    ? `<p class="font-semibold text-foreground">
                        📊 Resultado: ${esc(sesion.resultadoReal || 'Completado')}
                        ${sesion.distanciaRealKm ? ` · <span class="tabular-nums">${esc(sesion.distanciaRealKm)} km reales</span>` : ''}
                        ${sesion.tiempoRealMin ? ` · <span class="tabular-nums">${esc(sesion.tiempoRealMin)} min</span>` : ''}
                      </p>`
                    : ''
                }
                ${
                  sesion.comentario
                    ? `<p class="text-muted-foreground">💬 “${esc(sesion.comentario)}”</p>`
                    : ''
                }
              </div>`
            : ''
        }
        ${actionHtml}
      </div>
    </article>
  `;
}

/* ---------- Header y Footer Públicos ---------- */
function renderPublicHeader(activePath = '/') {
  const session = typeof Auth.verifyCurrentSession === 'function' ? Auth.verifyCurrentSession() : Auth.getSession();
  const links = [
    { to: '#/', path: '/', label: 'Inicio' },
    { to: '#/rankings', path: '/rankings', label: 'Rankings' },
    { to: '#/competencias', path: '/competencias', label: 'Calendario' },
  ];

  let ctaHref = '#/ingresar';
  let ctaLabel = 'Ingresar';
  if (session) {
    if (session.role === 'coach') {
      ctaHref = '#/entrenador';
      ctaLabel = 'Panel Entrenador';
    } else if (session.role === 'athlete') {
      ctaHref = `#/atleta/${session.atletaId}`;
      ctaLabel = 'Mi Portal';
    } else if (session.role === 'guardian') {
      ctaHref = `#/familia/${session.atletaId}`;
      ctaLabel = 'Cuenta Familiar';
    }
  }

  return `
    <header class="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-content items-center justify-between px-4 sm:px-6">
        ${renderLogo()}
        <nav class="hidden items-center gap-1 md:flex" aria-label="Principal">
          ${links
            .map(
              (l) => `
            <a href="${l.to}" class="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-foreground ${
                activePath === l.path ? 'text-foreground font-semibold' : 'text-muted-foreground'
              }">
              ${l.label}
            </a>
          `
            )
            .join('')}
        </nav>
        <div class="flex items-center gap-2">
          <a href="${ctaHref}" class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs hover:opacity-95">
            ${ctaLabel}
          </a>
        </div>
      </div>
    </header>
  `;
}

function renderPublicFooter() {
  return `
    <footer class="border-t bg-ink text-ink-foreground">
      <div class="mx-auto flex max-w-content flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        ${renderLogo({ invert: true })}
        <p class="text-sm text-ink-foreground/70">
          Los rankings públicos muestran solo nombre, categoría, edad y marcas. Los datos personales son privados.
        </p>
      </div>
    </footer>
  `;
}

/* ==========================================================================
   PANTALLAS PÚBLICAS
   ========================================================================== */

function viewHome() {
  const top10k = Helpers.rankingPublico('10K').slice(0, 3);
  const proximas = DB.competencias.slice(0, 3);
  const modulos = [
    {
      icon: 'clipboard-list',
      titulo: 'Planes a medida',
      texto: 'Cargá entrenamientos por día, semana o mes con distancias, ritmos, zonas de intensidad y recuperaciones.',
    },
    {
      icon: 'heart-handshake',
      titulo: 'Seguimiento individual',
      texto: 'Cada corredor marca lo que hizo y deja sus sensaciones. Vos ves la adherencia y la evolución de cada uno.',
    },
    {
      icon: 'calendar-days',
      titulo: 'Calendario de carreras',
      texto: 'Competencias programadas, sugerencias para cada atleta, resultados y un historial deportivo completo.',
    },
    {
      icon: 'wallet',
      titulo: 'Cuotas y pagos',
      texto: 'Cuotas, indumentaria, inscripciones y viajes. Vencimientos y deudas a la vista en un solo lugar.',
    },
    {
      icon: 'megaphone',
      titulo: 'Avisos y mensajes',
      texto: 'Avisos generales, cambios de entrenamiento, próximas competencias y mensajes individuales.',
    },
    {
      icon: 'lock',
      titulo: 'Acceso privado',
      texto: 'Cada atleta ve solo lo suyo. Las familias de menores ingresan con una cuenta autorizada.',
    },
  ];

  return `
    <div class="min-h-screen">
      ${renderPublicHeader('/')}

      <section class="relative isolate overflow-hidden bg-ink text-ink-foreground">
        <img
          src="img/hero.png"
          alt="Grupo de corredores entrenando en la pista al atardecer mientras el entrenador toma tiempos"
          class="absolute inset-0 -z-10 size-full object-cover object-[70%_center] opacity-55"
        />
        <div class="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/20"></div>
        <div class="mx-auto grid max-w-content items-center gap-10 px-4 pb-20 pt-16 sm:px-6 md:pb-28 md:pt-24 lg:grid-cols-[1fr_auto]">
          <div>
            <p class="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-sm text-ink-foreground/80">
              <span class="size-2 rounded-full bg-brand-lime" aria-hidden="true"></span>
              ${esc(DB.equipo.nombre)} · ${esc(DB.equipo.sede)}
            </p>
            <h1 class="max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.95] sm:text-7xl">
              <span class="text-brand-lime">Entrenamos hoy,</span>
              <span class="text-brand-blue brightness-125">construimos mañana</span>
            </h1>
            <p class="mt-6 max-w-xl text-lg text-ink-foreground/80">
              La plataforma de la Escuela Municipal de Valcheta: planes de entrenamiento personalizados, fichas de cada atleta, competencias, pagos y comunicación con corredores y familias. Desde el celular o la computadora.
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
              <a href="#/ingresar" class="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm hover:opacity-95">
                Ingresar a mi cuenta <i data-lucide="arrow-right" class="size-4"></i>
              </a>
              <a href="#/rankings" class="inline-flex h-12 items-center gap-2 rounded-lg border border-white/30 bg-transparent px-6 text-base font-semibold text-ink-foreground hover:bg-white/10">
                <i data-lucide="trophy" class="size-4"></i> Ver rankings
              </a>
            </div>
          </div>
          <img
            src="img/logo-willilefche.jpg"
            alt="Logo de Willilefche, Escuela Municipal de Valcheta"
            width="320"
            height="320"
            class="hidden size-80 rounded-full object-cover shadow-2xl ring-4 ring-white/10 lg:block"
          />
        </div>
      </section>

      <section class="mx-auto max-w-content px-4 py-16 sm:px-6 md:py-24">
        <div class="max-w-2xl">
          <h2 class="font-display text-4xl font-bold uppercase">Pensado para el día a día del entrenador</h2>
          <p class="mt-3 text-muted-foreground">
            Simple de usar para vos y para cada corredor. Empieza con lo esencial y crece con el grupo.
          </p>
        </div>
        <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          ${modulos
            .map(
              (m) => `
            <div class="rounded-xl border bg-card p-6">
              <i data-lucide="${m.icon}" class="size-7 text-primary"></i>
              <h3 class="mt-4 text-2xl font-bold">${esc(m.titulo)}</h3>
              <p class="mt-2 text-sm text-muted-foreground">${esc(m.texto)}</p>
            </div>
          `
            )
            .join('')}
        </div>
      </section>

      <section class="border-y bg-secondary/60">
        <div class="mx-auto grid max-w-content gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <div class="flex items-end justify-between">
              <h2 class="font-display text-3xl font-bold uppercase">Mejores marcas · 1500 m</h2>
              <a href="#/rankings" class="text-sm font-medium text-primary hover:underline">Ver rankings</a>
            </div>
            ${
              top10k.length === 0
                ? `<div class="mt-6 rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
                    Todavía no se han registrado marcas oficiales en esta temporada.
                  </div>`
                : `<ol class="mt-6 divide-y rounded-xl border bg-card">
                    ${top10k
                      .map(
                        (r, i) => `
                      <li class="flex items-center gap-4 px-5 py-4">
                        <span class="font-display text-3xl font-extrabold text-primary tabular-nums">${i + 1}</span>
                        <div class="flex-1">
                          <p class="font-semibold">${esc(r.nombre)}</p>
                          <p class="text-sm text-muted-foreground">${esc(r.categoria)} · ${r.edad} años</p>
                        </div>
                        <span class="font-display text-2xl font-bold tabular-nums">${esc(r.tiempo)}</span>
                      </li>
                    `
                      )
                      .join('')}
                  </ol>`
            }
          </div>
          <div>
            <div class="flex items-end justify-between">
              <h2 class="font-display text-3xl font-bold uppercase">Próximas competencias</h2>
              <a href="#/competencias" class="text-sm font-medium text-primary hover:underline">Calendario</a>
            </div>
            ${
              proximas.length === 0
                ? `<div class="mt-6 rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
                    El calendario de competencias se actualizará con las próximas fechas del equipo.
                  </div>`
                : `<ul class="mt-6 space-y-3">
                    ${proximas
                      .map((c) => {
                        const d = Helpers.diaSemana(c.fecha);
                        return `
                        <li class="flex items-center gap-4 rounded-xl border bg-card px-5 py-4">
                          <div class="w-12 text-center">
                            <p class="font-display text-3xl font-bold leading-none">${d.num}</p>
                            <p class="text-xs uppercase text-muted-foreground">${d.mes}</p>
                          </div>
                          <div class="flex-1">
                            <p class="font-semibold">${esc(c.nombre)}</p>
                            <p class="text-sm text-muted-foreground">${esc(c.lugar)} · ${esc(c.distancias.join(' / '))}</p>
                          </div>
                          <span class="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                            ${esc(c.tipo)}
                          </span>
                        </li>
                      `;
                      })
                      .join('')}
                  </ul>`
            }
          </div>
        </div>
      </section>

      <section class="mx-auto max-w-content px-4 py-16 sm:px-6 md:py-24">
        <div class="grid gap-8 rounded-2xl bg-ink p-8 text-ink-foreground md:grid-cols-[1fr_auto] md:items-center md:p-12">
          <div>
            <i data-lucide="smartphone" class="size-8 text-primary"></i>
            <h2 class="mt-4 font-display text-4xl font-bold uppercase">Tres formas de ingresar</h2>
            <p class="mt-3 max-w-xl text-ink-foreground/75">
              <strong class="text-ink-foreground">Entrenador / Admin</strong> gestiona todo.
              <strong class="text-ink-foreground">Atleta</strong> consulta su plan, pagos y resultados.
              <strong class="text-ink-foreground">Familia</strong> acompaña a corredores menores de edad.
            </p>
          </div>
          <a href="#/ingresar" class="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground hover:opacity-95">
            Ingresar ahora <i data-lucide="arrow-right" class="size-4"></i>
          </a>
        </div>
      </section>

      ${renderPublicFooter()}
    </div>
  `;
}

function viewRankings() {
  if (!State.rankingCategoria) State.rankingCategoria = 'todas';
  const bloquesRank = [
    { id: 'todas', label: 'Todas las pruebas' },
    { id: 'running', label: '🏃 Running (Calle y Ruta)' },
    { id: 'pista', label: '⏱️ Pista (Velocidad y Fondo)' },
    { id: 'campo', label: '🥇 Campo (Lanzamientos y Saltos)' },
  ];

  const generos = [
    { v: 'todos', l: 'Todos' },
    { v: 'F', l: 'Mujeres' },
    { v: 'M', l: 'Varones' },
  ];

  const distanciasFiltradas = (DB.distanciasRanking || []).filter((d) => {
    if (State.rankingCategoria === 'running') {
      return ['5K', '10K', '15K', '21K', '42K'].includes(d);
    }
    if (State.rankingCategoria === 'campo') {
      return Helpers.esPruebaDeCampo(d);
    }
    if (State.rankingCategoria === 'pista') {
      return !['5K', '10K', '15K', '21K', '42K'].includes(d) && !Helpers.esPruebaDeCampo(d);
    }
    return true;
  });

  if (distanciasFiltradas.length > 0 && !distanciasFiltradas.includes(State.rankingDistancia)) {
    State.rankingDistancia = distanciasFiltradas[0];
  }

  const filas = Helpers.rankingPublico(State.rankingDistancia).filter(
    (r) => State.rankingGenero === 'todos' || r.genero === State.rankingGenero
  );

  return `
    <div class="min-h-screen flex flex-col">
      ${renderPublicHeader('/rankings')}
      <main class="mx-auto w-full max-w-content flex-1 px-4 py-12 sm:px-6">
        <h1 class="font-display text-5xl font-extrabold uppercase">Rankings y marcas</h1>
        <p class="mt-2 max-w-2xl text-muted-foreground">
          Mejores marcas personales del equipo en competencias oficiales (Running, Pista y Campo).
        </p>
        <p class="mt-4 inline-flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
          <i data-lucide="shield-check" class="size-4"></i>
          Solo se publican nombre, categoría, edad y rendimiento.
        </p>

        <div class="mt-6 flex flex-wrap gap-1.5 border-b pb-4">
          ${bloquesRank
            .map(
              (b) => `
            <button
              type="button"
              onclick="State.rankingCategoria = '${b.id}'; renderApp()"
              class="rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                State.rankingCategoria === b.id
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }"
            >
              ${b.label}
            </button>
          `
            )
            .join('')}
        </div>

        <div class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" aria-label="Distancia" class="flex flex-wrap gap-2">
            ${distanciasFiltradas
              .map(
                (d) => `
              <button
                type="button"
                onclick="setRankingDistancia('${d}')"
                class="rounded-full border px-4 py-1.5 font-display text-lg font-bold transition-colors ${
                  State.rankingDistancia === d
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card hover:bg-muted'
                }"
              >
                ${esc(d)}
              </button>
            `
              )
              .join('')}
          </div>
          <div class="flex gap-1 rounded-lg bg-muted p-1 self-start" aria-label="Filtrar por género">
            ${generos
              .map(
                (g) => `
              <button
                type="button"
                onclick="setRankingGenero('${g.v}')"
                class="rounded-md px-3 py-1 text-sm font-medium ${
                  State.rankingGenero === g.v ? 'bg-card shadow-xs text-foreground' : 'text-muted-foreground'
                }"
              >
                ${g.l}
              </button>
            `
              )
              .join('')}
          </div>
        </div>

        ${
          filas.length === 0
            ? `<div class="mt-6 rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                Todavía no hay marcas registradas en ${esc(State.rankingDistancia)} para este filtro.
              </div>`
            : `<ol class="mt-6 divide-y overflow-hidden rounded-xl border bg-card">
                ${filas
                  .map(
                    (r, i) => `
                  <li class="grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 px-4 py-4 sm:grid-cols-[3rem_1fr_12rem_auto] sm:px-6">
                    <span class="font-display text-3xl font-extrabold tabular-nums ${
                      i < 3 ? 'text-primary' : 'text-muted-foreground'
                    }">${i + 1}</span>
                    <div>
                      <p class="font-semibold">${esc(r.nombre)}</p>
                      <p class="text-sm text-muted-foreground">${esc(r.categoria)} · ${r.edad} años</p>
                    </div>
                    <p class="hidden text-sm text-muted-foreground sm:block">
                      ${esc(r.competencia)}<br />
                      ${Helpers.fechaCorta(r.fecha)}
                    </p>
                    <span class="font-display text-3xl font-bold tabular-nums">${esc(r.tiempo)}</span>
                  </li>
                `
                  )
                  .join('')}
              </ol>`
        }
      </main>
      ${renderPublicFooter()}
    </div>
  `;
}

window.setRankingDistancia = (d) => {
  State.rankingDistancia = d;
  renderApp();
};
window.setRankingGenero = (g) => {
  State.rankingGenero = g;
  renderApp();
};

function viewCompetenciasPublic() {
  return `
    <div class="min-h-screen flex flex-col">
      ${renderPublicHeader('/competencias')}
      <main class="mx-auto w-full max-w-content flex-1 px-4 py-12 sm:px-6">
        <h1 class="font-display text-5xl font-extrabold uppercase">Calendario de competencias</h1>
        <p class="mt-2 max-w-2xl text-muted-foreground">Las carreras y torneos en los que participa la Escuela Municipal Willilefche.</p>
        ${
          DB.competencias.length === 0
            ? `<div class="mt-8 rounded-xl border border-dashed bg-card p-12 text-center text-muted-foreground">
                Todavía no hay competencias cargadas en el calendario oficial.
              </div>`
            : `<ul class="mt-8 grid gap-4 md:grid-cols-2">
                ${DB.competencias
                  .map((c) => {
                    const d = Helpers.diaSemana(c.fecha);
                    const faltan = Helpers.diasHasta(c.fecha);
                    return `
                    <li class="flex gap-5 rounded-xl border bg-card p-5">
                      <div class="flex w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-ink py-3 text-ink-foreground">
                        <span class="text-xs uppercase opacity-70">${d.dia}</span>
                        <span class="font-display text-4xl font-bold leading-none">${d.num}</span>
                        <span class="text-xs uppercase opacity-70">${d.mes}</span>
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <span class="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">${esc(c.tipo)}</span>
                          <span class="text-xs text-muted-foreground">Faltan ${faltan} días</span>
                        </div>
                        <h2 class="mt-1 text-2xl font-bold">${esc(c.nombre)}</h2>
                        <p class="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <i data-lucide="map-pin" class="size-4"></i> ${esc(c.lugar)}
                        </p>
                        <p class="mt-2 text-sm">
                          Distancias: <span class="font-medium">${esc(c.distancias.join(' · '))}</span>
                        </p>
                        <p class="mt-1 text-sm text-muted-foreground">${c.inscriptos.length} atletas del equipo inscriptos</p>
                      </div>
                    </li>
                  `;
                  })
                  .join('')}
              </ul>`
        }
      </main>
      ${renderPublicFooter()}
    </div>
  `;
}

function viewIngresar() {
  return `
    <div class="grid min-h-screen lg:grid-cols-2">
      <div class="track-lines relative hidden bg-ink p-12 text-ink-foreground lg:flex lg:flex-col lg:justify-between">
        ${renderLogo({ invert: true })}
        <div>
          <p class="font-display text-5xl font-extrabold uppercase leading-none">
            Cada atleta ve<br />
            <span class="text-brand-lime">solo lo suyo.</span>
          </p>
          <p class="mt-4 max-w-sm text-ink-foreground/70">
            Tus datos, entrenamientos, pagos y resultados son privados. Solo tu entrenador y, si sos menor, tu familia autorizada pueden verlos.
          </p>
        </div>
        <div data-cloud-badge>${CloudSync.renderBadgeHtml()}</div>
      </div>

      <div class="flex flex-col justify-center px-4 py-10 sm:px-12">
        <div class="mx-auto w-full max-w-md">
          <div class="mb-8 flex items-center justify-between lg:hidden">
            ${renderLogo()}
            <div data-cloud-badge>${CloudSync.renderBadgeHtml()}</div>
          </div>

          <h1 class="font-display text-4xl font-extrabold uppercase">Ingresar a mi cuenta</h1>
          <p class="mt-1 text-sm text-muted-foreground">Ingresá con el usuario y contraseña asignados por la Escuela Municipal Willilefche.</p>

          <form onsubmit="handleLoginSubmit(event)" class="mt-6 space-y-4">
            ${
              State.loginError
                ? `<div class="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
                    ${esc(State.loginError)}
                  </div>`
                : ''
            }
            <div class="space-y-1.5">
              <label for="login-user" class="text-sm font-medium">Usuario</label>
              <input
                id="login-user"
                type="text"
                required
                autocomplete="username"
                placeholder="nombre.apellido (ej.: alejo.rivas o cristian.torres)"
                class="h-11 w-full rounded-lg border bg-card px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div class="space-y-1.5">
              <label for="login-pass" class="text-sm font-medium">Contraseña</label>
              <div class="relative">
                <input
                  id="login-pass"
                  type="password"
                  required
                  autocomplete="current-password"
                  placeholder="Tu número de DNI sin puntos"
                  class="h-11 w-full rounded-lg border bg-card pl-3.5 pr-16 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onclick="const i=document.getElementById('login-pass'); i.type = i.type==='password' ? 'text' : 'password'; this.textContent = i.type==='password' ? 'Ver' : 'Ocultar'"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Ver
                </button>
              </div>
            </div>
            <button
              type="submit"
              class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground shadow-xs hover:opacity-95"
            >
              Ingresar <i data-lucide="arrow-right" class="size-4"></i>
            </button>
          </form>

          <div class="mt-6 rounded-xl border bg-muted/40 p-4 text-xs text-muted-foreground space-y-1.5">
            <p class="font-semibold text-foreground">¿Cómo ingreso por primera vez?</p>
            <p>• <strong>Atletas y Entrenador:</strong> Usuario <code class="font-mono">nombre.apellido</code> y contraseña tu <strong>DNI sin puntos</strong>.</p>
            <p>• <strong>Familias (menores):</strong> Usuario <code class="font-mono">familia.apellido</code> y contraseña el <strong>DNI del atleta sin puntos</strong>.</p>
          </div>

          <div class="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <a href="#/" class="hover:text-foreground">← Volver al inicio</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.handleLoginSubmit = async (e) => {
  e.preventDefault();
  const u = document.getElementById('login-user').value;
  const p = document.getElementById('login-pass').value;
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-flex items-center gap-2"><svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> Verificando acceso…</span>`;
  }
  try {
    const res = await Auth.login(u, p);
    if (!res.ok) {
      State.loginError = res.error;
      renderApp();
      return;
    }
    State.loginError = '';
    showToast(`Bienvenido/a, ${res.session.nombre}`);
    location.hash = res.redirect;
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    State.loginError = 'Ocurrió un error al procesar el ingreso. Intentá nuevamente.';
    renderApp();
  }
};

/* ==========================================================================
   LAYOUT DEL ENTRENADOR (AppShell)
   ========================================================================== */

function renderCoachShell(activeSection, contentHtml) {
  const session = typeof Auth.verifyCurrentSession === 'function' ? Auth.verifyCurrentSession() : Auth.getSession();
  const isAdmin = Boolean(session && session.subRole === 'admin');
  const navItems = [
    { to: '#/entrenador', id: 'panel', label: 'Panel', icon: 'layout-dashboard' },
    { to: '#/entrenador/atletas', id: 'atletas', label: 'Atletas', icon: 'users' },
    { to: '#/entrenador/competencias', id: 'competencias', label: 'Competencias', icon: 'calendar-days' },
    { to: '#/entrenador/pagos', id: 'pagos', label: 'Pagos', icon: 'wallet' },
    { to: '#/entrenador/avisos', id: 'avisos', label: 'Avisos', icon: 'megaphone' },
  ];

  const navHtml = navItems
    .map((item) => {
      const isActive = activeSection === item.id;
      return `
        <a
          href="${item.to}"
          onclick="State.mobileMenuOpen = false"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isActive
              ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold'
              : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          }"
        >
          <i data-lucide="${item.icon}" class="size-5"></i>
          ${item.label}
        </a>
      `;
    })
    .join('');

  const userFooter = `
    <div class="space-y-3 border-t border-sidebar-border pt-4">
      <div data-cloud-badge>${CloudSync.renderBadgeHtml()}</div>
      <div class="flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-sidebar-foreground">${esc(isAdmin ? 'Administrador General' : DB.equipo.entrenador)}</p>
          <p class="text-xs text-sidebar-foreground/60">${isAdmin ? 'Administrador del Sistema' : 'Entrenador'}</p>
        </div>
        <button
          type="button"
          onclick="Auth.logout()"
          title="Cerrar sesión"
          class="grid size-8 place-items-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <i data-lucide="log-out" class="size-4"></i>
        </button>
      </div>
    </div>
  `;

  return `
    <div class="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside class="sticky top-0 hidden h-screen flex-col gap-8 bg-sidebar p-5 lg:flex">
        ${renderLogo({ invert: true })}
        <nav class="flex flex-1 flex-col gap-1" aria-label="Secciones">
          ${navHtml}
          ${
            isAdmin
              ? `<button
                  type="button"
                  onclick="openCloudConfigModal()"
                  class="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <i data-lucide="database" class="size-5"></i>
                  Nube y Backups (Admin)
                </button>`
              : ''
          }
        </nav>
        ${userFooter}
      </aside>

      <header class="sticky top-0 z-30 flex h-14 items-center justify-between bg-sidebar px-4 lg:hidden">
        ${renderLogo({ invert: true, className: 'text-xl' })}
        <div class="flex items-center gap-2">
          ${
            isAdmin
              ? `<button type="button" onclick="openCloudConfigModal()" class="grid size-9 place-items-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent">
                  <i data-lucide="database" class="size-4"></i>
                </button>`
              : ''
          }
          <button type="button" onclick="toggleMobileMenu()" class="grid size-9 place-items-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent">
            <i data-lucide="menu" class="size-5"></i>
          </button>
        </div>
      </header>

      ${
        State.mobileMenuOpen
          ? `<div class="fixed inset-0 z-40 bg-black/60 lg:hidden" onclick="toggleMobileMenu()">
              <div class="flex h-full w-64 flex-col gap-6 bg-sidebar p-5" onclick="event.stopPropagation()">
                ${renderLogo({ invert: true })}
                <nav class="flex flex-1 flex-col gap-1">${navHtml}</nav>
                ${userFooter}
              </div>
            </div>`
          : ''
      }

      <main class="min-w-0">${contentHtml}</main>
    </div>
  `;
}

window.toggleMobileMenu = () => {
  State.mobileMenuOpen = !State.mobileMenuOpen;
  renderApp();
};

function renderPageHeader(titulo, bajada = '', accionesHtml = '') {
  return `
    <div class="flex flex-col gap-4 border-b bg-card px-4 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-8">
      <div>
        <h1 class="font-display text-4xl font-extrabold uppercase leading-none">${esc(titulo)}</h1>
        ${bajada ? `<p class="mt-2 text-sm text-muted-foreground">${esc(bajada)}</p>` : ''}
      </div>
      ${accionesHtml ? `<div class="flex flex-wrap gap-2">${accionesHtml}</div>` : ''}
    </div>
  `;
}

/* ==========================================================================
   VISTAS DEL ENTRENADOR
   ========================================================================== */

function viewCoachDashboard() {
  const sesiones = Object.entries(DB.planes).flatMap(([atletaId, s]) =>
    s.map((x) => ({ ...x, atletaId }))
  );
  const pasadas = sesiones.filter((s) => s.fecha <= DB.hoy && s.tipo !== 'Descanso');
  const hechas = pasadas.filter((s) => s.estado === 'realizado');
  const adherencia = Math.round((hechas.length / Math.max(pasadas.length, 1)) * 100);
  const deuda = DB.pagos.filter((p) => p.estado !== 'pagado').reduce((t, p) => t + p.monto, 0);
  const vencidos = DB.pagos.filter((p) => p.estado === 'vencido');
  const proxima = DB.competencias[0];

  const feed = sesiones
    .filter((s) => s.comentario || s.resultadoReal || s.sensacion)
    .sort((a, b) => (b.fechaInforme || b.fecha || '').localeCompare(a.fechaInforme || a.fecha || ''))
    .slice(0, 8);

  const alertas = [
    ...sesiones
      .filter((s) => s.estado === 'no-realizado')
      .map((s) => ({ atletaId: s.atletaId, texto: `No realizó “${s.titulo}”`, tipo: 'entreno' })),
    ...vencidos.map((p) => ({
      atletaId: p.atletaId,
      texto: `${p.detalle} vencida · ${Helpers.pesos(p.monto)}`,
      tipo: 'pago',
    })),
  ];

  const kpis = [
    {
      label: 'Atletas activos',
      valor: String(DB.atletas.length),
      sub: `${DB.atletas.filter((a) => a.tutor).length} menores con familia vinculada`,
      icon: 'users',
    },
    {
      label: 'Cumplimiento semanal',
      valor: `${adherencia}%`,
      sub: `${hechas.length} de ${pasadas.length} sesiones realizadas`,
      icon: 'trending-up',
    },
    {
      label: 'Saldo a cobrar',
      valor: Helpers.pesos(deuda),
      sub: `${vencidos.length} pagos vencidos`,
      icon: 'wallet',
      alerta: vencidos.length > 0,
    },
    {
      label: 'Próxima competencia',
      valor: proxima ? `${Helpers.diasHasta(proxima.fecha)} días` : '—',
      sub: proxima ? proxima.nombre : 'Sin competencias',
      icon: 'calendar-days',
    },
  ];

  const session = typeof Auth.verifyCurrentSession === 'function' ? Auth.verifyCurrentSession() : Auth.getSession();
  const isAdmin = Boolean(session && session.subRole === 'admin');
  const saludoNombre = isAdmin
    ? 'Administrador'
    : `Prof. ${DB.equipo.entrenador || 'Cristian Javier Torres'}`;

  const content = `
    ${renderPageHeader(
      `Hola, ${saludoNombre}`,
      `Fecha actual: ${Helpers.fechaCorta(DB.hoy)} · Entrenador: ${DB.equipo.entrenador} (DNI ${DB.equipo.entrenadorDni || '27.884.821'})`,
      `
        <button type="button" onclick="openNominaCredencialesModal()" class="inline-flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-sm font-medium hover:bg-muted">
          <i data-lucide="key-round" class="size-4 text-primary"></i> Nómina de Atletas
        </button>
        ${
          isAdmin
            ? `<button type="button" onclick="openCloudConfigModal()" class="inline-flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-sm font-medium hover:bg-muted">
                <i data-lucide="database" class="size-4 text-primary"></i> Nube / Backup (Admin)
              </button>`
            : ''
        }
        <a href="#/entrenador/avisos" class="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-muted">
          <i data-lucide="message-square" class="size-4"></i> Enviar aviso
        </a>
        <button type="button" onclick="openImportarPlanExcelModal()" class="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-card px-3.5 py-2 text-sm font-semibold text-primary hover:bg-muted">
          <i data-lucide="file-spreadsheet" class="size-4"></i> Importar plan Excel
        </button>
        <a href="#/entrenador/atletas" class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">
          <i data-lucide="plus" class="size-4"></i> Cargar plan
        </a>
      `
    )}

    <div class="space-y-6 px-4 py-6 sm:px-8">
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        ${kpis
          .map(
            (k) => `
          <div class="rounded-xl border bg-card p-5">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-muted-foreground">${esc(k.label)}</p>
              <i data-lucide="${k.icon}" class="size-5 ${k.alerta ? 'text-destructive' : 'text-primary'}"></i>
            </div>
            <p class="mt-2 font-display text-4xl font-bold tabular-nums">${esc(k.valor)}</p>
            <p class="mt-1 truncate text-sm text-muted-foreground">${esc(k.sub)}</p>
          </div>
        `
          )
          .join('')}
      </section>

      <div class="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section class="rounded-xl border bg-card">
          <div class="flex items-center justify-between border-b px-5 py-4">
            <h2 class="text-2xl font-bold">Resultados y sensaciones recientes</h2>
            <span class="text-sm text-muted-foreground">Informes de entrenamiento de los atletas</span>
          </div>
          <ul class="divide-y">
            ${
              feed.length === 0
                ? `<li class="px-5 py-8 text-center text-sm text-muted-foreground">Todavía no hay resultados ni comentarios registrados en las sesiones.</li>`
                : feed
                    .map((s) => {
                      const a = Helpers.getAtleta(s.atletaId);
                      if (!a) return '';
                      const d = Helpers.diaSemana(s.fecha);
                      return `
                        <li>
                          <a href="#/entrenador/atletas/${a.id}" class="flex gap-4 px-5 py-4 transition-colors hover:bg-muted/50">
                            ${renderAvatar(a.nombre, a.apellido)}
                            <div class="min-w-0 flex-1">
                              <p class="text-sm">
                                <span class="font-semibold">${esc(a.nombre)} ${esc(a.apellido)}</span>
                                <span class="text-muted-foreground"> · ${esc(s.titulo)} · ${d.dia} ${d.num}</span>
                              </p>
                              ${
                                s.resultadoReal || s.distanciaRealKm || s.tiempoRealMin
                                  ? `<p class="mt-1 text-xs font-semibold text-primary">
                                      📊 ${esc(s.resultadoReal || 'Entrenamiento completado')}
                                      ${s.distanciaRealKm ? ` (${esc(s.distanciaRealKm)} km)` : ''}
                                      ${s.tiempoRealMin ? ` · ${esc(s.tiempoRealMin)} min` : ''}
                                    </p>`
                                  : ''
                              }
                              ${s.comentario ? `<p class="mt-0.5 text-sm text-muted-foreground">“${esc(s.comentario)}”</p>` : ''}
                            </div>
                            ${
                              s.sensacion
                                ? `<span class="self-center rounded-md bg-muted px-2 py-1 text-sm font-semibold tabular-nums">${s.sensacion}/5</span>`
                                : ''
                            }
                          </a>
                        </li>
                      `;
                    })
                    .join('')
            }
          </ul>
        </section>

        <div class="space-y-6">
          <section class="rounded-xl border bg-card">
            <div class="flex items-center gap-2 border-b px-5 py-4">
              <i data-lucide="alert-triangle" class="size-5 text-destructive"></i>
              <h2 class="text-2xl font-bold">Para atender</h2>
            </div>
            <ul class="divide-y">
              ${
                alertas.length === 0
                  ? `<li class="px-5 py-6 text-sm text-muted-foreground">Todo al día. No hay alertas pendientes.</li>`
                  : alertas
                      .map((al) => {
                        const a = Helpers.getAtleta(al.atletaId);
                        if (!a) return '';
                        return `
                          <li class="flex items-center gap-3 px-5 py-3 text-sm">
                            <span class="size-2 shrink-0 rounded-full ${
                              al.tipo === 'pago' ? 'bg-destructive' : 'bg-warning'
                            }"></span>
                            <span class="flex-1">
                              <span class="font-semibold">${esc(a.nombre)} ${esc(a.apellido[0])}.</span>
                              <span class="text-muted-foreground"> ${esc(al.texto)}</span>
                            </span>
                            <a href="#/entrenador/atletas/${a.id}" class="text-primary hover:underline">
                              <i data-lucide="arrow-right" class="size-4"></i>
                            </a>
                          </li>
                        `;
                      })
                      .join('')
              }
            </ul>
          </section>

          ${
            DB.avisos[0]
              ? `<section class="rounded-xl border bg-card">
                  <div class="flex items-center justify-between border-b px-5 py-4">
                    <h2 class="text-2xl font-bold">Último aviso</h2>
                    <a href="#/entrenador/avisos" class="text-sm font-medium text-primary hover:underline">Ver todos</a>
                  </div>
                  <div class="px-5 py-4">
                    <p class="text-xs font-semibold uppercase tracking-wide text-primary">${esc(DB.avisos[0].tipo)}</p>
                    <p class="mt-1 font-semibold">${esc(DB.avisos[0].titulo)}</p>
                    <p class="mt-1 text-sm text-muted-foreground">${esc(DB.avisos[0].cuerpo)}</p>
                    <p class="mt-3 text-xs text-muted-foreground">
                      Leído por ${DB.avisos[0].leidos} de ${DB.avisos[0].total}
                    </p>
                  </div>
                </section>`
              : ''
          }
        </div>
      </div>
    </div>
  `;

  return renderCoachShell('panel', content);
}

function viewCoachAtletas() {
  const categorias = ['Todas', 'Infantiles', 'U12', 'U14', 'U16', 'U18', 'U20', 'Mayores'];
  const q = State.atletasQuery.trim().toLowerCase();
  const filtrados = DB.atletas.filter((a) => {
    const matchCat = State.atletasCat === 'Todas' || a.categoria === State.atletasCat;
    const discList = Array.isArray(a.disciplinas) ? a.disciplinas : [];
    const tiposList = Array.isArray(a.tiposAtleta) ? a.tiposAtleta : [];
    const matchDisc = Helpers.atletaPracticaDisciplina(a, State.atletasDisciplina);
    const matchQuery = `${a.nombre} ${a.apellido} ${a.dni || ''} ${a.usuario || ''} ${tiposList.join(' ')} ${discList.join(' ')} ${a.pruebas || ''}`
      .toLowerCase()
      .includes(q);
    return matchCat && matchDisc && matchQuery;
  });

  const content = `
    ${renderPageHeader(
      'Atletas · Nómina Oficial',
      `${DB.atletas.length} atletas registrados en la Escuela Municipal Willilefche`,
      `
        <button type="button" onclick="openNominaCredencialesModal()" class="inline-flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-sm font-medium hover:bg-muted">
          <i data-lucide="key-round" class="size-4 text-primary"></i> Usuarios y claves
        </button>
        <button type="button" onclick="openAsignarDisciplinasLoteModal()" class="inline-flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-sm font-medium hover:bg-muted">
          <i data-lucide="medal" class="size-4 text-primary"></i> Asignar disciplinas
        </button>
        <button type="button" onclick="openImportarPlanExcelModal()" class="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-card px-3.5 py-2 text-sm font-semibold text-primary hover:bg-muted">
          <i data-lucide="file-spreadsheet" class="size-4"></i> Importar plan Excel
        </button>
        <button type="button" onclick="openNuevoAtletaModal()" class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">
          <i data-lucide="user-plus" class="size-4"></i> Nuevo atleta
        </button>
      `
    )}
    <div class="space-y-4 px-4 py-6 sm:px-8">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="relative sm:w-72">
            <i data-lucide="search" class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"></i>
            <input
              type="text"
              value="${esc(State.atletasQuery)}"
              oninput="State.atletasQuery = this.value; renderApp(true)"
              id="search-atletas-input"
              placeholder="Buscar por nombre, apellido, DNI o disciplina"
              class="h-10 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div class="flex items-center gap-2">
            <label for="filter-disciplina-select" class="text-xs font-semibold text-muted-foreground whitespace-nowrap">Disciplina:</label>
            <select
              id="filter-disciplina-select"
              onchange="State.atletasDisciplina = this.value; renderApp()"
              class="h-10 rounded-lg border bg-card px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="Todas" ${State.atletasDisciplina === 'Todas' ? 'selected' : ''}>Todas las disciplinas</option>
              ${renderSelectDisciplinasOptions(State.atletasDisciplina)}
            </select>
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5">
          ${categorias
            .map(
              (c) => `
            <button
              type="button"
              onclick="State.atletasCat = '${c}'; renderApp()"
              class="rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                State.atletasCat === c ? 'border-ink bg-ink text-ink-foreground' : 'bg-card hover:bg-muted'
              }"
            >
              ${c}
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      ${
        filtrados.length === 0
          ? `<div class="flex flex-col items-center rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              <i data-lucide="users" class="size-8"></i>
              <p class="mt-2">No hay atletas que coincidan con la búsqueda o disciplina seleccionada.</p>
            </div>`
          : `<ul class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              ${filtrados
                .map((a) => {
                  const deuda = Helpers.deudaDe(a.id);
                  const vencido = Helpers.tieneVencidos(a.id);
                  return `
                  <li>
                    <a href="#/entrenador/atletas/${a.id}" class="block rounded-xl border bg-card p-5 transition-colors hover:border-primary">
                      <div class="flex items-center gap-3">
                        ${renderAvatar(a.nombre, a.apellido, 'size-12 text-lg')}
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-1.5">
                            ${a.nroNomina ? `<span class="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold text-muted-foreground">#${a.nroNomina}</span>` : ''}
                            <p class="truncate text-lg font-semibold">${esc(a.apellido)}, ${esc(a.nombre)}</p>
                          </div>
                          <p class="text-sm text-muted-foreground">
                            ${esc(a.categoria)} · ${Helpers.edad(a.fechaNacimiento)} años · DNI ${esc(a.dni || '—')}
                          </p>
                        </div>
                        ${
                          a.tutor
                            ? `<span class="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">Menor</span>`
                            : ''
                        }
                      </div>
                      <div class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
                        <span class="text-muted-foreground">Nac.: <strong>${Helpers.fechaCorta(a.fechaNacimiento)}</strong></span>
                        <span class="font-mono text-primary font-semibold">@${esc(a.usuario)}</span>
                      </div>
                      <div class="mt-2.5 flex flex-wrap gap-1">
                        ${renderResumenDisciplinasBadges(a, true)}
                      </div>
                      <div class="mt-3 flex items-center justify-between gap-2 text-sm">
                        <span class="truncate text-xs text-muted-foreground">${esc(a.objetivos[0]?.texto || 'Ficha activa · Escuela Willilefche')}</span>
                        ${
                          deuda > 0
                            ? `<span class="shrink-0 font-medium tabular-nums ${
                                vencido ? 'text-destructive' : 'text-warning-text'
                              }">Debe ${Helpers.pesos(deuda)}</span>`
                            : `<span class="shrink-0 font-medium text-success">Al día</span>`
                        }
                      </div>
                    </a>
                  </li>`;
                })
                .join('')}
            </ul>`
      }
    </div>
  `;

  return renderCoachShell('atletas', content);
}

function viewCoachAtletaFicha(atletaId) {
  const atleta = Helpers.getAtleta(atletaId);
  if (!atleta) {
    return renderCoachShell(
      'atletas',
      `<div class="p-8"><p class="text-muted-foreground">Atleta no encontrado.</p><a href="#/entrenador/atletas" class="text-primary underline">Volver a Atletas</a></div>`
    );
  }

  const tabs = [
    { id: 'plan', label: 'Plan' },
    { id: 'ficha', label: 'Ficha y Claves' },
    { id: 'resultados', label: 'Resultados' },
    { id: 'pagos', label: 'Pagos' },
    { id: 'mensajes', label: 'Mensaje' },
  ];

  let tabContent = '';

  if (State.fichaTab === 'plan') {
    const todasSesiones = Helpers.getPlan(atleta.id);
    const sesiones = filtrarSesionesPorPeriodo(todasSesiones, State.planFiltro);
    const total = sesiones.reduce((t, s) => t + (s.distanciaKm || 0), 0);
    const hecho = sesiones.filter((s) => s.estado === 'realizado').reduce((t, s) => t + (s.distanciaKm || 0), 0);
    const filtrosPlan = [
      { id: 'todas', label: 'Todas' },
      { id: 'semana', label: 'Semana' },
      { id: 'mes', label: 'Mes' },
      { id: 'dia', label: 'Hoy (Día)' },
    ];

    tabContent = `
      <div class="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <section>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-2xl font-bold">Planificación de entrenamientos</h2>
              <p class="text-sm text-muted-foreground">${hecho.toFixed(1).replace(/\.0$/, '')} de ${total.toFixed(1).replace(/\.0$/, '')} km realizados (${sesiones.length} sesiones visibles)</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" onclick="openImportarPlanExcelModal('${atleta.id}')" class="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-card px-3.5 py-2 text-sm font-semibold text-primary hover:bg-muted">
                <i data-lucide="file-spreadsheet" class="size-4"></i> Importar desde Excel
              </button>
              <button type="button" onclick="openDuplicarPlanModal('${atleta.id}')" class="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3.5 py-2 text-sm font-semibold hover:bg-muted">
                <i data-lucide="copy" class="size-4"></i> Duplicar semana / Copiar plan
              </button>
              <button type="button" onclick="openSessionModal('${atleta.id}')" class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">
                <i data-lucide="plus" class="size-4"></i> Agregar entrenamiento
              </button>
            </div>
          </div>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div class="flex gap-1 rounded-lg bg-muted p-1">
              ${filtrosPlan
                .map(
                  (f) => `
                <button
                  type="button"
                  onclick="State.planFiltro = '${f.id}'; renderApp()"
                  class="rounded-md px-3 py-1 text-xs font-semibold ${
                    State.planFiltro === f.id ? 'bg-card shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }"
                >
                  ${f.label}
                </button>
              `
                )
                .join('')}
            </div>
            <span class="text-xs text-muted-foreground">Podés asignar sesiones individuales, por categoría o a todo el grupo</span>
          </div>
          ${
            sesiones.length === 0
              ? `<div class="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                  Todavía no hay entrenamientos cargados para este período.
                </div>`
              : `<div class="space-y-3">
                  ${sesiones
                    .map((s) =>
                      renderSessionCard(
                        s,
                        `<div class="mt-2 flex gap-2 -ml-2">
                          <button type="button" onclick="openSessionModal('${atleta.id}', '${s.id}')" class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold hover:bg-muted">
                            <i data-lucide="pencil" class="size-3.5"></i> Modificar
                          </button>
                          <button type="button" onclick="deleteSession('${atleta.id}', '${s.id}')" class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10">
                            Eliminar
                          </button>
                        </div>`
                      )
                    )
                    .join('')}
                </div>`
          }
        </section>
        <aside class="space-y-4">
          <div class="rounded-xl border bg-card p-5">
            <h3 class="text-xl font-bold">Evolución</h3>
            <div class="mt-3">${renderPaceChart(atleta.evolucion)}</div>
          </div>
          ${renderObjetivosCard(atleta, true)}
        </aside>
      </div>
    `;
  } else if (State.fichaTab === 'ficha') {
    const niveles = ['Inicial', 'Intermedio', 'Avanzado', 'Competitivo'];
    tabContent = `
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="space-y-6">
          <section class="rounded-xl border bg-card p-5">
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold">Datos personales</h2>
              <button type="button" onclick="deleteAtleta('${atleta.id}')" class="text-xs font-semibold text-destructive hover:underline">
                Dar de baja atleta
              </button>
            </div>
            <form onsubmit="saveDatosPersonalesAtleta(event, '${atleta.id}')" class="mt-4 space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-medium text-muted-foreground">Nombre</label>
                  <input id="dp-nombre" required value="${esc(atleta.nombre)}" class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-sm" />
                </div>
                <div>
                  <label class="text-xs font-medium text-muted-foreground">Apellido</label>
                  <input id="dp-apellido" required value="${esc(atleta.apellido)}" class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-sm" />
                </div>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="text-xs font-medium text-muted-foreground">DNI</label>
                  <input id="dp-dni" required value="${esc(atleta.dni || '')}" class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-sm font-mono" />
                </div>
                <div>
                  <label class="text-xs font-medium text-muted-foreground">Fecha de nacimiento</label>
                  <input id="dp-fnac" type="date" required value="${esc(atleta.fechaNacimiento)}" onchange="document.getElementById('dp-cat').value = Helpers.calcularCategoria(this.value)" class="mt-1 h-9 w-full rounded-lg border bg-card px-2 text-sm" />
                </div>
                <div>
                  <label class="text-xs font-medium text-muted-foreground">Categoría (${Helpers.edad(atleta.fechaNacimiento)} años)</label>
                  <select id="dp-cat" class="mt-1 h-9 w-full rounded-lg border bg-card px-2 text-sm">
                    ${['Infantiles', 'U12', 'U14', 'U16', 'U18', 'U20', 'Mayores', 'Master A', 'Master B']
                      .map((c) => `<option value="${c}" ${atleta.categoria === c ? 'selected' : ''}>${c}</option>`)
                      .join('')}
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-medium text-muted-foreground">Teléfono</label>
                  <input id="dp-tel" value="${esc(atleta.telefono || '')}" placeholder="+54 2920 ..." class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-sm" />
                </div>
                <div>
                  <label class="text-xs font-medium text-muted-foreground">Correo electrónico</label>
                  <input id="dp-email" value="${esc(atleta.email || '')}" placeholder="correo@ejemplo.com" class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-sm" />
                </div>
              </div>
              <div>
                <label class="text-xs font-medium text-muted-foreground">Contacto de emergencia / Familia</label>
                <input id="dp-emerg" value="${esc(atleta.contactoEmergencia || '')}" class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-sm" />
              </div>
              <div class="rounded-lg border bg-muted/40 p-3">
                <label class="flex items-start gap-2.5 text-xs font-medium cursor-pointer">
                  <input id="dp-excluir-ranking" type="checkbox" ${atleta.excluirRanking ? 'checked' : ''} class="mt-0.5 size-4 rounded border" />
                  <span>
                    <strong>Privacidad en Ranking Público:</strong> Excluir a este atleta del ranking público si la familia no autoriza su publicación.
                  </span>
                </label>
              </div>
              <button type="submit" class="inline-flex h-9 items-center justify-center rounded-lg bg-secondary px-4 text-xs font-semibold text-secondary-foreground hover:opacity-90">
                Guardar datos personales y privacidad
              </button>
            </form>
          </section>

          <section class="rounded-xl border border-primary/30 bg-card p-5">
            <h2 class="flex items-center gap-2 text-2xl font-bold">
              <i data-lucide="key-round" class="size-5 text-primary"></i> Credenciales de acceso
            </h2>
            <p class="mt-1 text-xs text-muted-foreground">
              Usuario y contraseña con los que ${esc(atleta.nombre)} (y su familia, si es menor) ingresan a la plataforma.
            </p>
            <form onsubmit="saveCredencialesAtleta(event, '${atleta.id}')" class="mt-4 space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-semibold">Usuario del atleta</label>
                  <input id="cred-user" required value="${esc(atleta.usuario)}" class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-sm font-mono" />
                </div>
                <div>
                  <label class="text-xs font-semibold">Acceso Seguro Firebase</label>
                  <div class="mt-1 flex h-9 items-center rounded-lg border bg-muted/40 px-3 text-xs font-medium text-muted-foreground">
                    <span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold"><i data-lucide="shield-check" class="size-4"></i> Protegido en la nube (Inicial: DNI)</span>
                  </div>
                </div>
              </div>
              ${
                atleta.tutor
                  ? `<div class="grid grid-cols-2 gap-3 border-t pt-3">
                      <div>
                        <label class="text-xs font-semibold">Usuario familiar (${esc(atleta.tutor.nombre)})</label>
                        <input id="cred-tuser" required value="${esc(atleta.tutor.usuario)}" class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-sm font-mono" />
                      </div>
                      <div>
                        <label class="text-xs font-semibold">Acceso Familiar Firebase</label>
                        <div class="mt-1 flex h-9 items-center rounded-lg border bg-muted/40 px-3 text-xs font-medium text-muted-foreground">
                          <span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold"><i data-lucide="shield-check" class="size-4"></i> Protegido en la nube</span>
                        </div>
                      </div>
                    </div>`
                  : ''
              }
              <button type="submit" class="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-95">
                Guardar credenciales
              </button>
            </form>
          </section>
        </div>

        <section class="rounded-xl border bg-card p-5 h-fit space-y-5">
          <div>
            <h2 class="text-2xl font-bold">Tipo de atleta, disciplinas y pruebas</h2>
            <p class="text-xs text-muted-foreground">
              Seleccioná en escalera: primero el <strong>Tipo de atleta (Corredor, Pista o Campo)</strong>, luego la <strong>disciplina</strong> dentro de ese bloque y finalmente las <strong>pruebas específicas</strong> que practica.
            </p>
          </div>
          <form onsubmit="saveInfoDeportivaAtleta(event, '${atleta.id}')" class="space-y-4">
            <div id="escalera-container-ficha-${atleta.id}">
              ${renderEscaleraDisciplinasAtleta(`ficha-${atleta.id}`, atleta, true)}
            </div>

            <div class="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <div>
                <label class="text-xs font-medium text-muted-foreground">Nivel deportivo</label>
                <select id="id-nivel" class="mt-1 h-9 w-full rounded-lg border bg-card px-2 text-sm">
                  ${niveles.map((n) => `<option value="${n}" ${(atleta.nivel || 'Inicial') === n ? 'selected' : ''}>${n}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-xs font-medium text-muted-foreground">Pruebas específicas que practica (se completan al elegir arriba o escribí otra)</label>
                <input id="id-pruebas" value="${esc(atleta.pruebas || '')}" placeholder="Seleccioná las pruebas en la escalera de arriba o agregá otra acá…" class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-sm font-medium" />
              </div>
            </div>
            <div>
              <label class="text-xs font-medium text-muted-foreground">Antecedentes deportivos</label>
              <input id="id-antecedentes" value="${esc(atleta.antecedentes || '')}" placeholder="Ej.: Iniciación en Escuela Municipal, Juegos Rionegrinos…" class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-sm" />
            </div>
            <div>
              <label class="text-xs font-medium text-muted-foreground">Salud, apto físico y lesiones</label>
              <input id="id-salud" value="${esc(atleta.salud || '')}" placeholder="Ej.: Apto médico vigente. Sin lesiones." class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-sm" />
            </div>
            <div>
              <label class="text-xs font-medium text-muted-foreground">Observaciones libres del entrenador</label>
              <textarea id="id-observaciones" rows="4" placeholder="Anotaciones técnicas, evolución, conducta, disponibilidad horaria o comentarios adicionales del entrenador…" class="mt-1 w-full rounded-lg border bg-card p-3 text-sm">${esc(atleta.observacionesEntrenador || '')}</textarea>
            </div>
            <button type="submit" class="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-95">
              Guardar información deportiva y observaciones
            </button>
          </form>

          <div class="border-t pt-4">
            <p class="text-sm font-semibold">Campos adicionales personalizados</p>
            ${
              (atleta.extra || []).length === 0
                ? `<p class="mt-1 text-xs text-muted-foreground">Sin campos adicionales cargados.</p>`
                : `<dl class="mt-2 divide-y">
                    ${(atleta.extra || [])
                      .map(
                        (x, idx) => `
                      <div class="flex items-center justify-between py-2 text-sm">
                        <div>
                          <span class="text-muted-foreground">${esc(x.etiqueta)}:</span>
                          <span class="ml-1 font-medium">${esc(x.valor)}</span>
                        </div>
                        <button type="button" onclick="deleteExtraField('${atleta.id}', ${idx})" class="text-xs text-muted-foreground hover:text-destructive" title="Eliminar campo">✕</button>
                      </div>
                    `
                      )
                      .join('')}
                  </dl>`
            }
            <form onsubmit="addExtraField(event, '${atleta.id}')" class="mt-3 rounded-lg bg-muted/60 p-3">
              <p class="mb-2 text-xs font-semibold">Agregar dato extra (ej.: Talle de remera, Obra social, Calzado)</p>
              <div class="grid gap-2 sm:grid-cols-[9rem_1fr_auto]">
                <input id="extra-et" placeholder="Ej.: Talle" required class="h-9 rounded-lg border bg-card px-3 text-sm" />
                <input id="extra-val" placeholder="Ej.: M" required class="h-9 rounded-lg border bg-card px-3 text-sm" />
                <button type="submit" class="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-secondary px-3 text-sm font-semibold text-secondary-foreground hover:opacity-90">
                  <i data-lucide="plus" class="size-4"></i> Agregar
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    `;
  } else if (State.fichaTab === 'resultados') {
    const proximas = DB.competencias.filter(
      (c) => c.inscriptos.includes(atleta.id) || c.sugeridos.includes(atleta.id)
    );
    tabContent = `
      <div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div class="space-y-6">
          <section>
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold">Marcas personales</h2>
              <button type="button" onclick="openNuevoResultadoModal('${atleta.id}')" class="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                <i data-lucide="plus" class="size-3.5"></i> Cargar resultado / marca
              </button>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              ${(atleta.marcas || [])
                .map(
                  (m) => `
                <div class="rounded-xl border bg-card p-4">
                  <p class="text-sm font-semibold text-primary">${esc(m.distancia)}</p>
                  <p class="font-display text-3xl font-bold tabular-nums">${esc(m.tiempo)}</p>
                  <p class="mt-1 truncate text-xs text-muted-foreground" title="${esc(m.competencia)}">${esc(m.competencia)}</p>
                </div>
              `
                )
                .join('')}
            </div>
          </section>
          <section class="rounded-xl border bg-card">
            <h2 class="border-b px-5 py-4 text-2xl font-bold">Historial de competencias</h2>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="text-left text-muted-foreground">
                  <tr>
                    <th class="px-5 py-2 font-medium">Competencia</th>
                    <th class="px-3 py-2 font-medium">Distancia</th>
                    <th class="px-3 py-2 font-medium">Tiempo</th>
                    <th class="px-3 py-2 font-medium">General</th>
                    <th class="px-5 py-2 font-medium">Categoría</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  ${(atleta.resultados || [])
                    .map(
                      (r) => `
                    <tr>
                      <td class="px-5 py-3">
                        <p class="font-medium">${esc(r.competencia)}</p>
                        <p class="text-xs text-muted-foreground">${Helpers.fechaCorta(r.fecha)}</p>
                      </td>
                      <td class="px-3 py-3">${esc(r.distancia)}</td>
                      <td class="px-3 py-3 font-semibold tabular-nums">${esc(r.tiempo)}</td>
                      <td class="px-3 py-3 tabular-nums">${r.posGeneral}°</td>
                      <td class="px-5 py-3 tabular-nums">
                        <span class="inline-flex items-center gap-1">
                          ${r.posCategoria <= 3 ? `<i data-lucide="medal" class="size-4 text-primary"></i>` : ''}
                          ${r.posCategoria}°
                        </span>
                      </td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <section class="rounded-xl border bg-card p-5 h-fit">
          <h2 class="text-2xl font-bold">Próximas</h2>
          ${
            proximas.length === 0
              ? `<p class="mt-2 text-sm text-muted-foreground">Sin competencias programadas.</p>`
              : `<ul class="mt-3 space-y-3">
                  ${proximas
                    .map(
                      (c) => `
                    <li class="rounded-lg border p-3">
                      <p class="font-semibold">${esc(c.nombre)}</p>
                      <p class="text-xs text-muted-foreground">${Helpers.fechaCorta(c.fecha)} · ${esc(c.lugar)}</p>
                      ${
                        c.inscriptos.includes(atleta.id)
                          ? `<span class="mt-2 inline-block rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Inscripto</span>`
                          : `<span class="mt-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"><i data-lucide="sparkles" class="size-3"></i> Sugerida por el entrenador</span>`
                      }
                    </li>
                  `
                    )
                    .join('')}
                </ul>`
          }
        </section>
      </div>
    `;
  } else if (State.fichaTab === 'pagos') {
    const lista = Helpers.getPagos(atleta.id);
    const deuda = lista.filter((p) => p.estado !== 'pagado').reduce((t, p) => t + p.monto, 0);
    tabContent = `
      <section class="rounded-xl border bg-card">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 class="text-2xl font-bold">Cuotas y pagos de ${esc(atleta.nombre)}</h2>
            <p class="text-sm text-muted-foreground">
              Saldo pendiente:
              <span class="${deuda > 0 ? 'font-semibold text-destructive' : 'font-semibold text-success'}">
                ${deuda > 0 ? Helpers.pesos(deuda) : 'al día'}
              </span>
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick="openConceptosCobroModal()" class="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">
              <i data-lucide="settings-2" class="size-3.5"></i> Valores y conceptos
            </button>
            <button type="button" onclick="openNuevoCobroModal('${atleta.id}')" class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95">
              <i data-lucide="plus" class="size-3.5"></i> Cargar cobro
            </button>
          </div>
        </div>
        ${
          lista.length === 0
            ? `<div class="p-8 text-center text-sm text-muted-foreground">
                No hay cobros cargados para ${esc(atleta.nombre)}.
              </div>`
            : `<ul class="divide-y">
                ${lista
                  .map(
                    (p) => `
                  <li class="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div class="min-w-0 flex-1">
                      <p class="font-medium">${esc(p.detalle)}</p>
                      <p class="text-xs text-muted-foreground">
                        <span class="font-semibold text-foreground">${esc(p.concepto)}</span> · ${
                      p.estado === 'pagado' && p.fechaPago
                        ? `pagado el ${Helpers.fechaCorta(p.fechaPago)}`
                        : p.estado === 'informado'
                        ? `<span class="font-semibold text-blue-600 dark:text-blue-400">informado el ${Helpers.fechaCorta(p.fechaPago || p.informadoEn)} (en revisión)</span>`
                        : `vence ${Helpers.fechaCorta(p.vencimiento)}`
                    }
                    ${
                      p.estado === 'rechazado' && p.motivoRechazo
                        ? `<span class="block mt-1 text-xs font-medium text-destructive">⚠️ Rechazado: ${esc(p.motivoRechazo)}</span>`
                        : ''
                    }
                        ${
                          p.estado === 'pagado' && p.medioPago
                            ? ` · <span class="font-semibold text-foreground">${p.medioPago === 'efectivo' ? '💵 Efectivo' : '💸 Transferencia'}</span>`
                            : ''
                        }
                        ${p.notaPago ? ` · <em>“${esc(p.notaPago)}”</em>` : ''}
                      </p>
                    </div>
                    <span class="font-semibold tabular-nums">${Helpers.pesos(p.monto)}</span>
                    ${renderEstadoPagoBadge(p.estado, p.motivoRechazo)}
                    <div class="inline-flex flex-wrap items-center gap-1.5">
                      ${
                        p.comprobanteDataUrl
                          ? `<button type="button" onclick="verComprobanteModal('${p.id}')" class="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20">
                              📎 Ver comprobante
                            </button>`
                          : ''
                      }
                      ${
                        p.estado === 'informado'
                          ? `<button type="button" onclick="confirmarPagoCoach('${p.id}')" class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700" title="Confirmar ingreso del dinero">
                              ✓ Confirmar
                            </button>
                            <button type="button" onclick="openRechazarPagoModal('${p.id}')" class="inline-flex items-center gap-1 rounded-lg border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20" title="Rechazar comprobante">
                              ✕ Rechazar
                            </button>`
                          : p.estado !== 'pagado'
                          ? `<button type="button" onclick="openRegistrarPagoModal('${p.id}')" class="rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                              Registrar pago
                            </button>`
                          : `<button type="button" onclick="openRegistrarPagoModal('${p.id}')" class="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" title="Cambiar medio de pago o adjuntar comprobante">
                              ${p.comprobanteDataUrl || p.medioPago ? 'Medio/Comprobante' : '+ Comprobante'}
                            </button>`
                      }
                      <button type="button" onclick="openNuevoCobroModal('${atleta.id}', '${p.id}')" class="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar valor o concepto">
                        Editar
                      </button>
                      <button type="button" onclick="deletePago('${p.id}')" class="rounded px-1.5 py-1 text-xs text-muted-foreground hover:text-destructive" title="Eliminar cobro">
                        ✕
                      </button>
                    </div>
                  </li>
                `
                  )
                  .join('')}
              </ul>`
        }
      </section>
    `;
  } else if (State.fichaTab === 'mensajes') {
    const msgsIndiv = DB.avisos.filter(
      (av) =>
        av.tipo === 'Individual' &&
        (av.atletaId === atleta.id || av.destinatarios === Helpers.nombreCompleto(atleta))
    );
    tabContent = `
      <div class="grid gap-6 lg:grid-cols-[26rem_1fr]">
        <section class="rounded-xl border bg-card p-5 h-fit">
          <h2 class="text-2xl font-bold">Nuevo mensaje directo</h2>
          <p class="text-sm text-muted-foreground">
            Solo lo verá ${esc(atleta.nombre)}${atleta.tutor ? ` y su familia (${esc(atleta.tutor.nombre)})` : ''}. El atleta podrá responderte desde su portal.
          </p>
          <form onsubmit="enviarMensajeIndividual(event, '${atleta.id}')" class="mt-4 space-y-3">
            <input
              id="msg-individual-title"
              placeholder="Asunto (opcional, ej.: Plan de esta semana)"
              class="h-10 w-full rounded-lg border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <textarea
              id="msg-individual-text"
              rows="4"
              required
              placeholder="Hola ${esc(atleta.nombre)}, …"
              class="w-full rounded-lg border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            ></textarea>
            <button type="submit" class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">
              <i data-lucide="send" class="size-4"></i> Enviar mensaje
            </button>
          </form>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-bold">Conversación con ${esc(atleta.nombre)}</h2>
          ${
            msgsIndiv.length === 0
              ? `<div class="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
                  Todavía no hay mensajes directos con ${esc(atleta.nombre)}.
                </div>`
              : msgsIndiv.map((m) => renderMessageThreadCard(m, atleta.id, 'entrenador', false)).join('')
          }
        </section>
      </div>
    `;
  }

  const content = `
    <div>
      <div class="border-b bg-card px-4 pb-0 pt-5 sm:px-8">
        <a href="#/entrenador/atletas" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <i data-lucide="arrow-left" class="size-4"></i> Atletas
        </a>
        <div class="mt-4 flex flex-col gap-4 pb-5 sm:flex-row sm:items-center">
          ${renderAvatar(atleta.nombre, atleta.apellido, 'size-16 text-2xl')}
          <div class="flex-1">
            <h1 class="font-display text-4xl font-extrabold uppercase leading-none">${esc(Helpers.nombreCompleto(atleta))}</h1>
            <p class="mt-1 text-sm text-muted-foreground">
              ${esc(atleta.categoria)} · ${Helpers.edad(atleta.fechaNacimiento)} años · ${esc(atleta.nivel)} · en el equipo desde ${Helpers.fechaCorta(atleta.ingreso)}
            </p>
            <div id="ficha-header-disciplinas-badges" class="mt-2 flex flex-wrap items-center gap-1.5">
              ${renderResumenDisciplinasBadges(atleta, false)}
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${
              atleta.tutor
                ? `<div class="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
                    <i data-lucide="shield-check" class="size-4"></i>
                    Familia vinculada: ${esc(atleta.tutor.nombre)} (${esc(atleta.tutor.vinculo)})
                  </div>`
                : ''
            }
            <a href="#/atleta/${atleta.id}" class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-muted">
              Vista previa del portal →
            </a>
          </div>
        </div>

        <div class="flex gap-1 overflow-x-auto">
          ${tabs
            .map(
              (t) => `
            <button
              type="button"
              onclick="State.fichaTab = '${t.id}'; renderApp()"
              class="border-b-2 px-4 py-3 text-base font-medium transition-colors ${
                State.fichaTab === t.id
                  ? 'border-primary text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }"
            >
              ${t.label}
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="px-4 py-6 sm:px-8">${tabContent}</div>
    </div>
  `;

  return renderCoachShell('atletas', content);
}

window.saveDatosPersonalesAtleta = (e, atletaId) => {
  e.preventDefault();
  const a = Helpers.getAtleta(atletaId);
  if (!a) return;
  a.nombre = document.getElementById('dp-nombre').value.trim();
  a.apellido = document.getElementById('dp-apellido').value.trim();
  a.dni = document.getElementById('dp-dni').value.trim();
  a.fechaNacimiento = document.getElementById('dp-fnac').value;
  a.categoria = document.getElementById('dp-cat').value;
  a.telefono = document.getElementById('dp-tel').value.trim();
  a.email = document.getElementById('dp-email').value.trim();
  a.contactoEmergencia = document.getElementById('dp-emerg').value.trim();
  const exclEl = document.getElementById('dp-excluir-ranking');
  if (exclEl) {
    const prevExcl = Boolean(a.excluirRanking);
    a.excluirRanking = Boolean(exclEl.checked);
    if (a.excluirRanking) {
      // Si se marca "excluir del ranking", se borran sus documentos de ranking_publico
      window.DB.ranking_publico = (window.DB.ranking_publico || []).filter(
        (r) => (r.atletaId || r.id) !== a.id
      );
      if (window.CloudSync && typeof window.CloudSync.borrarRankingPublicoDeAtleta === 'function') {
        window.CloudSync.borrarRankingPublicoDeAtleta(a.id);
      }
    } else if (prevExcl && !a.excluirRanking) {
      // Si se desmarca la exclusión, republicar sus marcas en ranking_publico
      (a.marcas || []).forEach((m) => {
        const item = {
          prueba: m.distancia,
          distancia: m.distancia,
          atletaId: a.id,
          nombre: `${a.nombre} ${a.apellido ? a.apellido[0] + '.' : ''}`,
          categoria: a.categoria || '',
          edad: Helpers.edad(a.fechaNacimiento),
          genero: a.genero || '',
          tiempo: m.tiempo,
          fecha: m.fecha || '',
          competencia: m.competencia || '',
        };
        window.DB.ranking_publico = window.DB.ranking_publico || [];
        window.DB.ranking_publico.push(item);
        if (window.CloudSync && typeof window.CloudSync.guardarRankingPublicoItem === 'function') {
          window.CloudSync.guardarRankingPublicoItem(item);
        }
      });
    }
  }
  saveDB();
  showToast(`Datos personales de ${a.nombre} actualizados`);
  renderApp();
};

/* ==========================================================================
   SISTEMA EN ESCALERA DE TIPO DE ATLETA · DISCIPLINAS · PRUEBAS
   Paso 1: Corredor | Pista | Campo
   Paso 2: Calle / Trail | Velocidad / Medio Fondo / Fondo / Obstáculos | Lanzamientos / Saltos
   Paso 3: Pruebas específicas de cada disciplina seleccionada
   ========================================================================== */

window._escaleraState = {};

function deriveEscaleraStateFromAtleta(atleta) {
  const bloques = window.DISCIPLINAS_POR_BLOQUE || [];
  const tipos = [];
  const subdisciplinas = [];
  const pruebas = [];
  const extras = [];

  const addUnique = (arr, val) => {
    if (val && !arr.some((x) => x.toLowerCase() === String(val).toLowerCase())) {
      arr.push(val);
    }
  };

  const rawTipos = Array.isArray(atleta?.tiposAtleta) ? atleta.tiposAtleta : [];
  const rawDiscs = Array.isArray(atleta?.disciplinas) ? atleta.disciplinas : [];
  const rawPruebas = String(atleta?.pruebas || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  // 1. Reconocer tipos de atleta explícitos
  rawTipos.forEach((t) => {
    const tl = String(t).trim().toLowerCase();
    const bMatch = bloques.find(
      (b) =>
        b.id.toLowerCase() === tl ||
        (b.tipoAtleta && b.tipoAtleta.toLowerCase() === tl) ||
        (b.id === 'running' && (tl === 'corredor' || tl === 'running'))
    );
    if (bMatch) addUnique(tipos, bMatch.id);
  });

  // 2. Reconocer disciplinas y mapearlas a su bloque y subdisciplina en escalera
  rawDiscs.forEach((d) => {
    const dl = String(d).trim().toLowerCase();
    let matched = false;

    for (const b of bloques) {
      if (
        b.id.toLowerCase() === dl ||
        (b.tipoAtleta && b.tipoAtleta.toLowerCase() === dl) ||
        (b.id === 'running' && (dl === 'corredor' || dl === 'running'))
      ) {
        addUnique(tipos, b.id);
        if (dl === 'running') {
          addUnique(subdisciplinas, 'Calle');
        }
        matched = true;
      }

      for (const sub of b.subdisciplinas || []) {
        const aliasesLow = (sub.aliases || [sub.nombre]).map((x) => x.toLowerCase());
        const pruebasSubLow = (sub.pruebas || []).map((x) => x.toLowerCase());
        if (sub.nombre.toLowerCase() === dl || sub.id.toLowerCase() === dl || aliasesLow.includes(dl)) {
          addUnique(tipos, b.id);
          addUnique(subdisciplinas, sub.nombre);
          // Si antes estaba guardada una prueba de campo como disciplina (ej: "Lanzamiento de Jabalina")
          const exactPrueba = (sub.pruebas || []).find((p) => p.toLowerCase() === dl);
          if (exactPrueba) {
            addUnique(pruebas, exactPrueba);
          }
          matched = true;
        } else if (pruebasSubLow.includes(dl)) {
          addUnique(tipos, b.id);
          addUnique(subdisciplinas, sub.nombre);
          const exactPrueba = (sub.pruebas || []).find((p) => p.toLowerCase() === dl);
          if (exactPrueba) addUnique(pruebas, exactPrueba);
          matched = true;
        }
      }
    }

    if (!matched && d) {
      addUnique(extras, d);
    }
  });

  // 3. Reconocer pruebas específicas guardadas en atleta.pruebas
  rawPruebas.forEach((p) => {
    const pl = p.toLowerCase();
    addUnique(pruebas, p);
    for (const b of bloques) {
      for (const sub of b.subdisciplinas || []) {
        if ((sub.pruebas || []).some((sp) => sp.toLowerCase() === pl)) {
          addUnique(tipos, b.id);
          addUnique(subdisciplinas, sub.nombre);
        }
      }
    }
  });

  return {
    atletaId: atleta?.id || null,
    tipos,
    subdisciplinas,
    pruebas,
    extras,
  };
}

function getEscaleraState(scope, atleta = null, forceReset = false) {
  if (forceReset || !window._escaleraState[scope]) {
    window._escaleraState[scope] = deriveEscaleraStateFromAtleta(atleta);
  }
  return window._escaleraState[scope];
}

function buildAtletaFieldsFromEscaleraState(st) {
  const bloques = window.DISCIPLINAS_POR_BLOQUE || [];
  const tiposAtleta = [];
  const disciplinas = [];

  for (const b of bloques) {
    if (st.tipos.includes(b.id)) {
      tiposAtleta.push(b.tipoAtleta || b.titulo);
      const subsDelBloque = (b.subdisciplinas || []).filter((sub) =>
        st.subdisciplinas.some((s) => s.toLowerCase() === sub.nombre.toLowerCase())
      );
      if (subsDelBloque.length > 0) {
        subsDelBloque.forEach((sub) => {
          if (!disciplinas.includes(sub.nombre)) disciplinas.push(sub.nombre);
        });
      } else {
        // Si marcó el Tipo de atleta (ej. Corredor, Pista o Campo) y aún no eligió subdisciplina, guardamos el tipo como disciplina
        const labelTipo = b.tipoAtleta || b.id;
        if (!disciplinas.includes(labelTipo)) disciplinas.push(labelTipo);
      }
    }
  }

  (st.extras || []).forEach((ex) => {
    if (!disciplinas.includes(ex)) disciplinas.push(ex);
  });

  return {
    tiposAtleta,
    disciplinas,
    pruebas: (st.pruebas || []).join(', '),
  };
}

function renderResumenDisciplinasBadges(atleta, compact = false) {
  const st = deriveEscaleraStateFromAtleta(atleta);
  const bloques = window.DISCIPLINAS_POR_BLOQUE || [];

  if (st.tipos.length === 0 && st.extras.length === 0) {
    if (compact) {
      return `<span class="text-[11px] italic text-muted-foreground">Sin disciplina asignada (click para definir en ficha)</span>`;
    }
    return `<button type="button" onclick="State.fichaTab = 'ficha'; renderApp()" class="inline-flex items-center gap-1 rounded-md border border-dashed px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary">+ Definir tipo de atleta y disciplinas</button>`;
  }

  const badgesHtml = [];

  for (const b of bloques) {
    if (!st.tipos.includes(b.id)) continue;
    const subsActivas = (b.subdisciplinas || [])
      .filter((sub) => st.subdisciplinas.some((s) => s.toLowerCase() === sub.nombre.toLowerCase()))
      .map((sub) => sub.nombre);

    const textoEscalera =
      subsActivas.length > 0
        ? `${b.emoji || '🏃'} ${b.tipoAtleta}: ${subsActivas.join(' · ')}`
        : `${b.emoji || '🏃'} ${b.tipoAtleta}`;

    badgesHtml.push(
      `<span class="inline-flex items-center gap-1 rounded-md border ${b.colorBadge || 'bg-primary/10 text-primary border-primary/25'} px-2 py-0.5 ${compact ? 'text-[11px]' : 'text-xs'} font-bold">${esc(textoEscalera)}</span>`
    );
  }

  (st.extras || []).forEach((ex) => {
    badgesHtml.push(
      `<span class="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 ${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-primary">🏃 ${esc(ex)}</span>`
    );
  });

  if (st.pruebas.length > 0) {
    const maxPruebas = compact ? 3 : 6;
    const visibles = st.pruebas.slice(0, maxPruebas);
    const resto = st.pruebas.length - visibles.length;
    visibles.forEach((pr) => {
      badgesHtml.push(
        `<span class="inline-flex items-center rounded-md bg-muted px-2 py-0.5 ${compact ? 'text-[10px]' : 'text-[11px]'} font-semibold text-foreground">${esc(pr)}</span>`
      );
    });
    if (resto > 0) {
      badgesHtml.push(
        `<span class="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">+${resto} más</span>`
      );
    }
  }

  return badgesHtml.join('');
}

function renderEscaleraDisciplinasAtleta(scope, atleta = null, forceReset = false) {
  const st = getEscaleraState(scope, atleta, forceReset);
  const bloques = window.DISCIPLINAS_POR_BLOQUE || [];
  const atletaIdAttr = atleta?.id ? `'${atleta.id}'` : 'null';

  return `
    <div class="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-4">
      <!-- ESCALÓN 1: TIPO DE ATLETA -->
      <div class="space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-1">
          <span class="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-primary">
            <span class="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">1</span>
            Paso 1 · ¿Qué tipo de atleta es?
          </span>
          <span class="text-[11px] text-muted-foreground">Seleccioná Corredor, Pista y/o Campo</span>
        </div>

        <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
          ${bloques
            .map((b) => {
              const isSelected = st.tipos.includes(b.id);
              const subsCount = (b.subdisciplinas || []).filter((sub) =>
                st.subdisciplinas.some((s) => s.toLowerCase() === sub.nombre.toLowerCase())
              ).length;
              return `
                <button
                  type="button"
                  onclick="toggleEscaleraTipo('${scope}', '${b.id}', ${atletaIdAttr})"
                  class="flex items-start gap-2.5 rounded-xl border-2 p-3 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-card shadow-xs ring-2 ring-primary/15'
                      : 'border-border bg-card/70 opacity-80 hover:opacity-100 hover:border-primary/50'
                  }"
                >
                  <span class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border text-xs font-bold ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/40 bg-muted/40 text-transparent'
                  }">✓</span>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-1">
                      <p class="font-display text-lg font-extrabold uppercase leading-none text-foreground">
                        ${b.emoji || ''} ${esc(b.tipoAtleta || b.titulo)}
                      </p>
                      ${
                        isSelected && subsCount > 0
                          ? `<span class="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">${subsCount}</span>`
                          : ''
                      }
                    </div>
                    <p class="mt-1 text-[11px] leading-snug text-muted-foreground">${esc(b.subtitulo || '')}</p>
                  </div>
                </button>
              `;
            })
            .join('')}
        </div>
      </div>

      <!-- ESCALÓN 2 Y 3: SUB-DISCIPLINAS Y PRUEBAS EN ESCALERA -->
      ${
        st.tipos.length === 0
          ? `<div class="rounded-xl border border-dashed bg-card/80 p-4 text-center text-xs text-muted-foreground">
              👆 Elegí primero arriba si el atleta es <strong>Corredor</strong>, de <strong>Pista</strong> o de <strong>Campo</strong> para desplegar sus disciplinas y pruebas en escalera.
            </div>`
          : `<div class="space-y-3">
              ${bloques
                .filter((b) => st.tipos.includes(b.id))
                .map((b) => {
                  const subs = b.subdisciplinas || [];
                  return `
                    <div class="ml-1 sm:ml-2 border-l-4 border-primary pl-3 sm:pl-4 space-y-2.5">
                      <div class="rounded-xl border bg-card p-3 space-y-2.5 shadow-2xs">
                        <div class="flex flex-wrap items-center justify-between gap-1">
                          <span class="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-foreground">
                            <span class="grid size-5 place-items-center rounded-full bg-secondary text-[11px] font-bold text-secondary-foreground">2</span>
                            ${b.emoji || ''} ${esc(b.tipoAtleta)} · Elegí la disciplina:
                          </span>
                          <span class="text-[11px] text-muted-foreground">Tocá una opción para ver sus pruebas</span>
                        </div>

                        <!-- Botones de Sub-disciplinas (Escalón 2) -->
                        <div class="grid gap-2 sm:grid-cols-2">
                          ${subs
                            .map((sub) => {
                              const subActiva = st.subdisciplinas.some(
                                (s) => s.toLowerCase() === sub.nombre.toLowerCase()
                              );
                              const pruebasDeSubSeleccionadas = (sub.pruebas || []).filter((pr) =>
                                st.pruebas.some((p) => p.toLowerCase() === pr.toLowerCase())
                              );

                              return `
                                <div class="rounded-xl border transition-all ${
                                  subActiva
                                    ? 'border-primary bg-primary/5 shadow-2xs sm:col-span-2'
                                    : 'border-border bg-muted/20 hover:border-primary/50'
                                }">
                                  <button
                                    type="button"
                                    onclick="toggleEscaleraSubdisciplina('${scope}', '${esc(b.id)}', '${esc(sub.nombre)}', ${atletaIdAttr})"
                                    class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                                  >
                                    <div class="flex items-center gap-2 min-w-0">
                                      <span class="grid size-4 shrink-0 place-items-center rounded border text-[10px] font-bold ${
                                        subActiva
                                          ? 'border-primary bg-primary text-primary-foreground'
                                          : 'border-muted-foreground/40 bg-card text-transparent'
                                      }">✓</span>
                                      <div class="min-w-0">
                                        <p class="text-sm font-bold text-foreground">${esc(sub.nombre)}</p>
                                        <p class="truncate text-[11px] text-muted-foreground">${esc(sub.descripcion || '')}</p>
                                      </div>
                                    </div>
                                    <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      subActiva
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground'
                                    }">
                                      ${
                                        subActiva
                                          ? pruebasDeSubSeleccionadas.length > 0
                                            ? `${pruebasDeSubSeleccionadas.length} prueba${pruebasDeSubSeleccionadas.length === 1 ? '' : 's'}`
                                            : 'Elegir pruebas ↓'
                                          : '+ Seleccionar'
                                      }
                                    </span>
                                  </button>

                                  ${
                                    subActiva
                                      ? `
                                        <!-- ESCALÓN 3: PRUEBAS DE ESTA SUB-DISCIPLINA -->
                                        <div class="mx-3 mb-3 border-l-2 border-primary/40 pl-3 pt-1.5 space-y-2">
                                          <div class="flex flex-wrap items-center justify-between gap-2">
                                            <span class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                                              <span class="grid size-4 place-items-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">3</span>
                                              Pruebas de ${esc(sub.nombre)}:
                                            </span>
                                            <div class="flex items-center gap-2 text-[11px]">
                                              <button
                                                type="button"
                                                onclick="marcarTodasPruebasSubdisciplina('${scope}', '${esc(b.id)}', '${esc(sub.nombre)}', true, ${atletaIdAttr})"
                                                class="font-semibold text-primary hover:underline"
                                              >
                                                Marcar todas
                                              </button>
                                              <span class="text-muted-foreground">·</span>
                                              <button
                                                type="button"
                                                onclick="marcarTodasPruebasSubdisciplina('${scope}', '${esc(b.id)}', '${esc(sub.nombre)}', false, ${atletaIdAttr})"
                                                class="font-medium text-muted-foreground hover:text-foreground hover:underline"
                                              >
                                                Limpiar
                                              </button>
                                            </div>
                                          </div>
                                          <div class="flex flex-wrap gap-1.5">
                                            ${(sub.pruebas || [])
                                              .map((pr) => {
                                                const prActiva = st.pruebas.some(
                                                  (p) => p.toLowerCase() === pr.toLowerCase()
                                                );
                                                return `
                                                  <button
                                                    type="button"
                                                    onclick="toggleEscaleraPrueba('${scope}', '${esc(b.id)}', '${esc(sub.nombre)}', '${esc(pr)}', ${atletaIdAttr})"
                                                    class="rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                                                      prActiva
                                                        ? 'border-primary bg-primary text-primary-foreground shadow-2xs'
                                                        : 'bg-card text-muted-foreground hover:border-primary hover:text-foreground'
                                                    }"
                                                  >
                                                    ${prActiva ? '✓ ' : '+ '}${esc(pr)}
                                                  </button>
                                                `;
                                              })
                                              .join('')}
                                          </div>
                                        </div>
                                      `
                                      : ''
                                  }
                                </div>
                              `;
                            })
                            .join('')}
                        </div>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>`
      }

      <!-- RESUMEN EN TIEMPO REAL DE LA ESCALERA -->
      ${
        st.tipos.length > 0
          ? `<div class="rounded-lg border bg-card px-3 py-2 text-xs flex flex-wrap items-center gap-1.5">
              <span class="font-bold text-muted-foreground mr-1">Resumen actual:</span>
              ${renderResumenDisciplinasBadges(
                {
                  tiposAtleta: buildAtletaFieldsFromEscaleraState(st).tiposAtleta,
                  disciplinas: buildAtletaFieldsFromEscaleraState(st).disciplinas,
                  pruebas: buildAtletaFieldsFromEscaleraState(st).pruebas,
                },
                true
              )}
            </div>`
          : ''
      }
    </div>
  `;
}

function refreshEscaleraUIAfterChange(scope, atletaId = null) {
  const st = window._escaleraState[scope];
  if (!st) return;
  const built = buildAtletaFieldsFromEscaleraState(st);
  const atleta = atletaId ? Helpers.getAtleta(atletaId) : null;

  // Si estamos en la ficha de un atleta existente, sincronizar input #id-pruebas, actualizar atleta en vivo y guardar
  if (atleta) {
    const inpPruebas = document.getElementById('id-pruebas');
    if (inpPruebas) {
      inpPruebas.value = built.pruebas;
    }
    atleta.tiposAtleta = built.tiposAtleta;
    atleta.disciplinas = built.disciplinas;
    atleta.pruebas = built.pruebas;
    saveDB();

    const headerBadges = document.getElementById('ficha-header-disciplinas-badges');
    if (headerBadges) {
      headerBadges.innerHTML = renderResumenDisciplinasBadges(atleta, false);
    }
  }

  const container = document.getElementById(`escalera-container-${scope}`);
  if (container) {
    container.innerHTML = renderEscaleraDisciplinasAtleta(scope, atleta, false);
    if (window.lucide) window.lucide.createIcons();
  }
}

window.toggleEscaleraTipo = (scope, bloqueId, atletaId = null) => {
  const st = getEscaleraState(scope, atletaId ? Helpers.getAtleta(atletaId) : null, false);
  const bloques = window.DISCIPLINAS_POR_BLOQUE || [];
  const bloque = bloques.find((b) => b.id === bloqueId);
  if (!bloque) return;

  if (st.tipos.includes(bloqueId)) {
    // Desactivar este Tipo de Atleta y limpiar sus subdisciplinas y pruebas asociadas
    st.tipos = st.tipos.filter((id) => id !== bloqueId);
    const subsNombresLow = (bloque.subdisciplinas || []).map((s) => s.nombre.toLowerCase());
    const pruebasBloqueLow = (bloque.pruebasSugeridas || []).map((p) => p.toLowerCase());
    st.subdisciplinas = st.subdisciplinas.filter((s) => !subsNombresLow.includes(s.toLowerCase()));
    st.pruebas = st.pruebas.filter((p) => !pruebasBloqueLow.includes(p.toLowerCase()));
  } else {
    st.tipos.push(bloqueId);
  }

  refreshEscaleraUIAfterChange(scope, atletaId);
};

window.toggleEscaleraSubdisciplina = (scope, bloqueId, subNombre, atletaId = null) => {
  const st = getEscaleraState(scope, atletaId ? Helpers.getAtleta(atletaId) : null, false);
  const bloques = window.DISCIPLINAS_POR_BLOQUE || [];
  const bloque = bloques.find((b) => b.id === bloqueId);
  const sub = (bloque?.subdisciplinas || []).find((s) => s.nombre.toLowerCase() === subNombre.toLowerCase());
  if (!bloque || !sub) return;

  if (!st.tipos.includes(bloqueId)) {
    st.tipos.push(bloqueId);
  }

  const yaActiva = st.subdisciplinas.some((s) => s.toLowerCase() === sub.nombre.toLowerCase());
  if (yaActiva) {
    st.subdisciplinas = st.subdisciplinas.filter((s) => s.toLowerCase() !== sub.nombre.toLowerCase());
    const pruebasSubLow = (sub.pruebas || []).map((p) => p.toLowerCase());
    st.pruebas = st.pruebas.filter((p) => !pruebasSubLow.includes(p.toLowerCase()));
  } else {
    st.subdisciplinas.push(sub.nombre);
  }

  refreshEscaleraUIAfterChange(scope, atletaId);
};

window.toggleEscaleraPrueba = (scope, bloqueId, subNombre, prueba, atletaId = null) => {
  const st = getEscaleraState(scope, atletaId ? Helpers.getAtleta(atletaId) : null, false);
  if (!st.tipos.includes(bloqueId)) {
    st.tipos.push(bloqueId);
  }
  if (!st.subdisciplinas.some((s) => s.toLowerCase() === subNombre.toLowerCase())) {
    st.subdisciplinas.push(subNombre);
  }

  const yaEsta = st.pruebas.some((p) => p.toLowerCase() === prueba.toLowerCase());
  if (yaEsta) {
    st.pruebas = st.pruebas.filter((p) => p.toLowerCase() !== prueba.toLowerCase());
  } else {
    st.pruebas.push(prueba);
  }

  refreshEscaleraUIAfterChange(scope, atletaId);
};

window.marcarTodasPruebasSubdisciplina = (scope, bloqueId, subNombre, marcar, atletaId = null) => {
  const st = getEscaleraState(scope, atletaId ? Helpers.getAtleta(atletaId) : null, false);
  const bloques = window.DISCIPLINAS_POR_BLOQUE || [];
  const bloque = bloques.find((b) => b.id === bloqueId);
  const sub = (bloque?.subdisciplinas || []).find((s) => s.nombre.toLowerCase() === subNombre.toLowerCase());
  if (!sub) return;

  if (marcar) {
    (sub.pruebas || []).forEach((pr) => {
      if (!st.pruebas.some((p) => p.toLowerCase() === pr.toLowerCase())) {
        st.pruebas.push(pr);
      }
    });
  } else {
    const pruebasSubLow = (sub.pruebas || []).map((p) => p.toLowerCase());
    st.pruebas = st.pruebas.filter((p) => !pruebasSubLow.includes(p.toLowerCase()));
  }

  refreshEscaleraUIAfterChange(scope, atletaId);
};

function renderSelectDisciplinasOptions(selectedDisc) {
  const bloques = window.DISCIPLINAS_POR_BLOQUE || [];
  const conocidas = new Set(
    bloques.flatMap((b) => [
      b.tipoAtleta,
      ...(b.disciplinas || []),
      ...(b.subdisciplinas || []).map((s) => s.nombre),
    ])
  );
  const catalogo = Array.isArray(DB.disciplinasDisponibles) ? DB.disciplinasDisponibles : [];
  const extras = catalogo.filter((d) => !conocidas.has(d));

  return `
    ${bloques
      .map(
        (b) => `
        <optgroup label="${esc(b.titulo)}">
          <option value="${esc(b.tipoAtleta)}" ${b.tipoAtleta === selectedDisc ? 'selected' : ''}>${b.emoji || '🏃'} Todos: ${esc(b.tipoAtleta)} (${esc(b.subtitulo)})</option>
          ${(b.subdisciplinas || [])
            .map(
              (sub) =>
                `<option value="${esc(sub.nombre)}" ${sub.nombre === selectedDisc ? 'selected' : ''}>↳ ${esc(sub.nombre)}</option>`
            )
            .join('')}
        </optgroup>
      `
      )
      .join('')}
    ${
      extras.length > 0
        ? `<optgroup label="Otras disciplinas">
            ${extras
              .map(
                (d) =>
                  `<option value="${esc(d)}" ${d === selectedDisc ? 'selected' : ''}>🏃 ${esc(d)}</option>`
              )
              .join('')}
          </optgroup>`
        : ''
    }
  `;
}

window.saveInfoDeportivaAtleta = (e, atletaId) => {
  e.preventDefault();
  const a = Helpers.getAtleta(atletaId);
  if (!a) return;
  const scope = `ficha-${atletaId}`;
  const st = getEscaleraState(scope, a, false);
  const built = buildAtletaFieldsFromEscaleraState(st);

  a.tiposAtleta = built.tiposAtleta;
  a.disciplinas = built.disciplinas;
  a.nivel = document.getElementById('id-nivel').value;
  const manualPruebas = document.getElementById('id-pruebas')?.value.trim();
  a.pruebas = manualPruebas !== undefined ? manualPruebas : built.pruebas;
  a.antecedentes = document.getElementById('id-antecedentes').value.trim();
  a.salud = document.getElementById('id-salud').value.trim();
  a.observacionesEntrenador = document.getElementById('id-observaciones').value.trim();
  saveDB();
  showToast(`Disciplinas, pruebas e información deportiva de ${a.nombre} guardadas`);
  renderApp();
};

window.deleteExtraField = (atletaId, idx) => {
  const a = Helpers.getAtleta(atletaId);
  if (!a || !Array.isArray(a.extra)) return;
  a.extra.splice(idx, 1);
  saveDB();
  showToast('Campo adicional eliminado');
  renderApp();
};

window.saveCredencialesAtleta = (e, atletaId) => {
  e.preventDefault();
  const a = Helpers.getAtleta(atletaId);
  if (!a) return;
  a.usuario = document.getElementById('cred-user').value.trim().toLowerCase();
  // Contraseñas gestionadas de forma segura por Firebase Authentication
  if (a.tutor && document.getElementById('cred-tuser')) {
    a.tutor.usuario = document.getElementById('cred-tuser').value.trim().toLowerCase();
    // Contraseñas de tutores gestionadas por Firebase Auth
  }
  saveDB();
  showToast(`Credenciales de ${a.nombre} guardadas`);
  renderApp();
};

window.deleteAtleta = (atletaId) => {
  const a = Helpers.getAtleta(atletaId);
  if (!a) return;
  if (!confirm(`¿Seguro que querés dar de baja a ${a.nombre} ${a.apellido}?`)) return;
  DB.atletas = DB.atletas.filter((x) => x.id !== atletaId);
  delete DB.planes[atletaId];
  DB.pagos = DB.pagos.filter((p) => p.atletaId !== atletaId);
  saveDB();
  showToast('Atleta dado de baja');
  location.hash = '#/entrenador/atletas';
};

window.addExtraField = (e, atletaId) => {
  e.preventDefault();
  const et = document.getElementById('extra-et').value.trim();
  const val = document.getElementById('extra-val').value.trim();
  if (!et || !val) return;
  const atleta = Helpers.getAtleta(atletaId);
  if (!atleta) return;
  atleta.extra = atleta.extra || [];
  atleta.extra.push({ etiqueta: et, valor: val });
  saveDB();
  showToast('Campo agregado a la ficha');
  renderApp();
};

window.enviarMensajeIndividual = (e, atletaId) => {
  e.preventDefault();
  const texto = document.getElementById('msg-individual-text').value.trim();
  const titleEl = document.getElementById('msg-individual-title');
  const tituloCustom = titleEl ? titleEl.value.trim() : '';
  if (!texto) return;
  const atleta = Helpers.getAtleta(atletaId);
  DB.avisos.unshift({
    id: `a-${Date.now()}`,
    tipo: 'Individual',
    atletaId: atleta.id,
    autor: 'entrenador',
    titulo: tituloCustom || `Mensaje de tu entrenador`,
    cuerpo: texto,
    fecha: DB.hoy,
    destinatarios: Helpers.nombreCompleto(atleta),
    leidos: 0,
    total: 1,
    respuestas: [],
  });
  saveDB();
  showToast(`Mensaje enviado a ${atleta.nombre}`);
  renderApp();
};

window.deleteSession = (atletaId, sesionId) => {
  DB.planes[atletaId] = (DB.planes[atletaId] || []).filter((s) => s.id !== sesionId);
  saveDB();
  showToast('Entrenamiento eliminado del plan');
  renderApp();
};

function viewCoachCompetencias() {
  const content = `
    ${renderPageHeader(
      'Competencias',
      'Calendario del equipo, inscripciones, sugerencias y carga de resultados',
      `<button type="button" onclick="openNuevaCompetenciaModal()" class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">
        <i data-lucide="plus" class="size-4"></i> Nueva competencia
      </button>`
    )}
    <ul class="space-y-4 px-4 py-6 sm:px-8">
      ${DB.competencias
        .map((c) => {
          const d = Helpers.diaSemana(c.fecha);
          const disponibles = DB.atletas.filter(
            (a) => !c.inscriptos.includes(a.id) && !c.sugeridos.includes(a.id)
          );
          return `
            <li class="flex flex-col gap-5 rounded-xl border bg-card p-5 md:flex-row">
              <div class="flex w-16 shrink-0 flex-col items-center justify-center self-start rounded-lg bg-ink py-3 text-ink-foreground">
                <span class="text-xs uppercase opacity-70">${d.dia}</span>
                <span class="font-display text-4xl font-bold leading-none">${d.num}</span>
                <span class="text-xs uppercase opacity-70">${d.mes}</span>
              </div>
              <div class="flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">${esc(c.tipo)}</span>
                  <span class="text-xs text-muted-foreground">en ${Helpers.diasHasta(c.fecha)} días</span>
                </div>
                <h2 class="mt-1 text-2xl font-bold">${esc(c.nombre)}</h2>
                <p class="flex items-center gap-1 text-sm text-muted-foreground">
                  <i data-lucide="map-pin" class="size-4"></i> ${esc(c.lugar)} · ${esc(c.distancias.join(' / '))}
                </p>
                <div class="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inscriptos (${c.inscriptos.length})</p>
                    <ul class="mt-2 flex flex-wrap gap-2">
                      ${c.inscriptos
                        .map((id) => {
                          const a = Helpers.getAtleta(id);
                          if (!a) return '';
                          return `
                            <li class="flex items-center gap-2 rounded-full bg-success-soft py-1 pl-1 pr-3 text-sm">
                              ${renderAvatar(a.nombre, a.apellido, 'size-6 text-[10px]')}
                              ${esc(a.nombre)} ${esc(a.apellido[0])}.
                            </li>
                          `;
                        })
                        .join('')}
                    </ul>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sugerida a (${c.sugeridos.length})</p>
                    <ul class="mt-2 flex flex-wrap gap-2">
                      ${c.sugeridos
                        .map((id) => {
                          const a = Helpers.getAtleta(id);
                          if (!a) return '';
                          return `
                            <li class="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
                              <i data-lucide="sparkles" class="size-3.5"></i>
                              ${esc(a.nombre)} ${esc(a.apellido[0])}.
                            </li>
                          `;
                        })
                        .join('')}
                    </ul>
                  </div>
                </div>
              </div>
              <div class="md:w-60 flex flex-col gap-2">
                ${
                  disponibles.length > 0
                    ? `<select onchange="if(this.value) sugerirCompetencia('${c.id}', this.value)" class="h-10 w-full rounded-lg border bg-card px-3 text-sm">
                        <option value="">Sugerir carrera a…</option>
                        ${disponibles
                          .map((a) => `<option value="${a.id}">${esc(a.nombre)} ${esc(a.apellido)}</option>`)
                          .join('')}
                      </select>`
                    : ''
                }
                <select onchange="if(this.value) inscribirCompetencia('${c.id}', this.value)" class="h-10 w-full rounded-lg border bg-card px-3 text-sm">
                  <option value="">Inscribir a…</option>
                  ${DB.atletas
                    .filter((a) => !c.inscriptos.includes(a.id))
                    .map((a) => `<option value="${a.id}">${esc(a.nombre)} ${esc(a.apellido)}</option>`)
                    .join('')}
                </select>
                <select onchange="if(this.value) { openNuevoResultadoModal(this.value, '${esc(c.nombre)}', '${esc(c.fecha)}'); this.value=''; }" class="h-10 w-full rounded-lg border border-primary/40 bg-primary/5 px-3 text-sm font-medium text-primary">
                  <option value="">⏱️ Registrar resultado / marca a…</option>
                  ${DB.atletas
                    .map((a) => `<option value="${a.id}">${esc(a.nombre)} ${esc(a.apellido)}</option>`)
                    .join('')}
                </select>
                <button type="button" onclick="deleteCompetencia('${c.id}')" class="self-end text-xs text-muted-foreground hover:text-destructive">
                  Eliminar fecha
                </button>
              </div>
            </li>
          `;
        })
        .join('')}
    </ul>
  `;
  return renderCoachShell('competencias', content);
}

window.deleteCompetencia = (id) => {
  if (!confirm('¿Eliminar esta competencia del calendario?')) return;
  DB.competencias = DB.competencias.filter((c) => c.id !== id);
  saveDB();
  showToast('Competencia eliminada');
  renderApp();
};

window.sugerirCompetencia = (compId, atletaId) => {
  const c = DB.competencias.find((x) => x.id === compId);
  const a = Helpers.getAtleta(atletaId);
  if (c && a && !c.sugeridos.includes(atletaId)) {
    c.sugeridos.push(atletaId);
    saveDB();
    showToast(`Se sugirió la carrera a ${a.nombre}`);
    renderApp();
  }
};

window.inscribirCompetencia = (compId, atletaId) => {
  const c = DB.competencias.find((x) => x.id === compId);
  const a = Helpers.getAtleta(atletaId);
  if (c && a && !c.inscriptos.includes(atletaId)) {
    c.inscriptos.push(atletaId);
    c.sugeridos = c.sugeridos.filter((id) => id !== atletaId);
    saveDB();
    showToast(`${a.nombre} inscripto/a en ${c.nombre}`);
    renderApp();
  }
};

function getConceptosCobroList() {
  if (!Array.isArray(DB.conceptosCobro) || DB.conceptosCobro.length === 0) {
    DB.conceptosCobro = [
      { id: 'cuota', nombre: 'Cuota', montoSugerido: 15000, detalleSugerido: 'Cuota mensual' },
      { id: 'indumentaria', nombre: 'Indumentaria', montoSugerido: 25000, detalleSugerido: 'Indumentaria del equipo' },
      { id: 'viajes-competencias', nombre: 'Viajes y Competencias', montoSugerido: 20000, detalleSugerido: 'Viaje y participación en competencia' },
    ];
  }
  return DB.conceptosCobro;
}

function viewCoachPagos() {
  // Control automático de vencimientos: si un pago pendiente ya superó la fecha de hoy, pasa a vencido
  const hoyStr = DB.hoy || new Date().toISOString().slice(0, 10);
  DB.pagos.forEach((p) => {
    if (p.estado === 'pendiente' && p.vencimiento && p.vencimiento < hoyStr) {
      p.estado = 'vencido';
    }
  });

  const filtrosEstado = [
    { id: 'Todos', label: 'Todos' },
    { id: 'informado', label: 'A verificar' },
    { id: 'vencido', label: 'Vencidos' },
    { id: 'pendiente', label: 'Pendientes' },
    { id: 'pagado', label: 'Pagados' },
    { id: 'rechazado', label: 'Rechazados' },
  ];
  const catalogoConceptos = getConceptosCobroList();
  const nombresConceptos = Array.from(
    new Set([
      ...catalogoConceptos.map((c) => c.nombre),
      ...DB.pagos.map((p) => p.concepto).filter(Boolean),
    ])
  );
  const conceptos = ['Todos', ...nombresConceptos];

  const suma = (e) => DB.pagos.filter((p) => p.estado === e).reduce((t, p) => t + p.monto, 0);
  const filas = DB.pagos
    .filter(
      (p) =>
        (State.pagosEstado === 'Todos' || p.estado === State.pagosEstado) &&
        (State.pagosConcepto === 'Todos' || p.concepto === State.pagosConcepto)
    )
    .slice()
    .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));

  // Listado de morosos / saldo deudor por atleta
  const morosos = DB.atletas
    .map((a) => {
      const pagosAtleta = DB.pagos.filter((p) => p.atletaId === a.id && p.estado !== 'pagado');
      const deudaTotal = pagosAtleta.reduce((t, p) => t + (Number(p.monto) || 0), 0);
      const deudaVencida = pagosAtleta
        .filter((p) => p.estado === 'vencido')
        .reduce((t, p) => t + (Number(p.monto) || 0), 0);
      return {
        atleta: a,
        deudaTotal,
        deudaVencida,
        cantidadItems: pagosAtleta.length,
      };
    })
    .filter((m) => m.deudaTotal > 0)
    .sort((a, b) => b.deudaVencida - a.deudaVencida || b.deudaTotal - a.deudaTotal);

  const content = `
    ${renderPageHeader(
      'Pagos y Cobranzas',
      'Gestión de cuotas, indumentaria, viajes y competencias, control de vencimientos y listado de morosos',
      `<div class="flex flex-wrap items-center gap-2">
        <button type="button" onclick="openConceptosCobroModal()" class="inline-flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-sm font-semibold hover:bg-muted">
          <i data-lucide="settings-2" class="size-4"></i> Configurar conceptos y valores
        </button>
        <button type="button" onclick="openNuevoCobroModal()" class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">
          <i data-lucide="plus" class="size-4"></i> Nuevo cobro
        </button>
      </div>`
    )}
    <div class="space-y-6 px-4 py-6 sm:px-8">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border bg-card p-5">
          <p class="text-sm font-medium text-muted-foreground">Vencido</p>
          <p class="mt-1 font-display text-3xl font-bold tabular-nums text-destructive">${Helpers.pesos(suma('vencido'))}</p>
        </div>
        <div class="rounded-xl border bg-card p-5">
          <p class="text-sm font-medium text-muted-foreground">Por cobrar</p>
          <p class="mt-1 font-display text-3xl font-bold tabular-nums text-warning-text">${Helpers.pesos(suma('pendiente'))}</p>
        </div>
        <div class="rounded-xl border bg-card p-5">
          <p class="text-sm font-medium text-muted-foreground">A verificar (Informados)</p>
          <p class="mt-1 font-display text-3xl font-bold tabular-nums text-blue-600 dark:text-blue-400">${Helpers.pesos(suma('informado'))}</p>
        </div>
        <div class="rounded-xl border bg-card p-5">
          <p class="text-sm font-medium text-muted-foreground">Cobrado confirmado</p>
          <p class="mt-1 font-display text-3xl font-bold tabular-nums text-success">${Helpers.pesos(suma('pagado'))}</p>
        </div>
      </div>

      <!-- Bandeja de Pagos a Verificar -->
      ${(() => {
        const porVerificar = DB.pagos.filter((p) => p.estado === 'informado');
        if (porVerificar.length === 0) return '';
        return `
        <section class="rounded-xl border-2 border-blue-500/40 bg-blue-500/5 p-5 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-blue-500/20 pb-3">
            <div class="flex items-center gap-2">
              <span class="flex size-3 rounded-full bg-blue-500 animate-pulse"></span>
              <h2 class="text-xl font-bold text-blue-950 dark:text-blue-100">
                Bandeja de Pagos a Verificar (${porVerificar.length})
              </h2>
            </div>
            <p class="text-xs text-muted-foreground">Comprobantes enviados por atletas o familias pendientes de validación</p>
          </div>
          <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            ${porVerificar
              .map((p) => {
                const a = Helpers.getAtleta(p.atletaId);
                return `
              <div class="flex flex-col justify-between rounded-xl border border-blue-200 dark:border-blue-900 bg-card p-4 shadow-xs">
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <a href="#/entrenador/atletas/${a ? a.id : p.atletaId}" class="font-bold text-sm truncate hover:text-primary">
                        ${esc(a ? Helpers.nombreCompleto(a) : p.atletaId)}
                      </a>
                      <p class="text-xs text-muted-foreground">${esc(p.detalle || p.concepto)}</p>
                    </div>
                    <span class="font-display text-lg font-bold tabular-nums text-primary">${Helpers.pesos(p.monto)}</span>
                  </div>
                  <div class="mt-2 text-xs text-muted-foreground space-y-0.5">
                    <p>Medio: <strong class="text-foreground">${p.medioPago === 'efectivo' ? '💵 Efectivo' : '💸 Transferencia'}</strong></p>
                    <p>Fecha informada: <strong class="text-foreground">${Helpers.fechaCorta(p.fechaPago || p.informadoEn)}</strong></p>
                    ${p.informadoPor ? `<p>Informó: <em>${esc(p.informadoPor)}</em></p>` : ''}
                    ${p.notaPago ? `<p class="italic text-foreground">“${esc(p.notaPago)}”</p>` : ''}
                  </div>
                  ${
                    p.comprobanteDataUrl
                      ? `
                    <div class="mt-3">
                      <button type="button" onclick="verComprobanteModal('${p.id}')" class="group relative block w-full overflow-hidden rounded-lg border bg-muted/40 hover:opacity-90">
                        <img src="${p.comprobanteDataUrl}" alt="Comprobante" class="h-28 w-full object-cover object-center" />
                        <span class="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-[11px] font-semibold text-white">
                          🔍 Ver comprobante completo
                        </span>
                      </button>
                    </div>
                  `
                      : `
                    <div class="mt-3 rounded-lg bg-muted/40 p-2 text-center text-xs text-muted-foreground italic">
                      Sin comprobante adjunto (${p.medioPago === 'efectivo' ? 'Efectivo' : 'Transferencia'})
                    </div>
                  `
                  }
                </div>
                <div class="mt-4 flex items-center justify-end gap-2 border-t pt-3">
                  <button type="button" onclick="openRechazarPagoModal('${p.id}')" class="inline-flex items-center gap-1 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20">
                    ✕ Rechazar
                  </button>
                  <button type="button" onclick="confirmarPagoCoach('${p.id}')" class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs">
                    ✓ Confirmar ingreso
                  </button>
                </div>
              </div>
              `;
              })
              .join('')}
          </div>
        </section>
        `;
      })()}

      <!-- Listado de Morosos y Saldo Deudor por Atleta -->
      <section class="rounded-xl border bg-card p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-xl font-bold">Control de saldo deudor y listado de morosos (${morosos.length})</h2>
            <p class="text-xs text-muted-foreground">Atletas con cuotas o conceptos vencidos o pendientes de pago.</p>
          </div>
        </div>
        ${
          morosos.length === 0
            ? `<div class="mt-3 rounded-lg bg-success-soft/50 px-4 py-3 text-sm font-medium text-success">
                ✓ Todos los atletas de la escuela se encuentran al día con sus pagos.
              </div>`
            : `<div class="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                ${morosos
                  .map(
                    (m) => `
                  <a href="#/entrenador/atletas/${m.atleta.id}" onclick="State.fichaTab='pagos'" class="flex items-center justify-between rounded-xl border p-3 transition-colors hover:bg-muted/50 ${
                    m.deudaVencida > 0 ? 'border-destructive/40 bg-destructive/5' : 'bg-card'
                  }">
                    <div class="flex items-center gap-2.5 min-w-0">
                      ${renderAvatar(m.atleta.nombre, m.atleta.apellido, 'size-9 text-xs')}
                      <div class="min-w-0">
                        <p class="truncate text-sm font-bold">${esc(Helpers.nombreCompleto(m.atleta))}</p>
                        <p class="text-xs text-muted-foreground">${m.cantidadItems} concepto${m.cantidadItems === 1 ? '' : 's'} · ${
                          m.deudaVencida > 0 ? `<span class="font-semibold text-destructive">Vencido: ${Helpers.pesos(m.deudaVencida)}</span>` : 'Pendiente'
                        }</p>
                      </div>
                    </div>
                    <div class="text-right pl-2">
                      <p class="font-display text-xl font-bold tabular-nums ${m.deudaVencida > 0 ? 'text-destructive' : 'text-warning-text'}">${Helpers.pesos(m.deudaTotal)}</p>
                      <span class="text-[11px] font-semibold text-primary">Ver cuenta →</span>
                    </div>
                  </a>
                `
                  )
                  .join('')}
              </div>`
        }
      </section>

      <!-- Panel de Conceptos y Valores de Cobro Vigentes -->
      <section class="rounded-xl border bg-card p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-xl font-bold">Conceptos y valores de cobro</h2>
            <p class="text-xs text-muted-foreground">Hacé clic en un concepto para cargar un cobro rápido o configurá sus valores base y agregá nuevos conceptos.</p>
          </div>
          <button type="button" onclick="openConceptosCobroModal()" class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
            <i data-lucide="plus" class="size-3.5"></i> Editar valores / Crear concepto
          </button>
        </div>
        <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          ${catalogoConceptos
            .map(
              (c) => `
            <div class="flex flex-col justify-between rounded-xl border bg-muted/30 p-3.5">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-primary">${esc(c.nombre)}</p>
                <p class="mt-1 font-display text-3xl font-bold tabular-nums">${Helpers.pesos(Number(c.montoSugerido) || 0)}</p>
                <p class="mt-0.5 truncate text-xs text-muted-foreground" title="${esc(c.detalleSugerido || '')}">${esc(c.detalleSugerido || c.nombre)}</p>
              </div>
              <div class="mt-3 flex items-center justify-between border-t pt-2.5">
                <button type="button" onclick="openNuevoCobroModal(null, null, '${esc(c.nombre)}')" class="text-xs font-semibold text-primary hover:underline">
                  + Aplicar cobro →
                </button>
                <button type="button" onclick="openConceptosCobroModal()" class="text-xs text-muted-foreground hover:text-foreground">
                  Cambiar valor
                </button>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </section>

      <div class="flex flex-col gap-3 md:flex-row md:justify-between">
        <div class="flex gap-1 rounded-lg bg-muted p-1 self-start">
          ${filtrosEstado
            .map(
              (f) => `
            <button
              type="button"
              onclick="State.pagosEstado = '${f.id}'; renderApp()"
              class="rounded-md px-3 py-1 text-sm font-medium ${
                State.pagosEstado === f.id ? 'bg-card shadow-xs text-foreground' : 'text-muted-foreground'
              }"
            >
              ${f.label}
            </button>
          `
            )
            .join('')}
        </div>
        <div class="flex flex-wrap gap-2">
          ${conceptos
            .map(
              (c) => `
            <button
              type="button"
              onclick="State.pagosConcepto = '${esc(c)}'; renderApp()"
              class="rounded-full border px-3 py-1 text-sm font-medium ${
                State.pagosConcepto === c ? 'border-ink bg-ink text-ink-foreground' : 'bg-card hover:bg-muted'
              }"
            >
              ${esc(c)}
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="overflow-x-auto rounded-xl border bg-card">
        <table class="w-full min-w-[40rem] text-sm">
          <thead class="border-b text-left text-muted-foreground">
            <tr>
              <th class="px-5 py-3 font-medium">Atleta</th>
              <th class="px-3 py-3 font-medium">Concepto</th>
              <th class="px-3 py-3 font-medium">Vencimiento</th>
              <th class="px-3 py-3 text-right font-medium">Monto</th>
              <th class="px-3 py-3 font-medium">Estado</th>
              <th class="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y">
            ${
              filas.length === 0
                ? `<tr><td colspan="6" class="px-5 py-10 text-center text-muted-foreground">No hay pagos para este filtro.</td></tr>`
                : filas
                    .map((p) => {
                      const a = Helpers.getAtleta(p.atletaId);
                      if (!a) return '';
                      return `
                      <tr>
                        <td class="px-5 py-3">
                          <a href="#/entrenador/atletas/${a.id}" class="font-medium hover:text-primary">
                            ${esc(a.nombre)} ${esc(a.apellido)}
                          </a>
                        </td>
                        <td class="px-3 py-3">
                          <p class="font-medium">${esc(p.detalle)}</p>
                          <p class="text-xs text-muted-foreground">
                            ${esc(p.concepto)}
                            ${
                              (p.estado === 'pagado' || p.estado === 'informado') && p.medioPago
                                ? ` · <span class="font-semibold text-foreground">${p.medioPago === 'efectivo' ? '💵 Efectivo' : '💸 Transferencia'}</span>`
                                : ''
                            }
                            ${p.notaPago ? ` · <em>“${esc(p.notaPago)}”</em>` : ''}
                          </p>
                          ${
                            p.estado === 'rechazado' && p.motivoRechazo
                              ? `<p class="mt-0.5 text-xs font-medium text-destructive">Rechazado: ${esc(p.motivoRechazo)}</p>`
                              : p.estado === 'pagado' && p.confirmadoPor
                              ? `<p class="mt-0.5 text-[11px] text-muted-foreground">Confirmado por ${esc(p.confirmadoPor)} (${Helpers.fechaCorta(p.confirmadoEn)})</p>`
                              : p.estado === 'informado' && p.informadoPor
                              ? `<p class="mt-0.5 text-[11px] text-blue-600 dark:text-blue-400">Informado por ${esc(p.informadoPor)} (${Helpers.fechaCorta(p.fechaPago || p.informadoEn)})</p>`
                              : ''
                          }
                        </td>
                        <td class="px-3 py-3 tabular-nums">${Helpers.fechaCorta(p.vencimiento)}</td>
                        <td class="px-3 py-3 text-right font-semibold tabular-nums">${Helpers.pesos(p.monto)}</td>
                        <td class="px-3 py-3">${renderEstadoPagoBadge(p.estado, p.motivoRechazo)}</td>
                        <td class="px-5 py-3 text-right">
                          <div class="inline-flex flex-wrap items-center justify-end gap-2">
                            ${
                              p.comprobanteDataUrl
                                ? `<button type="button" onclick="verComprobanteModal('${p.id}')" class="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20">
                                    📎 Comprobante
                                  </button>`
                                : ''
                            }
                            ${
                              p.estado === 'informado'
                                ? `<button type="button" onclick="confirmarPagoCoach('${p.id}')" class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700" title="Confirmar ingreso del dinero">
                                    ✓ Confirmar
                                  </button>
                                  <button type="button" onclick="openRechazarPagoModal('${p.id}')" class="inline-flex items-center gap-1 rounded-lg border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20" title="Rechazar comprobante">
                                    ✕ Rechazar
                                  </button>`
                                : p.estado !== 'pagado'
                                ? `<button type="button" onclick="openRegistrarPagoModal('${p.id}')" class="rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                                    Registrar pago
                                  </button>`
                                : `<button type="button" onclick="openRegistrarPagoModal('${p.id}')" class="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" title="Cambiar medio de pago o adjuntar comprobante">
                                    ${p.comprobanteDataUrl || p.medioPago ? 'Medio/Comprobante' : '+ Comprobante'}
                                  </button>`
                            }
                            <button type="button" onclick="openNuevoCobroModal('${a.id}', '${p.id}')" title="Editar valor o concepto" class="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">Editar</button>
                            <button type="button" onclick="deletePago('${p.id}')" title="Eliminar cobro" class="text-xs text-muted-foreground hover:text-destructive">✕</button>
                          </div>
                        </td>
                      </tr>
                    `;
                    })
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
  return renderCoachShell('pagos', content);
}

let tempComprobanteDataUrl = null;
let tempMedioPago = 'transferencia';

window.registrarPago = (id) => {
  window.openRegistrarPagoModal(id);
};

window.openRegistrarPagoModal = (pagoId) => {
  const pago = DB.pagos.find((p) => p.id === pagoId);
  if (!pago) return;
  tempComprobanteDataUrl = pago.comprobanteDataUrl || null;
  tempMedioPago = pago.medioPago || 'transferencia';
  renderRegistrarPagoModalContent(pago);
};

function renderRegistrarPagoModalContent(pago) {
  const atleta = Helpers.getAtleta(pago.atletaId);
  const fechaPagoVal = document.getElementById('rp-fecha')?.value || pago.fechaPago || DB.hoy;
  const notaVal = document.getElementById('rp-nota')?.value ?? (pago.notaPago || '');

  showModalHtml(`
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold">${pago.estado === 'pagado' ? 'Detalle y comprobante de pago' : (session?.role === 'coach' ? 'Registrar / Confirmar pago' : 'Informar pago realizado')}</h2>
        <p class="text-sm text-muted-foreground">
          ${atleta ? `${esc(Helpers.nombreCompleto(atleta))} · ` : ''}<strong>${esc(pago.detalle || pago.concepto)}</strong> (${Helpers.pesos(pago.monto)})
        </p>
      </div>
      <button type="button" onclick="closeModal()" class="text-muted-foreground hover:text-foreground">✕</button>
    </div>

    <form onsubmit="saveRegistrarPagoModal(event, '${pago.id}')" class="mt-4 space-y-4">
      <div>
        <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medio de pago</label>
        <div class="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onclick="setTempMedioPago('transferencia', '${pago.id}')"
            class="flex items-center justify-center gap-2 rounded-xl border py-3 px-3 text-sm font-semibold transition-colors ${
              tempMedioPago === 'transferencia'
                ? 'border-primary bg-primary/10 text-primary'
                : 'bg-card hover:bg-muted text-foreground'
            }"
          >
            💸 Transferencia
          </button>
          <button
            type="button"
            onclick="setTempMedioPago('efectivo', '${pago.id}')"
            class="flex items-center justify-center gap-2 rounded-xl border py-3 px-3 text-sm font-semibold transition-colors ${
              tempMedioPago === 'efectivo'
                ? 'border-success bg-success-soft text-success'
                : 'bg-card hover:bg-muted text-foreground'
            }"
          >
            💵 Pago en Efectivo
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium">Fecha de pago</label>
          <input id="rp-fecha" type="date" required value="${esc(fechaPagoVal)}" class="mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
        <div>
          <label class="text-xs font-medium">Referencia / Nota (opcional)</label>
          <input id="rp-nota" value="${esc(notaVal)}" placeholder="${tempMedioPago === 'efectivo' ? 'Ej.: Entregado en mano al profe' : 'Ej.: Comprobante MP / Banco'}" class="mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
      </div>

      <div class="rounded-xl border border-dashed bg-muted/30 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm font-semibold">
              ${tempMedioPago === 'transferencia' ? '📎 Comprobante de transferencia (foto o captura)' : '📎 Adjuntar recibo / comprobante (opcional)'}
            </p>
            <p class="text-xs text-muted-foreground">Podés subir una foto o captura desde el celular o la computadora.</p>
          </div>
          <label class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:opacity-90">
            📷 Elegir imagen
            <input type="file" accept="image/*" onchange="handleComprobanteFileChange(event, '${pago.id}')" class="hidden" />
          </label>
        </div>

        ${
          tempComprobanteDataUrl
            ? `<div class="mt-3 rounded-lg border bg-card p-3">
                <div class="flex items-center justify-between pb-2">
                  <span class="text-xs font-semibold text-success">✓ Comprobante adjunto listo para guardar</span>
                  <button type="button" onclick="clearComprobanteTemp('${pago.id}')" class="text-xs font-semibold text-destructive hover:underline">
                    Quitar imagen
                  </button>
                </div>
                <img src="${tempComprobanteDataUrl}" alt="Vista previa del comprobante" class="max-h-56 w-auto mx-auto rounded-lg border object-contain" />
              </div>`
            : `<p class="mt-2 text-xs text-muted-foreground italic">
                ${tempMedioPago === 'efectivo' ? 'Seleccionaste Pago en Efectivo (no requiere comprobante fotográfico).' : 'Todavía no adjuntaste ninguna imagen del comprobante.'}
              </p>`
        }
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal()" class="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
        <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">
          ${session?.role === 'coach' ? 'Confirmar y registrar pago' : 'Informar pago (Enviar a revisión)'}
        </button>
      </div>
    </form>
  `);
}

window.setTempMedioPago = (medio, pagoId) => {
  tempMedioPago = medio;
  const pago = DB.pagos.find((p) => p.id === pagoId);
  if (pago) renderRegistrarPagoModalContent(pago);
};

window.clearComprobanteTemp = (pagoId) => {
  tempComprobanteDataUrl = null;
  const pago = DB.pagos.find((p) => p.id === pagoId);
  if (pago) renderRegistrarPagoModalContent(pago);
};

window.handleComprobanteFileChange = (e, pagoId) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      // Comprimir imagen automáticamente en canvas (máx 900px) para sincronización rápida y liviana en Firestore
      const maxDim = 900;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      tempComprobanteDataUrl = canvas.toDataURL('image/jpeg', 0.72);
      const pago = DB.pagos.find((p) => p.id === pagoId);
      if (pago) renderRegistrarPagoModalContent(pago);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
};

window.saveRegistrarPagoModal = (e, pagoId) => {
  e.preventDefault();
  const pago = DB.pagos.find((p) => p.id === pagoId);
  if (!pago) return;
  const session = typeof Auth.verifyCurrentSession === 'function' ? Auth.verifyCurrentSession() : Auth.getSession();
  const isCoach = Boolean(session && session.role === 'coach');

  pago.medioPago = tempMedioPago;
  pago.fechaPago = document.getElementById('rp-fecha')?.value || DB.hoy;
  pago.notaPago = document.getElementById('rp-nota')?.value.trim() || undefined;
  pago.comprobanteDataUrl = tempComprobanteDataUrl || undefined;

  if (isCoach) {
    pago.estado = 'pagado';
    pago.confirmadoPor = session?.nombre || 'Entrenador';
    pago.confirmadoEn = new Date().toISOString();
    delete pago.motivoRechazo;
    delete pago.rechazadoPor;
    delete pago.rechazadoEn;
    showToast(
      tempMedioPago === 'efectivo'
        ? 'Pago en efectivo confirmado correctamente'
        : 'Pago por transferencia confirmado correctamente'
    );
  } else {
    pago.estado = 'informado';
    pago.informadoPor = session?.nombre || 'Atleta / Familia';
    pago.informadoEn = new Date().toISOString();
    delete pago.motivoRechazo;
    delete pago.rechazadoPor;
    delete pago.rechazadoEn;
    showToast('Pago informado con éxito. Quedó en revisión para confirmación del entrenador.');
  }

  saveDB();
  closeModal();
  renderApp();
};

window.confirmarPagoCoach = (pagoId) => {
  const pago = DB.pagos.find((p) => p.id === pagoId);
  if (!pago) return;
  const session = typeof Auth.verifyCurrentSession === 'function' ? Auth.verifyCurrentSession() : Auth.getSession();
  pago.estado = 'pagado';
  pago.confirmadoPor = session?.nombre || 'Entrenador';
  pago.confirmadoEn = new Date().toISOString();
  pago.fechaPago = pago.fechaPago || DB.hoy;
  delete pago.motivoRechazo;
  delete pago.rechazadoPor;
  delete pago.rechazadoEn;

  saveDB();
  showToast(`Pago de ${Helpers.pesos(pago.monto)} confirmado exitosamente.`);
  renderApp();
};

window.openRechazarPagoModal = (pagoId) => {
  const pago = DB.pagos.find((p) => p.id === pagoId);
  if (!pago) return;
  const atleta = Helpers.getAtleta(pago.atletaId);
  showModalHtml(`
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold text-destructive">Rechazar comprobante de pago</h2>
        <p class="text-sm text-muted-foreground">
          ${atleta ? `${esc(Helpers.nombreCompleto(atleta))} — ` : ''}<strong>${esc(pago.detalle || pago.concepto)}</strong> (${Helpers.pesos(pago.monto)})
        </p>
      </div>
      <button type="button" onclick="closeModal()" class="text-muted-foreground hover:text-foreground">✕</button>
    </div>
    <form onsubmit="confirmarRechazoPago(event, '${pago.id}')" class="mt-4 space-y-4">
      <div>
        <label class="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Motivo del rechazo</label>
        <p class="mb-2 text-xs text-muted-foreground">Este motivo será informado al atleta o familia para que puedan corregirlo y volver a informar.</p>
        <textarea id="rechazo-motivo" required rows="3" placeholder="Ej.: El comprobante es ilegible, no coincide el importe transferido, o la transferencia no ingresó en la cuenta bancaria." class="w-full rounded-lg border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring"></textarea>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal()" class="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-muted">Cancelar</button>
        <button type="submit" class="rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:opacity-95">Rechazar comprobante</button>
      </div>
    </form>
  `);
};

window.confirmarRechazoPago = (e, pagoId) => {
  e.preventDefault();
  const pago = DB.pagos.find((p) => p.id === pagoId);
  if (!pago) return;
  const session = typeof Auth.verifyCurrentSession === 'function' ? Auth.verifyCurrentSession() : Auth.getSession();
  const motivo = document.getElementById('rechazo-motivo').value.trim();
  pago.estado = 'rechazado';
  pago.motivoRechazo = motivo;
  pago.rechazadoPor = session?.nombre || 'Entrenador';
  pago.rechazadoEn = new Date().toISOString();
  delete pago.confirmadoPor;
  delete pago.confirmadoEn;

  saveDB();
  closeModal();
  showToast('Comprobante rechazado. El cobro volvió a quedar como deuda con motivo.');
  renderApp();
};

window.verComprobanteModal = (pagoId) => {
  const pago = DB.pagos.find((p) => p.id === pagoId);
  if (!pago || !pago.comprobanteDataUrl) return;
  const atleta = Helpers.getAtleta(pago.atletaId);
  showModalHtml(`
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold">Comprobante de pago</h2>
        <p class="text-sm text-muted-foreground">
          ${atleta ? `${esc(Helpers.nombreCompleto(atleta))} · ` : ''}${esc(pago.detalle || pago.concepto)} · ${Helpers.pesos(pago.monto)}
        </p>
        <p class="mt-0.5 text-xs text-muted-foreground">
          ${pago.medioPago === 'efectivo' ? '💵 Efectivo' : '💸 Transferencia'} · Fecha: ${Helpers.fechaCorta(pago.fechaPago || DB.hoy)}
          ${pago.notaPago ? ` · Nota: “${esc(pago.notaPago)}”` : ''}
        </p>
      </div>
      <button type="button" onclick="closeModal()" class="text-muted-foreground hover:text-foreground">✕</button>
    </div>
    <div class="mt-4 rounded-xl border bg-muted/30 p-3 text-center">
      <img src="${pago.comprobanteDataUrl}" alt="Comprobante de pago" class="max-h-[28rem] w-auto mx-auto rounded-lg object-contain" />
    </div>
    <div class="mt-4 flex flex-wrap justify-between gap-2">
      <a href="${pago.comprobanteDataUrl}" download="comprobante-${esc(pago.id)}.jpg" class="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold hover:bg-muted">
        ⬇️ Descargar comprobante
      </a>
      <div class="flex gap-2">
        <button type="button" onclick="openRegistrarPagoModal('${pago.id}')" class="rounded-lg border px-3.5 py-2 text-xs font-semibold hover:bg-muted">
          Cambiar imagen / medio
        </button>
        <button type="button" onclick="closeModal()" class="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          Cerrar
        </button>
      </div>
    </div>
  `);
};

window.deletePago = (id) => {
  if (!confirm('¿Eliminar este cobro?')) return;
  DB.pagos = DB.pagos.filter((p) => p.id !== id);
  saveDB();
  showToast('Cobro eliminado');
  renderApp();
};

function viewCoachAvisos() {
  const tipos = ['General', 'Entrenamiento', 'Competencia', 'Individual'];
  const grupos = ['Todo el grupo', 'Menores y juveniles', 'Mayores y Master'];
  const opciones =
    State.avisoTipo === 'Individual'
      ? DB.atletas.map((a) => `${a.nombre} ${a.apellido}`)
      : grupos;

  const tipoColor = {
    General: 'bg-secondary text-secondary-foreground',
    Entrenamiento: 'bg-warning-soft text-warning-text',
    Competencia: 'bg-accent text-accent-foreground',
    Individual: 'bg-success-soft text-success',
  };

  const content = `
    ${renderPageHeader('Avisos', 'Comunicación con corredores y familias')}
    <div class="grid gap-6 px-4 py-6 sm:px-8 xl:grid-cols-[26rem_1fr]">
      <form onsubmit="enviarAviso(event)" class="h-fit space-y-4 rounded-xl border bg-card p-5">
        <h2 class="text-2xl font-bold">Nuevo aviso</h2>
        <fieldset>
          <legend class="mb-1.5 text-sm font-medium">Tipo</legend>
          <div class="grid grid-cols-2 gap-2">
            ${tipos
              .map(
                (t) => `
              <button
                type="button"
                onclick="setAvisoTipo('${t}')"
                class="rounded-md border px-3 py-2 text-sm font-medium ${
                  State.avisoTipo === t
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card hover:bg-muted'
                }"
              >
                ${t}
              </button>
            `
              )
              .join('')}
          </div>
        </fieldset>
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Destinatarios</label>
          <select id="av-dest" onchange="State.avisoDest = this.value" class="h-10 w-full rounded-lg border bg-card px-3 text-sm">
            ${opciones
              .map(
                (o) =>
                  `<option value="${esc(o)}" ${State.avisoDest === o ? 'selected' : ''}>${esc(o)}</option>`
              )
              .join('')}
          </select>
        </div>
        <div class="space-y-1.5">
          <label for="av-titulo" class="text-sm font-medium">Título</label>
          <input id="av-titulo" required placeholder="Ej.: Entrenamiento sábado" class="h-10 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
        <div class="space-y-1.5">
          <label for="av-cuerpo" class="text-sm font-medium">Mensaje</label>
          <textarea id="av-cuerpo" rows="5" required placeholder="Escribí el comunicado..." class="w-full rounded-lg border bg-card p-3 text-sm"></textarea>
        </div>
        <button type="submit" class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-95">
          <i data-lucide="send" class="size-4"></i> Enviar aviso
        </button>
      </form>

      <section>
        <h2 class="mb-3 text-2xl font-bold">Enviados y Conversaciones</h2>
        <ul class="space-y-3">
          ${
            DB.avisos.length === 0
              ? `<li class="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">Todavía no hay avisos ni mensajes enviados.</li>`
              : DB.avisos
                  .map(
                    (a) => `
                  <li class="rounded-xl border bg-card p-5">
                    <div class="flex flex-wrap items-center gap-2 text-xs">
                      <span class="rounded-full px-2 py-0.5 font-medium ${tipoColor[a.tipo] || ''}">${esc(a.tipo)}</span>
                      <span class="text-muted-foreground">${Helpers.fechaCorta(a.fecha)} · ${a.autor === 'atleta' ? `Enviado por <strong>${esc(a.destinatariosLabel || a.destinatarios)}</strong>` : `para <strong>${esc(a.destinatariosLabel || (Array.isArray(a.destinatarios) ? `${a.destinatarios.length} atletas` : a.destinatarios))}</strong>`}</span>
                      ${
                        (a.respuestas || []).length > 0
                          ? `<span class="rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">${a.respuestas.length} respuesta${a.respuestas.length === 1 ? '' : 's'}</span>`
                          : ''
                      }
                      <button type="button" onclick="deleteAviso('${a.id}')" class="ml-auto text-muted-foreground hover:text-destructive" title="Eliminar mensaje">✕</button>
                    </div>
                    <h3 class="mt-2 text-xl font-bold">${esc(a.titulo)}</h3>
                    <p class="mt-1 text-sm text-muted-foreground whitespace-pre-line">${esc(a.cuerpo)}</p>
                    ${renderRepliesSection(a, a.atletaId || '', 'entrenador', false)}
                  </li>
                `
                  )
                  .join('')
          }
        </ul>
      </section>
    </div>
  `;
  return renderCoachShell('avisos', content);
}

window.deleteAviso = (id) => {
  DB.avisos = DB.avisos.filter((a) => a.id !== id);
  saveDB();
  showToast('Aviso eliminado');
  renderApp();
};

window.setAvisoTipo = (t) => {
  State.avisoTipo = t;
  State.avisoDest =
    t === 'Individual'
      ? `${DB.atletas[0].nombre} ${DB.atletas[0].apellido}`
      : 'Todo el grupo';
  renderApp();
};

window.enviarAviso = (e) => {
  e.preventDefault();
  const titulo = document.getElementById('av-titulo').value.trim();
  const cuerpo = document.getElementById('av-cuerpo').value.trim();
  const dest = document.getElementById('av-dest').value;
  if (!titulo || !cuerpo) return;
  const targetAtleta =
    State.avisoTipo === 'Individual'
      ? DB.atletas.find((a) => Helpers.nombreCompleto(a) === dest)
      : null;

  // Calcular la lista de atletaId destinatarios para consultas filtradas
  let destinatariosIds = [];
  if (State.avisoTipo === 'Individual') {
    destinatariosIds = targetAtleta ? [targetAtleta.id] : [];
  } else if (dest === 'Todo el grupo') {
    destinatariosIds = ['TODOS', ...DB.atletas.map((a) => a.id)];
  } else if (dest === 'Menores y juveniles') {
    destinatariosIds = DB.atletas
      .filter(
        (a) =>
          Helpers.edad(a.fechaNacimiento) < 18 ||
          ['Infantiles', 'U12', 'U14', 'U16', 'U18', 'U20'].includes(a.categoria)
      )
      .map((a) => a.id);
  } else if (dest === 'Mayores y Master') {
    destinatariosIds = DB.atletas
      .filter(
        (a) =>
          Helpers.edad(a.fechaNacimiento) >= 18 ||
          ['Mayores', 'Master A', 'Master B', 'Master'].includes(a.categoria)
      )
      .map((a) => a.id);
  } else {
    destinatariosIds = ['TODOS'];
  }

  const total = destinatariosIds.filter((id) => id !== 'TODOS').length || 1;
  DB.avisos.unshift({
    id: `a-${Date.now()}`,
    tipo: State.avisoTipo,
    atletaId: targetAtleta ? targetAtleta.id : null,
    autor: 'entrenador',
    titulo,
    cuerpo,
    fecha: DB.hoy,
    destinatarios: destinatariosIds,
    destinatariosLabel: dest,
    leidos: 0,
    total,
    respuestas: [],
  });
  saveDB();
  showToast(`Aviso enviado a ${dest}`);
  renderApp();
};

/* ---------- Tarjeta compartida de Objetivos y Carreras del Año ---------- */
function renderObjetivosCard(atleta, canEdit = true) {
  const lista = atleta.objetivos || [];
  return `
    <div class="rounded-xl border bg-card p-5">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h3 class="text-xl font-bold">Objetivos y carreras del año</h3>
          <p class="text-xs text-muted-foreground">Metas deportivas y competencias planificadas</p>
        </div>
        ${
          canEdit
            ? `<button
                type="button"
                onclick="openObjetivoModal('${atleta.id}')"
                class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95"
              >
                <i data-lucide="plus" class="size-3.5"></i> Cargar
              </button>`
            : ''
        }
      </div>
      ${
        lista.length === 0
          ? `<div class="mt-3 rounded-lg border border-dashed p-4 text-center">
              <p class="text-sm text-muted-foreground">Sin objetivos ni carreras cargadas aún.</p>
              ${
                canEdit
                  ? `<button type="button" onclick="openObjetivoModal('${atleta.id}')" class="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                      + Agregar carrera u objetivo del año
                    </button>`
                  : ''
              }
            </div>`
          : `<ul class="mt-4 space-y-3">
              ${lista
                .map(
                  (o, idx) => {
                    const oid = o.id || `idx-${idx}`;
                    const isCarrera = o.tipo === 'carrera' || Boolean(o.distancia);
                    return `
                      <li class="rounded-lg border bg-muted/25 p-3">
                        <div class="flex flex-wrap items-center justify-between gap-1.5">
                          <div class="flex flex-wrap items-center gap-1.5">
                            <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isCarrera
                                ? 'bg-primary/15 text-primary'
                                : 'bg-secondary text-secondary-foreground'
                            }">
                              ${isCarrera ? `🏁 Carrera${o.distancia ? ` · ${esc(o.distancia)}` : ''}` : '🎯 Meta deportiva'}
                            </span>
                            ${
                              o.creadoPor
                                ? `<span class="text-[11px] text-muted-foreground">· por ${o.creadoPor === 'atleta' ? 'Atleta' : 'Entrenador'}</span>`
                                : ''
                            }
                          </div>
                          ${
                            canEdit
                              ? `<div class="flex items-center gap-1">
                                  <button type="button" onclick="openObjetivoModal('${atleta.id}', '${oid}')" class="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar">
                                    Editar
                                  </button>
                                  <button type="button" onclick="deleteObjetivo('${atleta.id}', '${oid}')" class="rounded px-1.5 py-0.5 text-xs text-destructive hover:bg-destructive/10" title="Eliminar">
                                    ✕
                                  </button>
                                </div>`
                              : ''
                          }
                        </div>
                        <p class="mt-1.5 text-sm font-bold">${esc(o.texto)}</p>
                        <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          ${o.fecha ? `<span>📅 Fecha: <strong>${Helpers.fechaCorta(o.fecha)}</strong></span>` : ''}
                          ${o.metaTiempo ? `<span>⏱️ Objetivo: <strong>${esc(o.metaTiempo)}</strong></span>` : ''}
                        </div>
                        <div class="mt-2 flex items-center gap-2">
                          <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div class="h-full bg-primary" style="width: ${Math.min(100, Math.max(0, Number(o.progreso) || 0))}%"></div>
                          </div>
                          <span class="text-[11px] font-semibold tabular-nums text-muted-foreground">${Number(o.progreso) || 0}%</span>
                        </div>
                      </li>
                    `;
                  }
                )
                .join('')}
            </ul>`
      }
    </div>
  `;
}

/* ---------- Hilo de Respuestas en Mensajes Directos y Avisos ---------- */
function renderRepliesSection(aviso, atletaId, currentRole, readOnly = false) {
  if (aviso.id === 'mod') return '';
  const respuestas = aviso.respuestas || [];
  const canReply = !readOnly && (aviso.tipo === 'Individual' || currentRole === 'entrenador' || Boolean(atletaId));
  return `
    <div class="mt-3 border-t pt-3 space-y-2.5">
      ${
        respuestas.length > 0
          ? `<div class="space-y-2">
              ${respuestas
                .map(
                  (r) => `
                <div class="rounded-lg px-3.5 py-2.5 text-xs ${
                  r.autorRol === 'entrenador'
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-muted/70 border border-border'
                }">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-bold ${r.autorRol === 'entrenador' ? 'text-primary' : 'text-foreground'}">
                      ${esc(r.autorNombre || (r.autorRol === 'entrenador' ? 'Entrenador' : 'Atleta'))}
                    </span>
                    <span class="text-[11px] text-muted-foreground">${Helpers.fechaCorta(r.fecha)}${r.hora ? ` · ${esc(r.hora)}` : ''}</span>
                  </div>
                  <p class="mt-1 text-sm text-foreground whitespace-pre-line">${esc(r.texto)}</p>
                </div>
              `
                )
                .join('')}
            </div>`
          : ''
      }
      ${
        canReply
          ? `<form onsubmit="responderMensaje(event, '${aviso.id}', '${atletaId || aviso.atletaId || ''}', '${currentRole}')" class="flex gap-2 pt-1">
              <input
                id="reply-input-${aviso.id}-${currentRole}"
                required
                placeholder="${currentRole === 'entrenador' ? 'Escribir respuesta al atleta…' : 'Escribir respuesta a tu entrenador…'}"
                class="h-9 flex-1 rounded-lg border bg-card px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:opacity-95"
              >
                <i data-lucide="reply" class="size-3.5"></i> Responder
              </button>
            </form>`
          : ''
      }
    </div>
  `;
}

function renderMessageThreadCard(m, atletaId, currentRole, readOnly = false) {
  return `
    <div class="rounded-xl border bg-card p-5">
      <div class="flex items-start gap-3">
        <i data-lucide="${m.tipo === 'Individual' ? 'message-square' : 'megaphone'}" class="mt-0.5 size-5 shrink-0 text-primary"></i>
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span class="rounded-full bg-accent px-2 py-0.5 font-semibold text-accent-foreground">
              ${m.tipo === 'Individual' ? 'Mensaje Directo' : esc(m.tipo)}
            </span>
            <span>${Helpers.fechaCorta(m.fecha)}</span>
            ${
              m.autor === 'atleta'
                ? `<span class="font-medium text-primary">· Enviado por ${esc(m.destinatarios)}</span>`
                : `<span class="font-medium">· Entrenador ${esc(DB.equipo.entrenador)}</span>`
            }
            ${
              currentRole === 'entrenador' && m.id !== 'mod'
                ? `<button type="button" onclick="deleteAviso('${m.id}')" class="ml-auto text-muted-foreground hover:text-destructive" title="Eliminar">✕</button>`
                : ''
            }
          </div>
          <h3 class="mt-1.5 text-lg font-bold">${esc(m.titulo)}</h3>
          <p class="mt-1 text-sm text-muted-foreground whitespace-pre-line">${esc(m.cuerpo)}</p>
          ${renderRepliesSection(m, atletaId, currentRole, readOnly)}
        </div>
      </div>
    </div>
  `;
}

window.responderMensaje = (e, avisoId, atletaId, rol) => {
  e.preventDefault();
  const input = document.getElementById(`reply-input-${avisoId}-${rol}`);
  if (!input) return;
  const texto = input.value.trim();
  if (!texto) return;

  const aviso = DB.avisos.find((a) => a.id === avisoId);
  if (!aviso) return;

  const atleta = atletaId ? Helpers.getAtleta(atletaId) : null;
  if (atleta && !aviso.atletaId && aviso.tipo === 'Individual') {
    aviso.atletaId = atleta.id;
  }

  const now = new Date();
  const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const autorNombre =
    rol === 'entrenador'
      ? `Entrenador (${DB.equipo.entrenador || 'Cristian Torres'})`
      : atleta
      ? Helpers.nombreCompleto(atleta)
      : 'Atleta';

  aviso.respuestas = aviso.respuestas || [];
  aviso.respuestas.push({
    id: `rep-${Date.now()}`,
    autorRol: rol,
    autorNombre,
    atletaId: atleta ? atleta.id : null,
    texto,
    fecha: DB.hoy,
    hora,
  });
  aviso.leidos = 1;

  saveDB();
  showToast('Respuesta enviada');
  renderApp();
};

window.enviarMensajeAtletaAlEntrenador = (e, atletaId) => {
  e.preventDefault();
  const asuntoEl = document.getElementById('atl-msg-asunto');
  const cuerpoEl = document.getElementById('atl-msg-cuerpo');
  if (!cuerpoEl) return;
  const cuerpo = cuerpoEl.value.trim();
  const asunto = asuntoEl ? asuntoEl.value.trim() : '';
  if (!cuerpo) return;

  const atleta = Helpers.getAtleta(atletaId);
  if (!atleta) return;

  DB.avisos.unshift({
    id: `a-${Date.now()}`,
    tipo: 'Individual',
    atletaId: atleta.id,
    autor: 'atleta',
    titulo: asunto || `Consulta de ${atleta.nombre} ${atleta.apellido}`,
    cuerpo,
    fecha: DB.hoy,
    destinatarios: Helpers.nombreCompleto(atleta),
    leidos: 0,
    total: 1,
    respuestas: [],
  });

  saveDB();
  showToast('Mensaje enviado a tu entrenador');
  renderApp();
};

/* ==========================================================================
   PORTAL DEL ATLETA Y CUENTA FAMILIAR (AtletaPortal)
   ========================================================================== */

function renderHeroEntrenamientoDia(atleta, sesiones, familia) {
  const diasSemana = Array.isArray(DB.semanaActual) && DB.semanaActual.length === 7
    ? DB.semanaActual
    : [DB.hoy];

  if (!State.portalSelectedDate) {
    State.portalSelectedDate = DB.hoy;
  }

  const sesionDelDia = sesiones.find((s) => s.fecha === State.portalSelectedDate);
  const proximaPendiente =
    sesiones.find((s) => s.fecha >= DB.hoy && s.tipo !== 'Descanso' && s.estado === 'pendiente') ||
    sesiones.find((s) => s.tipo !== 'Descanso' && s.estado === 'pendiente') ||
    sesiones[sesiones.length - 1];

  const sesionActiva = sesionDelDia || (State.portalSelectedDate === DB.hoy ? proximaPendiente : null);
  const esHoySeleccionado = State.portalSelectedDate === DB.hoy;
  const carasLabels = [
    '',
    '1 · Muy suave 😣',
    '2 · Cómodo 😕',
    '3 · Moderado 😐',
    '4 · Exigente 🙂',
    '5 · Al máximo 💪',
  ];

  // Tira táctil de los 7 días de la semana (ideal para celular)
  const tiraSemanaHtml = `
    <div class="rounded-2xl border bg-card p-3 shadow-xs">
      <div class="mb-2 flex items-center justify-between px-1">
        <span class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          📅 Tu semana de entrenamiento (tocá un día)
        </span>
        ${
          !esHoySeleccionado
            ? `<button type="button" onclick="State.portalSelectedDate = '${DB.hoy}'; renderApp()" class="text-xs font-bold text-primary hover:underline">
                Volver a HOY
              </button>`
            : `<span class="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">Viendo HOY</span>`
        }
      </div>
      <div class="grid grid-cols-7 gap-1.5">
        ${diasSemana
          .map((iso) => {
            const d = Helpers.diaSemana(iso);
            const ses = sesiones.find((s) => s.fecha === iso);
            const isSelected = State.portalSelectedDate === iso;
            const isToday = iso === DB.hoy;
            let dotCls = 'bg-muted-foreground/25';
            if (ses) {
              if (ses.tipo === 'Descanso') dotCls = 'bg-muted-foreground/40';
              else if (ses.estado === 'realizado') dotCls = 'bg-success';
              else if (ses.estado === 'no-realizado') dotCls = 'bg-destructive';
              else dotCls = 'bg-primary';
            }
            return `
              <button
                type="button"
                onclick="State.portalSelectedDate = '${iso}'; renderApp()"
                class="flex flex-col items-center justify-center rounded-xl border py-2 px-1 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm scale-[1.02]'
                    : isToday
                    ? 'border-primary/50 bg-primary/5 text-foreground'
                    : 'bg-card hover:bg-muted text-foreground'
                }"
              >
                <span class="text-[10px] font-bold uppercase ${isSelected ? 'text-primary-foreground/90' : isToday ? 'text-primary' : 'text-muted-foreground'}">
                  ${isToday ? 'HOY' : d.dia}
                </span>
                <span class="font-display text-xl font-extrabold leading-tight">${d.num}</span>
                <span class="mt-1 size-2 rounded-full ${isSelected ? 'bg-white' : dotCls}"></span>
              </button>
            `;
          })
          .join('')}
      </div>
    </div>
  `;

  if (!sesionActiva) {
    const dSel = Helpers.diaSemana(State.portalSelectedDate);
    return `
      <div class="space-y-3">
        ${tiraSemanaHtml}
        <section class="rounded-2xl border-2 border-dashed bg-card p-6 text-center">
          <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            ${dSel.dia} ${dSel.num} de ${dSel.mes}
          </p>
          <h2 class="mt-1 text-xl font-bold">Sin sesión asignada para este día</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            No hay un entrenamiento cargado en esta fecha.
          </p>
          ${
            proximaPendiente
              ? `<button
                  type="button"
                  onclick="State.portalSelectedDate = '${proximaPendiente.fecha}'; renderApp()"
                  class="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-95"
                >
                  Ver próximo entrenamiento (${Helpers.fechaCorta(proximaPendiente.fecha)}) →
                </button>`
              : ''
          }
        </section>
      </div>
    `;
  }

  const dAct = Helpers.diaSemana(sesionActiva.fecha);
  const esFechaHoy = sesionActiva.fecha === DB.hoy;
  const esDescanso = sesionActiva.tipo === 'Descanso';

  return `
    <div class="space-y-3">
      ${tiraSemanaHtml}

      <section class="overflow-hidden rounded-2xl border-2 ${
        sesionActiva.estado === 'realizado'
          ? 'border-success/60 bg-card'
          : sesionActiva.estado === 'no-realizado'
          ? 'border-destructive/50 bg-card'
          : 'border-primary bg-card shadow-md'
      }">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b ${
          sesionActiva.estado === 'realizado'
            ? 'bg-success-soft/60'
            : 'bg-primary/10'
        } px-4 py-3 sm:px-5">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-primary-foreground">
              <i data-lucide="flame" class="size-3.5"></i>
              ${esFechaHoy ? 'Entrenamiento de HOY' : `Sesión del ${dAct.dia} ${dAct.num} ${dAct.mes}`}
            </span>
            ${
              sesionActiva.disciplina
                ? `<span class="inline-flex items-center rounded-lg border border-primary/30 bg-card px-2.5 py-1 text-xs font-bold text-primary">
                    🏃 ${esc(sesionActiva.disciplina)}
                  </span>`
                : ''
            }
          </div>
          <div class="flex items-center gap-2">
            ${sesionActiva.intensidad ? renderIntensidadChip(sesionActiva.intensidad) : ''}
            ${renderEstadoSesionBadge(sesionActiva.estado)}
          </div>
        </div>

        <div class="p-4 sm:p-6 space-y-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              ${esc(sesionActiva.tipo || 'Entrenamiento')} · ${Helpers.fechaCorta(sesionActiva.fecha)}
            </p>
            <h2 class="mt-1 font-display text-3xl font-extrabold uppercase leading-tight sm:text-4xl">
              ${esc(sesionActiva.titulo)}
            </h2>
          </div>

          ${
            sesionActiva.detalle
              ? `<div class="rounded-xl border bg-muted/35 p-4">
                  <p class="text-[11px] font-bold uppercase tracking-wide text-primary">
                    📋 Desarrollo e indicaciones de tu entrenador
                  </p>
                  <p class="mt-1.5 text-base font-medium leading-relaxed text-foreground whitespace-pre-line">${esc(sesionActiva.detalle)}</p>
                </div>`
              : ''
          }

          ${
            sesionActiva.distanciaKm || sesionActiva.duracionMin || sesionActiva.ritmo || sesionActiva.series || sesionActiva.recuperacion
              ? `<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  ${
                    sesionActiva.distanciaKm
                      ? `<div class="rounded-xl border bg-card p-3">
                          <p class="text-[11px] font-semibold uppercase text-muted-foreground">Distancia</p>
                          <p class="mt-0.5 font-display text-2xl font-bold tabular-nums">${esc(sesionActiva.distanciaKm)} km</p>
                        </div>`
                      : ''
                  }
                  ${
                    sesionActiva.duracionMin
                      ? `<div class="rounded-xl border bg-card p-3">
                          <p class="text-[11px] font-semibold uppercase text-muted-foreground">Duración</p>
                          <p class="mt-0.5 font-display text-2xl font-bold tabular-nums">${esc(sesionActiva.duracionMin)} min</p>
                        </div>`
                      : ''
                  }
                  ${
                    sesionActiva.ritmo
                      ? `<div class="rounded-xl border bg-card p-3">
                          <p class="text-[11px] font-semibold uppercase text-muted-foreground">Ritmo / Marca obj.</p>
                          <p class="mt-0.5 font-display text-2xl font-bold tabular-nums text-primary">${esc(sesionActiva.ritmo)}</p>
                        </div>`
                      : ''
                  }
                  ${
                    sesionActiva.series
                      ? `<div class="rounded-xl border bg-card p-3 col-span-2 sm:col-span-1">
                          <p class="text-[11px] font-semibold uppercase text-muted-foreground">Series / Pasadas</p>
                          <p class="mt-0.5 text-sm font-bold leading-snug">${esc(sesionActiva.series)}</p>
                        </div>`
                      : ''
                  }
                  ${
                    sesionActiva.recuperacion
                      ? `<div class="rounded-xl border bg-card p-3 col-span-2">
                          <p class="text-[11px] font-semibold uppercase text-muted-foreground">Recuperación / Pausa</p>
                          <p class="mt-0.5 text-sm font-semibold">${esc(sesionActiva.recuperacion)}</p>
                        </div>`
                      : ''
                  }
                </div>`
              : ''
          }

          ${
            !esDescanso && !familia
              ? sesionActiva.estado === 'pendiente'
                ? `<div class="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div class="flex items-start gap-2.5">
                      <div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                        !
                      </div>
                      <div>
                        <p class="text-sm font-bold text-foreground">¿Ya terminaste el entrenamiento?</p>
                        <p class="text-xs text-muted-foreground">
                          Tocá el botón verde para informarle al entrenador tus tiempos, marcas logradas y cómo te sentiste hoy.
                        </p>
                      </div>
                    </div>
                    <div class="grid gap-2.5 sm:grid-cols-[1fr_auto]">
                      <button
                        type="button"
                        onclick="openRegistroModal('${atleta.id}', '${sesionActiva.id}', true)"
                        class="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-base font-extrabold text-primary-foreground shadow-sm transition-transform active:scale-[0.99] hover:opacity-95"
                      >
                        <i data-lucide="check-circle-2" class="size-5"></i>
                        ¡Completé el entrenamiento! · Informar resultados
                      </button>
                      <button
                        type="button"
                        onclick="openRegistroModal('${atleta.id}', '${sesionActiva.id}', false)"
                        class="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-card px-4 py-3 text-xs font-bold text-destructive hover:bg-destructive/10"
                      >
                        ✕ Hoy no pude entrenar
                      </button>
                    </div>
                  </div>`
                : `<div class="rounded-2xl border ${
                    sesionActiva.estado === 'realizado'
                      ? 'border-success/40 bg-success-soft/40'
                      : 'border-destructive/40 bg-destructive/10'
                  } p-4 space-y-2">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="text-xs font-extrabold uppercase tracking-wide ${
                        sesionActiva.estado === 'realizado' ? 'text-success' : 'text-destructive'
                      }">
                        ${
                          sesionActiva.estado === 'realizado'
                            ? '✓ Entrenamiento informado a tu entrenador'
                            : '✕ Informaste que no pudiste realizar esta sesión'
                        }
                      </p>
                      <button
                        type="button"
                        onclick="openRegistroModal('${atleta.id}', '${sesionActiva.id}')"
                        class="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                      >
                        <i data-lucide="pencil" class="size-3.5"></i> Editar informe enviado
                      </button>
                    </div>
                    ${
                      sesionActiva.resultadoReal || sesionActiva.distanciaRealKm || sesionActiva.tiempoRealMin
                        ? `<p class="text-sm font-bold text-foreground">
                            📊 Resultado informado: ${esc(sesionActiva.resultadoReal || 'Completado')}
                            ${sesionActiva.distanciaRealKm ? ` · ${esc(sesionActiva.distanciaRealKm)} km` : ''}
                            ${sesionActiva.tiempoRealMin ? ` · ${esc(sesionActiva.tiempoRealMin)} min` : ''}
                          </p>`
                        : ''
                    }
                    ${
                      sesionActiva.sensacion
                        ? `<p class="text-xs font-semibold text-foreground">
                            Esfuerzo percibido: <span class="font-bold">${carasLabels[sesionActiva.sensacion] || `${sesionActiva.sensacion}/5`}</span>
                          </p>`
                        : ''
                    }
                    ${
                      sesionActiva.comentario
                        ? `<p class="text-sm text-muted-foreground">💬 “${esc(sesionActiva.comentario)}”</p>`
                        : ''
                    }
                  </div>`
              : ''
          }
        </div>
      </section>
    </div>
  `;
}

function viewAtletaPortal(atletaId, modoFamilia = false) {
  const session = typeof Auth.verifyCurrentSession === 'function' ? Auth.verifyCurrentSession() : Auth.getSession();
  const isCoachPreview = session && session.role === 'coach';
  const atleta = Helpers.getAtleta(atletaId) || DB.atletas[0];
  const familia = modoFamilia ? atleta.tutor || { nombre: 'Tutor autorizado', vinculo: 'Familia' } : null;
  const sesiones = Helpers.getPlan(atleta.id);
  const pagos = Helpers.getPagos(atleta.id);
  const deuda = pagos.filter((p) => p.estado !== 'pagado').reduce((t, p) => t + p.monto, 0);
  const proxima = DB.competencias.find((c) => c.inscriptos.includes(atleta.id));
  const sugeridas = DB.competencias.filter((c) => c.sugeridos.includes(atleta.id));
  const kmPlan = sesiones.reduce((t, s) => t + (s.distanciaKm || 0), 0);
  const kmHechos = sesiones.filter((s) => s.estado === 'realizado').reduce((t, s) => t + (s.distanciaKm || 0), 0);

  const mensajes = [
    ...(sesiones.some((s) => s.modificada)
      ? [
          {
            id: 'mod',
            tipo: 'Entrenamiento',
            titulo: 'Tu plan fue modificado',
            cuerpo: 'Revisá el entrenamiento de esta semana: tu entrenador actualizó la sesión.',
            fecha: DB.hoy,
            respuestas: [],
          },
        ]
      : []),
    ...(DB.avisos || []).filter(
      (av) =>
        av.atletaId === atleta.id ||
        (Array.isArray(av.destinatarios)
          ? av.destinatarios.includes(atleta.id) || av.destinatarios.includes('TODOS')
          : av.destinatarios === Helpers.nombreCompleto(atleta) || av.tipo !== 'Individual')
    ),
  ];

  let tabBody = '';
  const sugeridasCardHtml =
    sugeridas.length > 0
      ? `<section class="rounded-xl border border-primary/40 bg-accent/50 p-5">
          <h2 class="flex items-center gap-2 text-xl font-bold">
            <i data-lucide="target" class="size-5 text-primary"></i> Tu entrenador te sugiere
          </h2>
          <ul class="mt-3 space-y-2.5">
            ${sugeridas
              .map(
                (c) => `
              <li class="rounded-lg bg-card p-3">
                <p class="font-semibold">${esc(c.nombre)}</p>
                <p class="flex items-center gap-1 text-xs text-muted-foreground">
                  <i data-lucide="calendar-days" class="size-3.5"></i> ${Helpers.fechaCorta(c.fecha)} · ${esc(c.lugar)} · ${esc(c.distancias.join(' / '))}
                </p>
                ${
                  !familia
                    ? `<button type="button" onclick="inscribirCompetencia('${c.id}', '${atleta.id}')" class="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:opacity-95">
                        ✓ Confirmar participación
                      </button>`
                    : ''
                }
              </li>
            `
              )
              .join('')}
          </ul>
        </section>`
      : '';

  if (State.portalTab === 'semana') {
    const sesionesFiltradas = filtrarSesionesPorPeriodo(sesiones, State.planFiltro);
    const filtrosPlan = [
      { id: 'semana', label: 'Esta Semana' },
      { id: 'mes', label: 'Mes' },
      { id: 'todas', label: 'Todas' },
      { id: 'dia', label: 'Solo Hoy' },
    ];
    tabBody = `
      <div class="grid gap-6 lg:grid-cols-[1fr_23rem]">
        <div class="space-y-5">
          ${renderHeroEntrenamientoDia(atleta, sesiones, familia)}

          <div class="space-y-3 pt-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-lg font-bold">Cronograma completo de sesiones</h3>
              <div class="flex gap-1 rounded-lg bg-muted p-1">
                ${filtrosPlan
                  .map(
                    (f) => `
                  <button
                    type="button"
                    onclick="State.planFiltro = '${f.id}'; renderApp()"
                    class="rounded-md px-3 py-1 text-xs font-semibold ${
                      State.planFiltro === f.id ? 'bg-card shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }"
                  >
                    ${f.label}
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>
            ${
              sesionesFiltradas.length === 0
                ? `<div class="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                    No hay entrenamientos cargados para este período.
                  </div>`
                : sesionesFiltradas
                    .map((s) =>
                      renderSessionCard(
                        s,
                        !familia && s.tipo !== 'Descanso'
                          ? `<div class="mt-3 flex flex-wrap gap-2">
                              <button type="button" onclick="openRegistroModal('${atleta.id}', '${s.id}', true)" class="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold ${
                                s.estado === 'pendiente'
                                  ? 'bg-primary text-primary-foreground shadow-2xs'
                                  : 'border bg-card hover:bg-muted text-foreground'
                              }">
                                <i data-lucide="clipboard-check" class="size-3.5"></i>
                                ${s.estado === 'pendiente' ? 'Informar resultados al entrenador' : 'Editar informe y resultados'}
                              </button>
                            </div>`
                          : ''
                      )
                    )
                    .join('')
            }
          </div>
        </div>
        <aside class="space-y-4">
          ${sugeridasCardHtml}
          ${renderObjetivosCard(atleta, !familia)}
        </aside>
      </div>
    `;
  } else if (State.portalTab === 'resultados') {
    tabBody = `
      <div class="grid gap-6 lg:grid-cols-[1fr_23rem]">
        <div class="space-y-6">
          <section>
            <h2 class="text-2xl font-bold">Mis marcas</h2>
            <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              ${(atleta.marcas || [])
                .map(
                  (m) => `
                <div class="rounded-xl border bg-card p-4">
                  <p class="text-sm font-semibold text-primary">${esc(m.distancia)}</p>
                  <p class="font-display text-3xl font-bold tabular-nums">${esc(m.tiempo)}</p>
                  <p class="mt-1 text-xs text-muted-foreground">${Helpers.fechaCorta(m.fecha)}</p>
                </div>
              `
                )
                .join('')}
            </div>
          </section>
          <section class="rounded-xl border bg-card">
            <h2 class="border-b px-5 py-4 text-2xl font-bold">Historial</h2>
            <ul class="divide-y">
              ${(atleta.resultados || [])
                .map(
                  (r) => `
                <li class="flex items-center gap-4 px-5 py-3">
                  <div class="flex-1">
                    <p class="font-medium">${esc(r.competencia)}</p>
                    <p class="text-xs text-muted-foreground">
                      ${Helpers.fechaCorta(r.fecha)} · ${esc(r.distancia)} · ${r.posCategoria}° en categoría
                    </p>
                  </div>
                  <span class="font-display text-2xl font-bold tabular-nums">${esc(r.tiempo)}</span>
                </li>
              `
                )
                .join('')}
            </ul>
          </section>
        </div>
        <div class="space-y-4">
          ${renderObjetivosCard(atleta, !familia)}
          <section class="rounded-xl border bg-card p-5">
            <h2 class="text-xl font-bold">Mi evolución</h2>
            <div class="mt-3">${renderPaceChart(atleta.evolucion)}</div>
          </section>
          ${sugeridasCardHtml}
        </div>
      </div>
    `;
  } else if (State.portalTab === 'pagos') {
    tabBody = `
      <section class="max-w-3xl rounded-xl border bg-card">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
          <div>
            <h2 class="text-2xl font-bold">Mis pagos</h2>
            <p class="text-xs text-muted-foreground">Podés informar un pago adjuntando la foto del comprobante de transferencia o marcándolo en efectivo.</p>
          </div>
          <p class="text-sm">
            Saldo:
            <span class="${deuda > 0 ? 'font-semibold text-destructive' : 'font-semibold text-success'}">
              ${deuda > 0 ? Helpers.pesos(deuda) : 'al día'}
            </span>
          </p>
        </div>
        ${
          pagos.length === 0
            ? `<div class="p-8 text-center text-sm text-muted-foreground">No tenés cobros ni cuotas pendientes.</div>`
            : `<ul class="divide-y">
                ${pagos
                  .map(
                    (p) => `
                  <li class="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <div class="min-w-0 flex-1">
                      <p class="font-medium">${esc(p.detalle)}</p>
                      <p class="text-xs text-muted-foreground">
                        <span class="font-semibold text-foreground">${esc(p.concepto)}</span> · ${
                      p.estado === 'pagado' && p.fechaPago
                        ? `pagado el ${Helpers.fechaCorta(p.fechaPago)}`
                        : `vence ${Helpers.fechaCorta(p.vencimiento)}`
                    }
                        ${
                          p.estado === 'pagado' && p.medioPago
                            ? ` · <span class="font-semibold text-foreground">${p.medioPago === 'efectivo' ? '💵 Efectivo' : '💸 Transferencia'}</span>`
                            : ''
                        }
                        ${p.notaPago ? ` · <em>“${esc(p.notaPago)}”</em>` : ''}
                      </p>
                    </div>
                    <span class="font-semibold tabular-nums">${Helpers.pesos(p.monto)}</span>
                    ${renderEstadoPagoBadge(p.estado, p.motivoRechazo)}
                    <div class="inline-flex flex-wrap items-center gap-1.5">
                      ${
                        p.comprobanteDataUrl
                          ? `<button type="button" onclick="verComprobanteModal('${p.id}')" class="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20">
                              📎 Ver comprobante
                            </button>`
                          : ''
                      }
                      ${
                        p.estado === 'pagado'
                          ? `<button type="button" onclick="openRegistrarPagoModal('${p.id}')" class="rounded-lg border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                              ${p.comprobanteDataUrl ? 'Cambiar comprobante' : '+ Adjuntar comprobante'}
                            </button>`
                          : p.estado === 'informado'
                          ? `<button type="button" onclick="openRegistrarPagoModal('${p.id}')" class="rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100">
                              Reenviar comprobante / Editar
                            </button>`
                          : p.estado === 'rechazado'
                          ? `<button type="button" onclick="openRegistrarPagoModal('${p.id}')" class="inline-flex items-center gap-1 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-95">
                              Informar pago nuevamente
                            </button>`
                          : `<button type="button" onclick="openRegistrarPagoModal('${p.id}')" class="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95">
                              Informar pago
                            </button>`
                      }
                    </div>
                  </li>
                `
                  )
                  .join('')}
              </ul>`
        }
      </section>
    `;
  } else if (State.portalTab === 'avisos') {
    tabBody = `
      <div class="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div class="space-y-3">
          <h2 class="text-2xl font-bold">Mensajes directos y avisos</h2>
          ${
            mensajes.length === 0
              ? `<div class="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
                  No tenés mensajes ni avisos por el momento.
                </div>`
              : mensajes.map((m) => renderMessageThreadCard(m, atleta.id, 'atleta', Boolean(familia))).join('')
          }
        </div>
        ${
          !familia
            ? `<section class="rounded-xl border bg-card p-5 h-fit">
                <h3 class="text-xl font-bold">Escribir a mi entrenador</h3>
                <p class="mt-1 text-xs text-muted-foreground">
                  Enviá una consulta o mensaje directo a ${esc(DB.equipo.entrenador)}.
                </p>
                <form onsubmit="enviarMensajeAtletaAlEntrenador(event, '${atleta.id}')" class="mt-4 space-y-3">
                  <div>
                    <label class="text-xs font-medium">Asunto</label>
                    <input
                      id="atl-msg-asunto"
                      placeholder="Ej.: Consulta sobre el entrenamiento"
                      class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label class="text-xs font-medium">Mensaje</label>
                    <textarea
                      id="atl-msg-cuerpo"
                      rows="4"
                      required
                      placeholder="Hola profe, te quería comentar que…"
                      class="mt-1 w-full rounded-lg border bg-card p-3 text-sm"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-95"
                  >
                    <i data-lucide="send" class="size-4"></i> Enviar mensaje al entrenador
                  </button>
                </form>
              </section>`
            : ''
        }
      </div>
    `;
  }

  return `
    <div class="min-h-screen bg-background">
      ${
        isCoachPreview
          ? `<div class="bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              <div class="mx-auto flex max-w-content items-center justify-between">
                <span>Vista previa del Entrenador · Viendo portal de ${esc(Helpers.nombreCompleto(atleta))}</span>
                <a href="#/entrenador/atletas/${atleta.id}" class="underline">← Volver a la ficha</a>
              </div>
            </div>`
          : ''
      }
      <header class="bg-ink text-ink-foreground">
        <div class="mx-auto flex h-14 max-w-content items-center justify-between px-4 sm:px-6">
          ${renderLogo({ invert: true, className: 'text-xl' })}
          <div class="flex items-center gap-2">
            <div data-cloud-badge>${CloudSync.renderBadgeHtml()}</div>
            <button
              type="button"
              onclick="Auth.logout()"
              class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-ink-foreground/80 hover:bg-white/10 hover:text-ink-foreground"
            >
              <i data-lucide="log-out" class="size-4"></i> Salir
            </button>
          </div>
        </div>
        <div class="track-lines">
          <div class="mx-auto max-w-content px-4 pb-8 pt-6 sm:px-6">
            ${
              familia
                ? `<p class="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
                    <i data-lucide="shield-check" class="size-4 text-brand-lime"></i>
                    Cuenta familiar de ${esc(familia.nombre)} (${esc(familia.vinculo)}) · Solo lectura
                  </p>`
                : ''
            }
            <p class="text-sm text-ink-foreground/70">${familia ? 'Seguimiento de' : 'Hola,'}</p>
            <h1 class="font-display text-5xl font-extrabold uppercase leading-none">
              ${familia ? esc(`${atleta.nombre} ${atleta.apellido}`) : esc(atleta.nombre)}
            </h1>
            <p class="mt-1 text-sm text-ink-foreground/70">
              ${esc(atleta.categoria)} · ${Helpers.edad(atleta.fechaNacimiento)} años
            </p>

            <div class="mt-6 grid gap-3 sm:grid-cols-3">
              <div class="rounded-xl bg-white/10 p-4">
                <p class="text-xs uppercase tracking-wide text-ink-foreground/60">Semana</p>
                <p class="font-display text-3xl font-bold tabular-nums">
                  ${kmHechos}<span class="text-lg text-ink-foreground/60"> / ${kmPlan} km</span>
                </p>
                <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                  <div class="h-full bg-brand-lime" style="width: ${Math.min(100, (kmHechos / Math.max(kmPlan, 1)) * 100)}%"></div>
                </div>
              </div>
              <div class="rounded-xl bg-white/10 p-4">
                <p class="text-xs uppercase tracking-wide text-ink-foreground/60">Próxima carrera</p>
                ${
                  proxima
                    ? `<p class="font-display text-3xl font-bold tabular-nums">${Helpers.diasHasta(proxima.fecha)} días</p>
                       <p class="truncate text-sm text-ink-foreground/70">${esc(proxima.nombre)}</p>`
                    : `<p class="mt-1 text-sm text-ink-foreground/70">Sin inscripciones</p>`
                }
              </div>
              <div class="rounded-xl bg-white/10 p-4">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs uppercase tracking-wide text-ink-foreground/60">Objetivo / Carrera</p>
                  ${
                    !familia
                      ? `<button type="button" onclick="openObjetivoModal('${atleta.id}')" class="rounded bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-ink-foreground hover:bg-white/25">
                          + Cargar
                        </button>`
                      : ''
                  }
                </div>
                <p class="mt-1 line-clamp-2 font-semibold">
                  ${esc(
                    atleta.objetivos[0]
                      ? `${atleta.objetivos[0].texto}${atleta.objetivos[0].distancia ? ` (${atleta.objetivos[0].distancia})` : ''}`
                      : 'Sin objetivos cargados aún'
                  )}
                </p>
                <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                  <div class="h-full bg-brand-lime" style="width: ${atleta.objetivos[0]?.progreso || 0}%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div class="mx-auto max-w-content px-4 sm:px-6 pb-24 sm:pb-8">
        <div class="hidden sm:flex gap-2 overflow-x-auto border-b">
          ${[
            ['semana', 'Mi semana y Objetivos'],
            ['resultados', 'Resultados y Carreras'],
            ['pagos', 'Pagos'],
            ['avisos', 'Mensajes y Avisos'],
          ]
            .map(
              ([v, l]) => `
            <button
              type="button"
              onclick="State.portalTab = '${v}'; renderApp()"
              class="inline-flex items-center gap-2 border-b-2 px-3 py-3 text-base font-medium transition-colors ${
                State.portalTab === v
                  ? 'border-primary text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }"
            >
              ${l}
              ${v === 'pagos' && deuda > 0 ? `<span class="size-2 rounded-full bg-destructive"></span>` : ''}
            </button>
          `
            )
            .join('')}
        </div>
        <div class="py-4 sm:py-6">${tabBody}</div>
      </div>

      <!-- Barra de Navegación Inferior Fija para Móviles (Estilo App Nativa) -->
      <nav class="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-2 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex items-center justify-around">
        ${[
          { id: 'semana', label: 'Hoy / Plan', icon: 'flame' },
          { id: 'resultados', label: 'Mis Marcas', icon: 'trophy' },
          { id: 'pagos', label: 'Mis Pagos', icon: 'wallet', badge: deuda > 0 },
          { id: 'avisos', label: 'Mensajes', icon: 'message-square' },
        ]
          .map((item) => {
            const isAct = State.portalTab === item.id;
            return `
              <button
                type="button"
                onclick="State.portalTab = '${item.id}'; renderApp()"
                class="flex flex-1 flex-col items-center justify-center py-1 relative transition-colors ${
                  isAct ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground font-medium'
                }"
              >
                <div class="relative">
                  <i data-lucide="${item.icon}" class="size-5 ${isAct ? 'stroke-[2.5]' : 'stroke-[1.8]'}"></i>
                  ${item.badge ? `<span class="absolute -top-1 -right-1 size-2 rounded-full bg-destructive ring-2 ring-card"></span>` : ''}
                </div>
                <span class="mt-1 text-[11px] font-semibold tracking-tight leading-none">${item.label}</span>
              </button>
            `;
          })
          .join('')}
      </nav>
    </div>
  `;
}

/* ==========================================================================
   MODALES INTERACTIVOS Y CONFIGURACIÓN DE NUBE / BACKUPS
   ========================================================================== */

function closeModal() {
  const m = document.getElementById('modal-root');
  if (m) m.innerHTML = '';
}
window.closeModal = closeModal;

function showModalHtml(innerHtml, maxWidthCls = 'max-w-lg') {
  let root = document.getElementById('modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'modal-root';
    document.body.appendChild(root);
  }
  root.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onclick="closeModal()">
      <div class="modal-panel max-h-[90vh] w-full ${maxWidthCls} overflow-y-auto rounded-xl border bg-card p-6 shadow-xl" onclick="event.stopPropagation()">
        ${innerHtml}
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}

// Modal para cargar o editar Objetivos y Carreras del Año (usado tanto por Entrenador como por Atleta)
window.openObjetivoModal = (atletaId, objId = null) => {
  const atleta = Helpers.getAtleta(atletaId);
  if (!atleta) return;
  atleta.objetivos = atleta.objetivos || [];

  let existing = null;
  if (objId) {
    existing = atleta.objetivos.find((o, idx) => (o.id || `idx-${idx}`) === objId) || null;
  }

  const tipoActual = existing?.tipo || 'carrera';
  const textoActual = existing?.texto || '';
  const distanciaActual = existing?.distancia || '10K';
  const fechaActual = existing?.fecha || DB.hoy;
  const metaTiempoActual = existing?.metaTiempo || '';
  const progresoActual = existing ? Number(existing.progreso) || 0 : 25;
  const distanciasSugeridas = ['', '80 m', '150 m', '300 m', '600 m', '800 m', '1500 m', '3000 m', '5K', '10K', '15K', '21K', '42K', 'Cross Country', 'Trail'];

  showModalHtml(
    `
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold">${existing ? 'Editar objetivo / carrera' : 'Cargar objetivo o carrera del año'}</h2>
        <p class="text-sm text-muted-foreground">Planificación anual de ${esc(atleta.nombre)} ${esc(atleta.apellido)}</p>
      </div>
      <button type="button" onclick="closeModal()" class="text-muted-foreground hover:text-foreground">✕</button>
    </div>

    <form onsubmit="saveObjetivo(event, '${atleta.id}', '${objId || ''}')" class="mt-4 space-y-4">
      <div>
        <label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo de objetivo</label>
        <div class="mt-1.5 grid grid-cols-2 gap-2">
          <label class="flex cursor-pointer items-center gap-2 rounded-lg border bg-card p-3 text-sm font-semibold hover:bg-muted">
            <input type="radio" name="obj-tipo" value="carrera" ${tipoActual === 'carrera' ? 'checked' : ''} class="accent-primary" />
            <span>🏁 Carrera / Competencia</span>
          </label>
          <label class="flex cursor-pointer items-center gap-2 rounded-lg border bg-card p-3 text-sm font-semibold hover:bg-muted">
            <input type="radio" name="obj-tipo" value="meta" ${tipoActual === 'meta' ? 'checked' : ''} class="accent-primary" />
            <span>🎯 Meta deportiva</span>
          </label>
        </div>
      </div>

      ${
        DB.competencias.length > 0
          ? `<div class="rounded-lg bg-muted/50 p-3">
              <label class="text-xs font-medium text-muted-foreground">¿Elegir una carrera del calendario del equipo? (opcional)</label>
              <select onchange="fillObjetivoFromCalendario(this.value)" class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-xs">
                <option value="">Escribir manualmente o seleccionar de la lista…</option>
                ${DB.competencias
                  .map(
                    (c) =>
                      `<option value="${c.id}">${esc(c.nombre)} (${Helpers.fechaCorta(c.fecha)} · ${esc((c.distancias || []).join('/'))})</option>`
                  )
                  .join('')}
              </select>
            </div>`
          : ''
      }

      <div>
        <label class="text-xs font-medium">Nombre de la carrera u objetivo del año *</label>
        <input
          id="obj-texto"
          required
          value="${esc(textoActual)}"
          placeholder="Ej.: Corrida Aniversario Valcheta / Campeonato Provincial / Bajar marca en 5K"
          class="mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium">Distancia / Prueba</label>
          <input
            id="obj-distancia"
            list="obj-distancias-list"
            value="${esc(distanciaActual)}"
            placeholder="Ej.: 10K, 5K, 1500 m"
            class="mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm"
          />
          <datalist id="obj-distancias-list">
            ${distanciasSugeridas.map((d) => `<option value="${esc(d)}"></option>`).join('')}
          </datalist>
        </div>
        <div>
          <label class="text-xs font-medium">Fecha de la carrera / meta *</label>
          <input
            id="obj-fecha"
            type="date"
            required
            value="${esc(fechaActual)}"
            class="mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium">Meta o tiempo esperado (opcional)</label>
          <input
            id="obj-meta"
            value="${esc(metaTiempoActual)}"
            placeholder="Ej.: Participar / Sub 45:00 / Podio"
            class="mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm"
          />
        </div>
        <div>
          <label class="text-xs font-medium">Progreso actual (<span id="obj-prog-val">${progresoActual}</span>%)</label>
          <input
            id="obj-progreso"
            type="range"
            min="0"
            max="100"
            step="5"
            value="${progresoActual}"
            oninput="document.getElementById('obj-prog-val').textContent = this.value"
            class="mt-3 w-full accent-primary"
          />
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal()" class="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
          Cancelar
        </button>
        <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">
          Guardar objetivo
        </button>
      </div>
    </form>
  `
  );
};

window.fillObjetivoFromCalendario = (compId) => {
  if (!compId) return;
  const comp = DB.competencias.find((c) => c.id === compId);
  if (!comp) return;
  const txtEl = document.getElementById('obj-texto');
  const distEl = document.getElementById('obj-distancia');
  const fecEl = document.getElementById('obj-fecha');
  if (txtEl) txtEl.value = `${comp.nombre} (${comp.lugar})`;
  if (distEl && comp.distancias && comp.distancias.length) distEl.value = comp.distancias[0];
  if (fecEl && comp.fecha) fecEl.value = comp.fecha;
};

window.saveObjetivo = (e, atletaId, objId = '') => {
  e.preventDefault();
  const atleta = Helpers.getAtleta(atletaId);
  if (!atleta) return;
  atleta.objetivos = atleta.objetivos || [];

  const tipoRadio = document.querySelector('input[name="obj-tipo"]:checked');
  const tipo = tipoRadio ? tipoRadio.value : 'carrera';
  const texto = document.getElementById('obj-texto').value.trim();
  const distancia = document.getElementById('obj-distancia').value.trim();
  const fecha = document.getElementById('obj-fecha').value;
  const metaTiempo = document.getElementById('obj-meta').value.trim();
  const progreso = Number(document.getElementById('obj-progreso').value) || 0;

  if (!texto) return;

  const session = typeof Auth.verifyCurrentSession === 'function' ? Auth.verifyCurrentSession() : Auth.getSession();
  const creadoPor = session && session.role === 'coach' ? 'entrenador' : 'atleta';

  if (objId) {
    const idx = atleta.objetivos.findIndex((o, i) => (o.id || `idx-${i}`) === objId);
    if (idx >= 0) {
      atleta.objetivos[idx] = {
        ...atleta.objetivos[idx],
        id: atleta.objetivos[idx].id || `obj-${Date.now()}`,
        tipo,
        texto,
        distancia,
        fecha,
        metaTiempo,
        progreso,
      };
    }
  } else {
    atleta.objetivos.push({
      id: `obj-${Date.now()}`,
      tipo,
      texto,
      distancia,
      fecha,
      metaTiempo,
      progreso,
      creadoPor,
    });
  }

  // Ordenar objetivos por fecha más próxima
  atleta.objetivos.sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));

  saveDB();
  closeModal();
  showToast(objId ? 'Objetivo actualizado' : 'Objetivo / carrera cargada con éxito');
  renderApp();
};

window.deleteObjetivo = (atletaId, objId) => {
  const atleta = Helpers.getAtleta(atletaId);
  if (!atleta || !Array.isArray(atleta.objetivos)) return;
  atleta.objetivos = atleta.objetivos.filter((o, idx) => (o.id || `idx-${idx}`) !== objId);
  saveDB();
  showToast('Objetivo eliminado');
  renderApp();
};

// Modal con la Tabla Completa de la Nómina Oficial y Credenciales de Acceso (Solo Entrenador/Admin autenticado)
window.openNominaCredencialesModal = () => {
  const session = typeof Auth.verifyCurrentSession === 'function' ? Auth.verifyCurrentSession() : Auth.getSession();
  if (!session || session.role !== 'coach') {
    showToast('Debés iniciar sesión como Entrenador o Administrador', 'info');
    return;
  }
  const eq = DB.equipo || {};
  showModalHtml(
    `
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold">Nómina Oficial y Credenciales de Acceso</h2>
        <p class="text-sm text-muted-foreground">Escuela Municipal de Atletismo Willilefche · Valcheta</p>
      </div>
      <button type="button" onclick="closeModal()" class="text-muted-foreground hover:text-foreground">✕</button>
    </div>

    <div class="mt-4 space-y-4">
      <div class="rounded-xl border bg-muted/40 p-3.5">
        <p class="text-xs font-bold uppercase tracking-wide text-primary">Entrenador (N.º 19)</p>
        <p class="mt-1 text-sm font-semibold">${esc(eq.entrenador || 'Cristian Javier Torres')} · DNI ${esc(eq.entrenadorDni || '27.884.821')} · Nac: 02/07/1980</p>
        <p class="mt-1 text-xs text-muted-foreground">
          Usuario: <code class="rounded bg-card px-1.5 py-0.5 font-mono font-bold text-foreground">${esc(eq.coachUser || 'cristian.torres')}</code> ·
          Acceso: <span class="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Protegido por Firebase Auth</span> (Clave inicial: DNI)
        </p>
      </div>

      <div class="overflow-x-auto rounded-xl border bg-card">
        <table class="w-full min-w-[44rem] text-xs">
          <thead class="border-b bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th class="px-3 py-2.5 font-semibold">N.º</th>
              <th class="px-3 py-2.5 font-semibold">Apellido y Nombre</th>
              <th class="px-3 py-2.5 font-semibold">Fecha Nac.</th>
              <th class="px-3 py-2.5 font-semibold">Cat.</th>
              <th class="px-3 py-2.5 font-semibold">DNI</th>
              <th class="px-3 py-2.5 font-semibold">Usuario Atleta</th>
              <th class="px-3 py-2.5 font-semibold">Estado de Seguridad</th>
              <th class="px-3 py-2.5 font-semibold">Usuario Familia</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            ${DB.atletas
              .map(
                (a, idx) => `
              <tr class="hover:bg-muted/30">
                <td class="px-3 py-2 font-mono font-bold text-muted-foreground">${a.nroNomina || idx + 1}</td>
                <td class="px-3 py-2 font-semibold">
                  <a href="#/entrenador/atletas/${a.id}" onclick="closeModal()" class="hover:text-primary hover:underline">
                    ${esc(a.apellido)}, ${esc(a.nombre)}
                  </a>
                </td>
                <td class="px-3 py-2 tabular-nums">${Helpers.fechaCorta(a.fechaNacimiento)} (${Helpers.edad(a.fechaNacimiento)} a.)</td>
                <td class="px-3 py-2"><span class="rounded bg-secondary px-1.5 py-0.5 font-semibold">${esc(a.categoria)}</span></td>
                <td class="px-3 py-2 font-mono">${esc(a.dni || '—')}</td>
                <td class="px-3 py-2 font-mono font-bold text-primary">${esc(a.usuario)}</td>
                <td class="px-3 py-2"><span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"><i data-lucide="shield-check" class="size-3.5"></i> Protegido</span></td>
                <td class="px-3 py-2 font-mono text-muted-foreground">${esc(a.tutor?.usuario || '—')}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <div class="flex justify-end gap-2">
        <button type="button" onclick="closeModal()" class="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          Cerrar
        </button>
      </div>
    </div>
  `,
    'max-w-4xl'
  );
};

// Modal de Configuración de Firebase, Credenciales de Admin y Backups JSON (EXCLUSIVO ADMINISTRADOR AUTENTICADO)
window.openCloudConfigModal = () => {
  const session = typeof Auth.verifyCurrentSession === 'function' ? Auth.verifyCurrentSession() : Auth.getSession();
  if (!session || session.subRole !== 'admin') {
    showToast('Acceso restringido exclusivamente al Administrador', 'info');
    return;
  }
  const activeCfg = CloudSync.getActiveFirebaseConfig() || window.firebaseConfig || {};

  showModalHtml(
    `
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold">Panel Exclusivo de Administrador</h2>
        <p class="text-sm text-muted-foreground">Estado actual: <strong>${esc(CloudSync.statusText)}</strong></p>
      </div>
      <button type="button" onclick="closeModal()" class="text-muted-foreground hover:text-foreground">✕</button>
    </div>

    <div class="mt-4 space-y-5">
      <div class="rounded-xl border bg-muted/40 p-4 space-y-3">
        <p class="text-sm font-bold">1. Copias de Seguridad (Respaldo Local JSON)</p>
        <p class="text-xs text-muted-foreground">Descargá o restaurá toda la base de datos de la escuela en un archivo seguro en tu computadora.</p>
        <div class="flex flex-wrap gap-2">
          <button type="button" onclick="exportBackupJSON()" class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95">
            <i data-lucide="download" class="size-4"></i> Descargar Backup (.json)
          </button>
          <label class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted">
            <i data-lucide="upload" class="size-4"></i> Restaurar Backup (.json)
            <input type="file" accept=".json" onchange="importBackupJSON(this)" class="hidden" />
          </label>
        </div>
      </div>

      <form onsubmit="saveFirebaseConfigFromUI(event)" class="rounded-xl border bg-card p-4 space-y-3">
        <p class="text-sm font-bold">2. Conexión y Migración a Firebase Firestore</p>
        <div class="grid grid-cols-2 gap-2.5">
          <div class="col-span-2">
            <label class="text-xs font-medium">apiKey (Oculta por seguridad)</label>
            <input id="fb-apikey" type="password" required value="${esc(activeCfg.apiKey && !String(activeCfg.apiKey).includes('PEGAR_AQUI') ? activeCfg.apiKey : '')}" placeholder="AIzaSy..." class="h-9 w-full rounded-lg border bg-card px-3 text-xs font-mono" />
          </div>
          <div>
            <label class="text-xs font-medium">projectId</label>
            <input id="fb-proj" required value="${esc(activeCfg.projectId && !String(activeCfg.projectId).includes('PEGAR_AQUI') ? activeCfg.projectId : '')}" placeholder="willilefche-valcheta" class="h-9 w-full rounded-lg border bg-card px-3 text-xs font-mono" />
          </div>
          <div>
            <label class="text-xs font-medium">appId</label>
            <input id="fb-appid" type="password" value="${esc(activeCfg.appId && !String(activeCfg.appId).includes('PEGAR_AQUI') ? activeCfg.appId : '')}" placeholder="1:0000:web:0000" class="h-9 w-full rounded-lg border bg-card px-3 text-xs font-mono" />
          </div>
        </div>
        <div class="flex flex-wrap justify-between items-center gap-2 pt-1">
          <button type="button" onclick="CloudSync.pushToCloud().then(ok => showToast(ok ? '¡Nómina sincronizada en Firebase!' : 'Revisá las credenciales de Firestore', ok ? 'success' : 'info'))" class="text-xs font-semibold text-primary hover:underline">
            Forzar sincronización con Firebase ahora
          </button>
          <button type="submit" class="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95">
            Guardar configuración Firebase
          </button>
        </div>
      </form>

      <form onsubmit="saveAdminProfile(event)" class="rounded-xl border bg-card p-4 space-y-3">
        <p class="text-sm font-bold">3. Credenciales de Administrador y Entrenador</p>
        <div class="grid grid-cols-2 gap-2.5">
          <div>
            <label class="text-xs font-medium">Usuario Administrador</label>
            <input id="adm-user" required value="${esc(DB.equipo.adminUser || 'admin')}" class="h-9 w-full rounded-lg border bg-card px-3 text-xs font-mono" />
          </div>
          <div>
            <label class="text-xs font-medium">Contraseña Administrador</label>
            <div class="h-9 w-full rounded-lg border bg-muted/40 px-3 flex items-center text-xs text-muted-foreground font-semibold text-emerald-600 dark:text-emerald-400">
              <i data-lucide="shield-check" class="size-3.5 mr-1.5"></i> Firebase Auth
            </div>
          </div>
          <div>
            <label class="text-xs font-medium">Nombre Entrenador (N.º 19)</label>
            <input id="adm-nombre" required value="${esc(DB.equipo.entrenador || 'Cristian Javier Torres')}" class="h-9 w-full rounded-lg border bg-card px-3 text-xs" />
          </div>
          <div>
            <label class="text-xs font-medium">DNI Entrenador</label>
            <input id="adm-dni" required value="${esc(DB.equipo.entrenadorDni || '27.884.821')}" class="h-9 w-full rounded-lg border bg-card px-3 text-xs font-mono" />
          </div>
          <div>
            <label class="text-xs font-medium">Usuario Entrenador</label>
            <input id="adm-coach-user" required value="${esc(DB.equipo.coachUser || 'cristian.torres')}" class="h-9 w-full rounded-lg border bg-card px-3 text-xs font-mono" />
          </div>
          <div>
            <label class="text-xs font-medium">Contraseña Entrenador</label>
            <div class="h-9 w-full rounded-lg border bg-muted/40 px-3 flex items-center text-xs text-muted-foreground font-semibold text-emerald-600 dark:text-emerald-400">
              <i data-lucide="shield-check" class="size-3.5 mr-1.5"></i> Firebase Auth
            </div>
          </div>
        </div>
        <div class="flex justify-end items-center pt-1">
          <button type="submit" class="rounded-lg bg-secondary px-3.5 py-1.5 text-xs font-semibold text-secondary-foreground hover:opacity-90">
            Guardar accesos
          </button>
        </div>
      </form>

      <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
              <i data-lucide="shield-check" class="size-4"></i> 4. Blindaje y Desacople de Colecciones en Firebase
            </p>
            <p class="text-xs text-muted-foreground mt-0.5">
              Separa los datos sensibles de menores (DNI, salud, apto médico, datos de tutor) y los registros de pagos en subcolecciones protegidas por roles con Firebase Authentication.
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onclick="ejecutarBlindajeColeccionesFirebase(this)"
            class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
          >
            <i data-lucide="lock" class="size-4"></i>
            Blindar y Migrar Colecciones Seguras en Firestore
          </button>
        </div>
      </div>
    </div>
  `,
    'max-w-xl'
  );
};

window.ejecutarBlindajeColeccionesFirebase = async (btn) => {
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-flex items-center gap-2"><svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> Blindando colecciones en Firestore…</span>`;
  }
  try {
    const res = await CloudSync.blindarBaseYCrearColecciones();
    if (res.ok) {
      showToast('¡Base blindada y colecciones separadas con éxito en Firebase!', 'success');
    } else {
      showToast(res.error || 'No se pudo completar el blindaje. Verificá la consola.', 'error');
    }
  } catch (err) {
    showToast('Error al conectar con Firestore: ' + (err.message || err), 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="shield-check" class="size-4"></i> Colecciones Blindadas y Actualizadas`;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }
  }
};

window.parsePastedFirebaseConfig = (rawText) => {
  const s = Auth.getSession();
  if (!s || s.subRole !== 'admin') return;
  if (!rawText) return;
  const extract = (key) => {
    const m = rawText.match(new RegExp(key + '\\s*:\\s*["\']([^"\']+)["\']'));
    return m ? m[1] : '';
  };
  const apiKey = extract('apiKey');
  const projectId = extract('projectId');
  const appId = extract('appId');
  if (apiKey) document.getElementById('fb-apikey').value = apiKey;
  if (projectId) document.getElementById('fb-proj').value = projectId;
  if (appId) document.getElementById('fb-appid').value = appId;
};

window.saveFirebaseConfigFromUI = (e) => {
  e.preventDefault();
  const s = Auth.getSession();
  if (!s || s.subRole !== 'admin') return;
  const apiKey = document.getElementById('fb-apikey').value.trim();
  const projectId = document.getElementById('fb-proj').value.trim();
  const appId = document.getElementById('fb-appid').value.trim();
  const cfg = {
    apiKey,
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: `${projectId}.firebasestorage.app`,
    appId,
    databaseId: 'default',
  };
  localStorage.setItem('willilefche_firebase_config', JSON.stringify(cfg));
  closeModal();
  showToast('Configuración de Firebase guardada.');
  setTimeout(() => location.reload(), 600);
};

window.saveAdminProfile = (e) => {
  e.preventDefault();
  const s = Auth.getSession();
  if (!s || s.subRole !== 'admin') return;
  DB.equipo.adminUser = document.getElementById('adm-user').value.trim().toLowerCase();
  
  DB.equipo.entrenador = document.getElementById('adm-nombre').value.trim();
  DB.equipo.entrenadorDni = document.getElementById('adm-dni').value.trim();
  DB.equipo.coachUser = document.getElementById('adm-coach-user').value.trim().toLowerCase();
  
  saveDB();
  closeModal();
  showToast('Credenciales de Administrador y Entrenador actualizadas');
  renderApp();
};

// 1. Modal de Entrenamiento (Entrenador agrega/modifica sesión individual o grupal)
window.openSessionModal = (atletaId, sesionId = null) => {
  const atleta = Helpers.getAtleta(atletaId);
  const sesion = sesionId ? (DB.planes[atletaId] || []).find((s) => s.id === sesionId) : null;
  const tipos = ['Rodaje', 'Pasadas', 'Fondo', 'Fartlek', 'Cuestas', 'Fuerza', 'Descanso'];
  const zonas = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'];
  const fechaActual = sesion?.fecha || DB.hoy;
  const tipoActual = sesion?.tipo || 'Rodaje';
  const zonaActual = sesion?.intensidad || 'Z2';
  const categorias = Array.from(new Set(DB.atletas.map((a) => a.categoria).filter(Boolean)));
  const disciplinasCatalogo = Array.isArray(DB.disciplinasDisponibles) && DB.disciplinasDisponibles.length > 0
    ? DB.disciplinasDisponibles
    : ['Running', 'Velocidad', 'Medio Fondo', 'Fondo', 'Cross / Trail', 'Saltos', 'Lanzamientos', 'Marcha', 'Iniciación Atlética'];

  showModalHtml(`
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold">${sesion ? 'Modificar entrenamiento' : 'Nuevo entrenamiento'}</h2>
        <p class="text-sm text-muted-foreground">Plan de ${esc(atleta.nombre)}.${sesion ? ' El atleta verá el aviso de modificación.' : ' Podés asignarlo individualmente, por disciplina o por categoría.'}</p>
      </div>
      <button type="button" onclick="closeModal()" class="text-muted-foreground hover:text-foreground">✕</button>
    </div>
    <form onsubmit="saveSessionModal(event, '${atletaId}', '${sesionId || ''}')" class="mt-4 grid gap-3.5">
      ${
        !sesion
          ? `<div class="space-y-1">
              <label class="text-xs font-semibold uppercase tracking-wide text-primary">Asignar a (Atleta, Disciplina o Categoría)</label>
              <select id="s-dest" class="h-10 w-full rounded-lg border bg-card px-3 text-sm font-medium">
                <option value="${atleta.id}">👤 Solo a ${esc(Helpers.nombreCompleto(atleta))}</option>
                ${disciplinasCatalogo
                  .map((d) => `<option value="__DISC__:${esc(d)}">🏃 Disciplina: ${esc(d)}</option>`)
                  .join('')}
                <option value="__CAT__:${esc(atleta.categoria)}">🏷️ Categoría ${esc(atleta.categoria)} completa</option>
                <option value="__TODOS__">👥 Todo el grupo (${DB.atletas.length} atletas)</option>
                ${categorias
                  .filter((cat) => cat !== atleta.categoria)
                  .map((cat) => `<option value="__CAT__:${esc(cat)}">🏷️ Categoría ${esc(cat)}</option>`)
                  .join('')}
              </select>
            </div>`
          : ''
      }
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <label class="text-sm font-medium">Fecha</label>
          <input id="s-fecha" type="date" required value="${esc(fechaActual)}" class="h-10 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">Tipo</label>
          <select id="s-tipo" class="h-10 w-full rounded-lg border bg-card px-3 text-sm">
            ${tipos.map((t) => `<option value="${t}" ${t === tipoActual ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="space-y-1">
        <label class="text-sm font-medium">Título</label>
        <input id="s-titulo" required value="${esc(sesion?.titulo || '')}" placeholder="Ej.: 6 × 400 m en pista" class="h-10 w-full rounded-lg border bg-card px-3 text-sm" />
      </div>
      <div class="space-y-1">
        <label class="text-sm font-medium">Descripción</label>
        <textarea id="s-detalle" rows="2" placeholder="Entrada en calor, bloque principal, vuelta a la calma…" class="w-full rounded-lg border bg-card p-3 text-sm">${esc(sesion?.detalle || '')}</textarea>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div class="space-y-1">
          <label class="text-sm font-medium">Distancia (km)</label>
          <input id="s-km" type="number" step="0.1" value="${esc(sesion?.distanciaKm || '')}" class="h-10 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">Duración (min)</label>
          <input id="s-min" type="number" value="${esc(sesion?.duracionMin || '')}" class="h-10 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">Ritmo objetivo</label>
          <input id="s-ritmo" value="${esc(sesion?.ritmo || '')}" placeholder="4:15 /km" class="h-10 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <label class="text-sm font-medium">Series / Repeticiones</label>
          <input id="s-series" value="${esc(sesion?.series || '')}" placeholder="Ej.: 6 × 400 m o 3 × 1000 m" class="h-10 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">Recuperación</label>
          <input id="s-rec" value="${esc(sesion?.recuperacion || '')}" placeholder="Ej.: 2:00 trote suave" class="h-10 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
      </div>
      <div class="space-y-1">
        <label class="text-sm font-medium">Intensidad</label>
        <select id="s-zona" class="h-10 w-full rounded-lg border bg-card px-3 text-sm">
          ${zonas.map((z) => `<option value="${z}" ${z === zonaActual ? 'selected' : ''}>${z} · ${INTENSIDAD_NOMBRE[z]}</option>`).join('')}
        </select>
      </div>
      <div class="mt-2 flex justify-end gap-2">
        <button type="button" onclick="closeModal()" class="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
        <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">Guardar</button>
      </div>
    </form>
  `);
};

window.saveSessionModal = (e, atletaId, sesionId) => {
  e.preventDefault();
  const atleta = Helpers.getAtleta(atletaId);
  const lista = DB.planes[atletaId] || [];
  const existente = sesionId ? lista.find((s) => s.id === sesionId) : null;
  const tipo = document.getElementById('s-tipo').value;
  const kmVal = document.getElementById('s-km').value;
  const minVal = document.getElementById('s-min').value;
  const seriesVal = document.getElementById('s-series')?.value.trim() || undefined;

  const baseData = {
    fecha: document.getElementById('s-fecha').value,
    tipo,
    titulo: document.getElementById('s-titulo').value.trim(),
    detalle: document.getElementById('s-detalle').value.trim(),
    distanciaKm: kmVal ? Number(kmVal) : undefined,
    duracionMin: minVal ? Number(minVal) : undefined,
    ritmo: document.getElementById('s-ritmo').value.trim() || undefined,
    series: seriesVal,
    intensidad: tipo === 'Descanso' ? undefined : document.getElementById('s-zona').value,
    recuperacion: document.getElementById('s-rec').value.trim() || undefined,
  };

  if (existente) {
    const actualizada = {
      ...existente,
      ...baseData,
      modificada: true,
    };
    DB.planes[atletaId] = lista.map((s) => (s.id === sesionId ? actualizada : s));
    saveDB();
    closeModal();
    showToast(`Se avisó a ${atleta.nombre} del cambio`);
    renderApp();
    return;
  }

  const destVal = document.getElementById('s-dest')?.value || atletaId;
  let targets = [];
  if (destVal === '__TODOS__') {
    targets = DB.atletas;
  } else if (destVal.startsWith('__DISC__:')) {
    const disc = destVal.replace('__DISC__:', '');
    targets = DB.atletas.filter((a) => Helpers.atletaPracticaDisciplina(a, disc));
    if (targets.length === 0) {
      showToast(`Ningún atleta tiene asignada aún la disciplina "${disc}". Asignala primero en sus fichas.`, 'info');
      return;
    }
  } else if (destVal.startsWith('__CAT__:')) {
    const cat = destVal.replace('__CAT__:', '');
    targets = DB.atletas.filter((a) => a.categoria === cat);
  } else {
    const single = Helpers.getAtleta(destVal);
    if (single) targets = [single];
  }

  targets.forEach((a, idx) => {
    const planActual = DB.planes[a.id] || [];
    DB.planes[a.id] = [
      ...planActual,
      {
        id: `nueva-${Date.now()}-${idx}`,
        ...baseData,
        estado: 'pendiente',
        modificada: false,
      },
    ];
  });

  saveDB();
  closeModal();
  showToast(
    targets.length > 1
      ? `Entrenamiento cargado en el plan de ${targets.length} atletas`
      : 'Entrenamiento agregado al plan'
  );
  renderApp();
};

// 1b. Modal para Duplicar Semana (+7 días) o Copiar Plan a otro atleta/grupo/disciplina
window.openDuplicarPlanModal = (atletaId) => {
  const atleta = Helpers.getAtleta(atletaId);
  if (!atleta) return;
  const sesiones = Helpers.getPlan(atleta.id);
  const otrosAtletas = DB.atletas.filter((a) => a.id !== atleta.id);
  const categorias = Array.from(new Set(DB.atletas.map((a) => a.categoria).filter(Boolean)));
  const disciplinasCatalogo = Array.isArray(DB.disciplinasDisponibles) && DB.disciplinasDisponibles.length > 0
    ? DB.disciplinasDisponibles
    : ['Running', 'Velocidad', 'Medio Fondo', 'Fondo', 'Cross / Trail', 'Saltos', 'Lanzamientos', 'Marcha', 'Iniciación Atlética'];

  showModalHtml(`
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold">Duplicar semana o copiar plan</h2>
        <p class="text-sm text-muted-foreground">Agilizá la carga reutilizando las sesiones de ${esc(Helpers.nombreCompleto(atleta))} (${sesiones.length} sesiones).</p>
      </div>
      <button type="button" onclick="closeModal()" class="text-muted-foreground hover:text-foreground">✕</button>
    </div>
    <form onsubmit="saveDuplicarPlanModal(event, '${atleta.id}')" class="mt-4 space-y-4">
      <div class="space-y-2">
        <label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">¿Qué querés hacer?</label>
        <label class="flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
          <input type="radio" name="dup-modo" value="semana_siguiente" checked onchange="document.getElementById('dup-dest-box').classList.add('hidden')" class="mt-0.5 size-4" />
          <div class="text-sm">
            <p class="font-semibold">Repetir semana hacia la semana siguiente (+7 días)</p>
            <p class="text-xs text-muted-foreground">Duplica los entrenamientos de ${esc(atleta.nombre)} sumando 7 días a cada fecha y dejándolos como pendientes.</p>
          </div>
        </label>
        <label class="flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
          <input type="radio" name="dup-modo" value="copiar_a_otros" onchange="document.getElementById('dup-dest-box').classList.remove('hidden')" class="mt-0.5 size-4" />
          <div class="text-sm">
            <p class="font-semibold">Copiar este plan a otra disciplina, categoría o atleta</p>
            <p class="text-xs text-muted-foreground">Copia las sesiones de ${esc(atleta.nombre)} con sus mismas fechas a los destinatarios seleccionados.</p>
          </div>
        </label>
      </div>

      <div id="dup-dest-box" class="hidden space-y-1.5 rounded-lg border bg-muted/30 p-3">
        <label class="text-xs font-semibold">Destinatario del plan copiado</label>
        <select id="dup-dest" class="h-10 w-full rounded-lg border bg-card px-3 text-sm">
          ${disciplinasCatalogo
            .map((d) => `<option value="__DISC__:${esc(d)}">🏃 Todos los atletas de Disciplina: ${esc(d)}</option>`)
            .join('')}
          <option value="__CAT__:${esc(atleta.categoria)}">🏷️ Toda la categoría ${esc(atleta.categoria)}</option>
          <option value="__TODOS__">👥 Todo el grupo (Todos los atletas)</option>
          ${categorias
            .filter((c) => c !== atleta.categoria)
            .map((c) => `<option value="__CAT__:${esc(c)}">🏷️ Categoría ${esc(c)}</option>`)
            .join('')}
          ${otrosAtletas
            .map((a) => `<option value="${a.id}">👤 ${esc(Helpers.nombreCompleto(a))} (${esc(a.categoria)})</option>`)
            .join('')}
        </select>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal()" class="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
        <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">Duplicar plan</button>
      </div>
    </form>
  `);
};

window.saveDuplicarPlanModal = (e, atletaId) => {
  e.preventDefault();
  const sesionesOrigen = Helpers.getPlan(atletaId);
  if (sesionesOrigen.length === 0) {
    closeModal();
    showToast('Este atleta todavía no tiene sesiones cargadas para duplicar', 'info');
    return;
  }

  const modo = document.querySelector('input[name="dup-modo"]:checked')?.value || 'semana_siguiente';

  if (modo === 'semana_siguiente') {
    const nuevas = sesionesOrigen.map((s, idx) => {
      const d = new Date((s.fecha || DB.hoy) + 'T00:00:00');
      d.setDate(d.getDate() + 7);
      const nuevaFecha = d.toISOString().slice(0, 10);
      return {
        ...s,
        id: `dup-${Date.now()}-${idx}`,
        fecha: nuevaFecha,
        estado: 'pendiente',
        sensacion: undefined,
        comentario: undefined,
        modificada: false,
      };
    });
    DB.planes[atletaId] = [...sesionesOrigen, ...nuevas];
    saveDB();
    closeModal();
    showToast(`Se duplicaron ${nuevas.length} sesiones para la próxima semana (+7 días)`);
    renderApp();
    return;
  }

  const destVal = document.getElementById('dup-dest')?.value || '';
  let targets = [];
  if (destVal === '__TODOS__') {
    targets = DB.atletas.filter((a) => a.id !== atletaId);
  } else if (destVal.startsWith('__DISC__:')) {
    const disc = destVal.replace('__DISC__:', '');
    targets = DB.atletas.filter(
      (a) => a.id !== atletaId && Helpers.atletaPracticaDisciplina(a, disc)
    );
    if (targets.length === 0) {
      showToast(`No hay otros atletas con la disciplina "${disc}" asignada.`, 'info');
      return;
    }
  } else if (destVal.startsWith('__CAT__:')) {
    const cat = destVal.replace('__CAT__:', '');
    targets = DB.atletas.filter((a) => a.categoria === cat && a.id !== atletaId);
  } else {
    const single = Helpers.getAtleta(destVal);
    if (single) targets = [single];
  }

  targets.forEach((destAtleta, aIdx) => {
    const actuales = DB.planes[destAtleta.id] || [];
    const copiadas = sesionesOrigen.map((s, sIdx) => ({
      ...s,
      id: `copy-${Date.now()}-${aIdx}-${sIdx}`,
      estado: 'pendiente',
      sensacion: undefined,
      comentario: undefined,
      modificada: false,
    }));
    DB.planes[destAtleta.id] = [...actuales, ...copiadas];
  });

  saveDB();
  closeModal();
  showToast(`Plan copiado a ${targets.length} atleta${targets.length === 1 ? '' : 's'}`);
  renderApp();
};

/* ==========================================================================
   HERRAMIENTA DE IMPORTACIÓN DE PLANIFICACIÓN DESDE EXCEL ("Planilla de Carga")
   Y GESTIÓN DE DISCIPLINAS EN LOTE
   ========================================================================== */

window._excelPlanImportState = {
  defaultAtletaId: null,
  fileName: '',
  metaAtleta: '',
  metaDisciplina: 'Running',
  metaObjetivo: '',
  mondayStart: '',
  modoDestino: 'disciplina', // 'individual' | 'disciplina' | 'categoria' | 'manual'
  selectedAtletaId: '',
  selectedDisciplina: 'Running',
  selectedCategoria: 'U16',
  manualAtletaIds: [],
  manualSearch: '',
  rawRows: [],
  parsedSessions: [],
  assignDisciplinaToTargets: true,
  addObjetivoToTargets: true,
  replaceSameDates: true,
};

function getMondayOfDateISO(isoDate) {
  const [y, m, d] = (isoDate || DB.hoy).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=Dom, 1=Lun
  const diff = dow === 0 ? -6 : 1 - dow;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

function addDaysISO(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function normalizeAscii(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseExcelRowsToSessions(rawRows, mondayStart) {
  const dowMap = {
    lunes: 0,
    lun: 0,
    martes: 1,
    mar: 1,
    miercoles: 2,
    mie: 2,
    jueves: 3,
    jue: 3,
    viernes: 4,
    vie: 4,
    sabado: 5,
    sab: 5,
    domingo: 6,
    dom: 6,
  };

  let weekIndex = 0;
  let lastDow = -1;
  let sequentialOffset = 0;
  const sessions = [];

  for (const r of rawRows) {
    const diaRaw = String(r.dia || '').trim();
    const actividad = String(r.actividad || '').trim();
    const objetivo = String(r.objetivo || '').trim();
    const duracionRaw = String(r.duracion || '').trim();
    const observaciones = String(r.observaciones || '').trim();

    const diaNorm = normalizeAscii(diaRaw).split(/\s+/)[0];
    let fechaCalculada = '';

    // 1. Verificar si la celda Día es una fecha explícita YYYY-MM-DD o DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(diaRaw)) {
      fechaCalculada = diaRaw;
    } else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(diaRaw)) {
      const parts = diaRaw.split(/[/-]/);
      const dd = parts[0].padStart(2, '0');
      const mm = parts[1].padStart(2, '0');
      const yyyy = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      fechaCalculada = `${yyyy}-${mm}-${dd}`;
    } else if (dowMap[diaNorm] !== undefined) {
      const dow = dowMap[diaNorm];
      if (lastDow !== -1 && dow <= lastDow) {
        weekIndex++;
      }
      lastDow = dow;
      const totalOffset = weekIndex * 7 + dow;
      fechaCalculada = addDaysISO(mondayStart, totalOffset);
    } else {
      fechaCalculada = addDaysISO(mondayStart, sequentialOffset);
    }
    sequentialOffset++;

    // Si la fila está completamente vacía en Actividad, Objetivo, Duración y Observaciones, la omitimos
    if (!actividad && !objetivo && !duracionRaw && !observaciones) {
      continue;
    }

    const textoCompleto = `${actividad} ${objetivo} ${observaciones}`.toLowerCase();

    // Inferir tipo e intensidad
    let tipo = 'Rodaje';
    let intensidad = 'Z2';
    if (/\b(descanso|libre|reposo)\b/i.test(textoCompleto)) {
      tipo = 'Descanso';
      intensidad = undefined;
    } else if (/\b(pasadas|series|repeticiones|velocidad|pista|interval|frad|fartlek|\d+\s*[x×]\s*\d+)\b/i.test(textoCompleto)) {
      tipo = /\bfartlek\b/i.test(textoCompleto) ? 'Fartlek' : 'Pasadas';
      intensidad = 'Z4';
    } else if (/\b(cuestas|subidas|lomas)\b/i.test(textoCompleto)) {
      tipo = 'Cuestas';
      intensidad = 'Z4';
    } else if (/\b(fondo|largo|tirada)\b/i.test(textoCompleto)) {
      tipo = 'Fondo';
      intensidad = 'Z2';
    } else if (/\b(fuerza|gimnasio|core|fortalecimiento|pesas|circuito)\b/i.test(textoCompleto)) {
      tipo = 'Fuerza';
      intensidad = 'Z3';
    } else if (/\b(regenerativo|suave|trote suave|recuperacion)\b/i.test(textoCompleto)) {
      tipo = 'Rodaje';
      intensidad = 'Z1';
    } else if (/\b(tempo|ritmo|umbral|controlado)\b/i.test(textoCompleto)) {
      tipo = 'Rodaje';
      intensidad = 'Z3';
    }

    // Extraer duración en minutos
    let duracionMin = undefined;
    if (duracionRaw) {
      const hmMatch = duracionRaw.match(/(\d+)\s*(?:h|hs|hora|horas|:)\s*(\d+)?/i);
      if (hmMatch) {
        duracionMin = Number(hmMatch[1]) * 60 + (hmMatch[2] ? Number(hmMatch[2]) : 0);
      } else {
        const numMatch = duracionRaw.match(/(\d+(?:[.,]\d+)?)/);
        if (numMatch) {
          duracionMin = Math.round(Number(numMatch[1].replace(',', '.')));
        }
      }
    }

    // Extraer distancia en km si figura en actividad u objetivo
    let distanciaKm = undefined;
    const kmMatch = `${actividad} ${objetivo}`.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kilometros|kilómetros|k)\b/i);
    if (kmMatch) {
      distanciaKm = Number(kmMatch[1].replace(',', '.'));
    }

    // Extraer series si figura patrón NxM
    let series = undefined;
    const seriesMatch = actividad.match(/(\d+\s*[x×]\s*\d+\s*(?:m|mts|km|min|'|")?)/i);
    if (seriesMatch) {
      series = seriesMatch[1].trim();
    }

    // Construir Título y Descripción detallada
    let titulo = '';
    if (objetivo && actividad) {
      titulo = actividad.length <= 52 ? actividad : `${objetivo} · ${actividad.slice(0, 42)}…`;
    } else if (actividad) {
      titulo = actividad.length <= 58 ? actividad : `${actividad.slice(0, 55)}…`;
    } else if (objetivo) {
      titulo = objetivo;
    } else {
      titulo = `Entrenamiento (${diaRaw})`;
    }

    const partesDetalle = [];
    if (actividad) partesDetalle.push(actividad);
    if (objetivo) partesDetalle.push(`Objetivo: ${objetivo}`);
    if (duracionRaw && !duracionMin) partesDetalle.push(`Duración: ${duracionRaw}`);
    if (observaciones) partesDetalle.push(`Observaciones: ${observaciones}`);

    sessions.push({
      diaLabel: diaRaw || 'Día',
      fecha: fechaCalculada,
      tipo,
      intensidad,
      titulo,
      detalle: partesDetalle.join(' | '),
      actividadRaw: actividad,
      objetivoRaw: objetivo,
      duracionRaw,
      observacionesRaw: observaciones,
      duracionMin,
      distanciaKm,
      series,
    });
  }

  return sessions;
}

window.downloadPlanillaCargaExcel = (atletaId = null) => {
  const atleta = atletaId ? Helpers.getAtleta(atletaId) : null;
  const discStr =
    atleta && Array.isArray(atleta.disciplinas) && atleta.disciplinas[0]
      ? atleta.disciplinas[0]
      : State.atletasDisciplina !== 'Todas'
      ? State.atletasDisciplina
      : 'Running';
  const objStr =
    atleta && Array.isArray(atleta.objetivos) && atleta.objetivos[0]
      ? atleta.objetivos[0].texto
      : '15 Km';

  const aoa = [
    ['CORREDORES WILLILEFCHE', '', '', '', ''],
    ['Entrenador CECS Nivel 1', '', '', '', ''],
    [DB.equipo?.entrenador || 'Cristian Javier Torres', '', '', '', ''],
    ['Atleta', atleta ? Helpers.nombreCompleto(atleta) : 'Nombre del Atleta o Grupo', '', '', ''],
    ['Disciplina', discStr, '', '', ''],
    ['Objetivo', objStr, '', '', ''],
    ['Día', 'Actividad / Desarrollo detallado', 'Objetivo', 'Duración', 'Observaciones'],
    ['Lunes ', '', '', '', ''],
    ['Martes ', '', '', '', ''],
    ['Miércoles ', '', '', '', ''],
    ['Jueves ', '', '', '', ''],
    ['Viernes ', '', '', '', ''],
    ['Sábado ', '', '', '', ''],
    ['Domingo ', '', '', '', ''],
    ['Lunes ', '', '', '', ''],
    ['Martes ', '', '', '', ''],
    ['Miércoles ', '', '', '', ''],
    ['Jueves ', '', '', '', ''],
    ['Viernes ', '', '', '', ''],
    ['Sábado ', '', '', '', ''],
    ['Domingo ', '', '', '', ''],
  ];

  if (window.XLSX) {
    const ws = window.XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 16 }, { wch: 48 }, { wch: 24 }, { wch: 15 }, { wch: 32 }];
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Planificacion');
    const slug = atleta ? atleta.usuario.replace(/[^a-z0-9]/gi, '_') : 'Willilefche';
    window.XLSX.writeFile(wb, `Planilla_de_Carga_${slug}.xlsx`);
    showToast('Planilla de Carga (.xlsx) descargada');
  } else {
    showToast('Cargando librería Excel, intentá nuevamente en un segundo', 'info');
  }
};

window.openImportarPlanExcelModal = (defaultAtletaId = null) => {
  const session = typeof Auth.verifyCurrentSession === 'function' ? Auth.verifyCurrentSession() : Auth.getSession();
  if (!session || session.role !== 'coach') return;

  const atleta = defaultAtletaId ? Helpers.getAtleta(defaultAtletaId) : null;
  const defaultDisc =
    atleta && Array.isArray(atleta.disciplinas) && atleta.disciplinas[0]
      ? atleta.disciplinas[0]
      : State.atletasDisciplina !== 'Todas'
      ? State.atletasDisciplina
      : 'Running';

  window._excelPlanImportState = {
    defaultAtletaId: defaultAtletaId || null,
    fileName: '',
    metaAtleta: atleta ? Helpers.nombreCompleto(atleta) : '',
    metaDisciplina: defaultDisc,
    metaObjetivo: '',
    mondayStart: getMondayOfDateISO(DB.hoy),
    modoDestino: atleta ? 'individual' : 'disciplina',
    selectedAtletaId: atleta ? atleta.id : DB.atletas[0]?.id || '',
    selectedDisciplina: defaultDisc,
    selectedCategoria: atleta ? atleta.categoria : 'U16',
    manualAtletaIds: atleta ? [atleta.id] : [],
    manualSearch: '',
    rawRows: [],
    parsedSessions: [],
    assignDisciplinaToTargets: true,
    addObjetivoToTargets: true,
    replaceSameDates: true,
  };

  renderImportarPlanExcelModal();
};

window.renderImportarPlanExcelModal = () => {
  const st = window._excelPlanImportState;
  const disciplinasCatalogo =
    Array.isArray(DB.disciplinasDisponibles) && DB.disciplinasDisponibles.length > 0
      ? DB.disciplinasDisponibles
      : ['Running', 'Velocidad', 'Medio Fondo', 'Fondo', 'Cross / Trail', 'Saltos', 'Lanzamientos', 'Marcha', 'Iniciación Atlética'];
  if (st.metaDisciplina && !disciplinasCatalogo.some((d) => d.toLowerCase() === st.metaDisciplina.toLowerCase())) {
    disciplinasCatalogo.push(st.metaDisciplina);
  }
  const categorias = ['Infantiles', 'U12', 'U14', 'U16', 'U18', 'U20', 'Mayores'];

  // Calcular atletas destinatarios según el modo actual
  let atletasEnDisciplina = DB.atletas.filter((a) =>
    Helpers.atletaPracticaDisciplina(a, st.selectedDisciplina)
  );

  showModalHtml(
    `
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <i data-lucide="file-spreadsheet" class="size-5"></i>
          </span>
          <h2 class="text-xl font-bold">Importar Planificación desde Excel</h2>
        </div>
        <p class="mt-1 text-xs text-muted-foreground">
          Subí tu archivo con formato <strong>Planilla de Carga.xlsx</strong> para asignarlo a un atleta individual o a un grupo por disciplina o categoría.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick="downloadPlanillaCargaExcel(${st.defaultAtletaId ? `'${st.defaultAtletaId}'` : 'null'})"
          class="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          title="Descargar plantilla en blanco con el formato oficial Planilla de Carga"
        >
          <i data-lucide="download" class="size-3.5 text-primary"></i> Descargar Planilla de Carga (.xlsx)
        </button>
        <button type="button" onclick="closeModal()" class="text-muted-foreground hover:text-foreground">✕</button>
      </div>
    </div>

    <div class="mt-4 space-y-4">
      <!-- Paso 1: Subir archivo Excel y elegir Lunes de inicio -->
      <div class="grid gap-3 rounded-xl border bg-muted/30 p-3.5 sm:grid-cols-[1fr_13rem]">
        <div>
          <label class="text-xs font-bold uppercase tracking-wide text-primary">1. Seleccionar archivo Excel (.xlsx, .xls, .csv)</label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onchange="handlePlanExcelFileSelect(this)"
            class="mt-1.5 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-primary-foreground hover:file:opacity-95 cursor-pointer"
          />
          ${
            st.fileName
              ? `<p class="mt-1.5 text-xs font-medium text-success">✓ Archivo cargado: <strong>${esc(st.fileName)}</strong> (${st.parsedSessions.length} sesiones con actividad detectadas)</p>`
              : `<p class="mt-1.5 text-[11px] text-muted-foreground">Respeta el formato: Fila 4 Atleta · Fila 5 Disciplina · Fila 6 Objetivo · Fila 7 Encabezados · Fila 8+ Lunes a Domingo.</p>`
          }
        </div>
        <div>
          <label class="text-xs font-bold uppercase tracking-wide text-foreground">Lunes de inicio (Semana 1)</label>
          <input
            type="date"
            value="${esc(st.mondayStart)}"
            onchange="updatePlanExcelMondayStart(this.value)"
            class="mt-1.5 h-9 w-full rounded-lg border bg-card px-2.5 text-xs font-semibold"
          />
          <p class="mt-1 text-[11px] text-muted-foreground">Calcula las fechas de cada día.</p>
        </div>
      </div>

      ${
        st.fileName
          ? `
        <!-- Datos detectados en el encabezado del Excel -->
        <div class="grid grid-cols-3 gap-2.5 rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs">
          <div>
            <span class="text-muted-foreground block">Atleta / Grupo en Excel (B4):</span>
            <strong class="text-sm">${esc(st.metaAtleta || '—')}</strong>
          </div>
          <div>
            <span class="text-muted-foreground block">Disciplina en Excel (B5):</span>
            <strong class="text-sm text-primary">🏃 ${esc(st.metaDisciplina || '—')}</strong>
          </div>
          <div>
            <span class="text-muted-foreground block">Objetivo en Excel (B6):</span>
            <strong class="text-sm">${esc(st.metaObjetivo || '—')}</strong>
          </div>
        </div>
      `
          : ''
      }

      <!-- Paso 2: Selección de Destinatarios (Individual, por Disciplina, por Categoría o Selección Manual) -->
      <div class="rounded-xl border bg-card p-3.5 space-y-3">
        <label class="text-xs font-bold uppercase tracking-wide text-primary block">2. ¿A quiénes querés aplicar esta planificación?</label>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onclick="setExcelImportModo('disciplina')"
            class="rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors ${
              st.modoDestino === 'disciplina' ? 'border-primary bg-primary/10 text-primary' : 'bg-card hover:bg-muted'
            }"
          >
            🏃 Por Disciplina
            <span class="block text-[10px] font-normal text-muted-foreground">Grupo según disciplina</span>
          </button>
          <button
            type="button"
            onclick="setExcelImportModo('individual')"
            class="rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors ${
              st.modoDestino === 'individual' ? 'border-primary bg-primary/10 text-primary' : 'bg-card hover:bg-muted'
            }"
          >
            👤 Atleta Individual
            <span class="block text-[10px] font-normal text-muted-foreground">Un solo corredor</span>
          </button>
          <button
            type="button"
            onclick="setExcelImportModo('categoria')"
            class="rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors ${
              st.modoDestino === 'categoria' ? 'border-primary bg-primary/10 text-primary' : 'bg-card hover:bg-muted'
            }"
          >
            🏷️ Por Categoría
            <span class="block text-[10px] font-normal text-muted-foreground">Infantiles, U12, U16…</span>
          </button>
          <button
            type="button"
            onclick="setExcelImportModo('manual')"
            class="rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors ${
              st.modoDestino === 'manual' ? 'border-primary bg-primary/10 text-primary' : 'bg-card hover:bg-muted'
            }"
          >
            ☑️ Selección Manual
            <span class="block text-[10px] font-normal text-muted-foreground">Elegir atletas a medida</span>
          </button>
        </div>

        ${
          st.modoDestino === 'disciplina'
            ? `
          <div class="space-y-2.5 pt-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <label class="text-xs font-semibold">Disciplina:</label>
                <select
                  onchange="changeExcelImportDisciplina(this.value)"
                  class="h-9 rounded-lg border bg-card px-3 text-xs font-semibold"
                >
                  ${renderSelectDisciplinasOptions(st.selectedDisciplina)}
                </select>
              </div>
              <button
                type="button"
                onclick="openAsignarDisciplinasLoteModal('${esc(st.selectedDisciplina)}')"
                class="text-xs font-semibold text-primary hover:underline"
              >
                + Configurar qué atletas entrenan ${esc(st.selectedDisciplina)}
              </button>
            </div>
            ${
              atletasEnDisciplina.length === 0
                ? `<div class="rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
                    Todavía no hay atletas marcados con la disciplina <strong>${esc(st.selectedDisciplina)}</strong>.
                    Podés hacer clic en <strong>"+ Configurar qué atletas entrenan ${esc(st.selectedDisciplina)}"</strong> arriba o cambiar a <strong>"☑️ Selección Manual"</strong> para elegir a los atletas ahora mismo (y se les asignará la disciplina automáticamente).
                  </div>`
                : `<div class="rounded-lg border bg-muted/30 p-2.5">
                    <p class="mb-1.5 text-xs font-semibold">Se importará a estos ${atletasEnDisciplina.length} atletas de ${esc(st.selectedDisciplina)}:</p>
                    <div class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      ${atletasEnDisciplina
                        .map(
                          (a) =>
                            `<span class="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-0.5 text-xs font-medium">${esc(a.apellido)}, ${esc(a.nombre)} <span class="text-[10px] text-muted-foreground">(${esc(a.categoria)})</span></span>`
                        )
                        .join('')}
                    </div>
                  </div>`
            }
          </div>
        `
            : st.modoDestino === 'individual'
            ? `
          <div class="pt-1">
            <label class="text-xs font-semibold">Seleccionar Atleta:</label>
            <select
              onchange="window._excelPlanImportState.selectedAtletaId = this.value; renderImportarPlanExcelModal()"
              class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-xs font-semibold"
            >
              ${DB.atletas
                .slice()
                .sort((a, b) => a.apellido.localeCompare(b.apellido))
                .map(
                  (a) =>
                    `<option value="${a.id}" ${a.id === st.selectedAtletaId ? 'selected' : ''}>${esc(a.apellido)}, ${esc(a.nombre)} (${esc(a.categoria)} · DNI ${esc(a.dni)})</option>`
                )
                .join('')}
            </select>
          </div>
        `
            : st.modoDestino === 'categoria'
            ? `
          <div class="pt-1">
            <label class="text-xs font-semibold">Seleccionar Categoría:</label>
            <select
              onchange="window._excelPlanImportState.selectedCategoria = this.value; renderImportarPlanExcelModal()"
              class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-xs font-semibold"
            >
              ${categorias
                .map((c) => {
                  const cant = DB.atletas.filter((a) => a.categoria === c).length;
                  return `<option value="${c}" ${c === st.selectedCategoria ? 'selected' : ''}>Categoría ${c} (${cant} atletas)</option>`;
                })
                .join('')}
            </select>
          </div>
        `
            : `
          <div class="space-y-2 pt-1">
            <div class="flex items-center justify-between gap-2">
              <input
                type="text"
                value="${esc(st.manualSearch)}"
                oninput="window._excelPlanImportState.manualSearch = this.value; renderImportarPlanExcelModal()"
                placeholder="Filtrar atletas por nombre, categoría o disciplina…"
                class="h-8 flex-1 rounded-lg border bg-card px-2.5 text-xs"
              />
              <span class="text-xs font-semibold text-primary">${st.manualAtletaIds.length} seleccionados</span>
            </div>
            <div class="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto rounded-lg border bg-muted/20 p-2 sm:grid-cols-2">
              ${DB.atletas
                .filter((a) =>
                  `${a.apellido} ${a.nombre} ${a.categoria} ${(a.disciplinas || []).join(' ')}`
                    .toLowerCase()
                    .includes(st.manualSearch.trim().toLowerCase())
                )
                .sort((a, b) => a.apellido.localeCompare(b.apellido))
                .map((a) => {
                  const checked = st.manualAtletaIds.includes(a.id);
                  return `
                    <label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted">
                      <input
                        type="checkbox"
                        ${checked ? 'checked' : ''}
                        onchange="toggleExcelManualAtleta('${a.id}', this.checked)"
                        class="size-3.5 accent-primary"
                      />
                      <span class="truncate font-medium">${esc(a.apellido)}, ${esc(a.nombre)}</span>
                      <span class="ml-auto text-[10px] text-muted-foreground">${esc(a.categoria)}</span>
                    </label>
                  `;
                })
                .join('')}
            </div>
          </div>
        `
        }

        <div class="flex flex-wrap gap-4 border-t pt-2.5 text-xs">
          <label class="inline-flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              ${st.assignDisciplinaToTargets ? 'checked' : ''}
              onchange="window._excelPlanImportState.assignDisciplinaToTargets = this.checked"
              class="size-3.5 accent-primary"
            />
            <span>Vincular la disciplina <strong>${esc(st.metaDisciplina || st.selectedDisciplina)}</strong> en la ficha de los atletas</span>
          </label>
          <label class="inline-flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              ${st.addObjetivoToTargets ? 'checked' : ''}
              onchange="window._excelPlanImportState.addObjetivoToTargets = this.checked"
              class="size-3.5 accent-primary"
            />
            <span>Guardar el objetivo de la planilla (${esc(st.metaObjetivo || 'si figura en B6')}) en sus fichas</span>
          </label>
          <label class="inline-flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              ${st.replaceSameDates ? 'checked' : ''}
              onchange="window._excelPlanImportState.replaceSameDates = this.checked"
              class="size-3.5 accent-primary"
            />
            <span>Reemplazar sesiones previas en esas mismas fechas</span>
          </label>
        </div>
      </div>

      <!-- Paso 3: Vista previa de sesiones detectadas -->
      <div class="rounded-xl border bg-card">
        <div class="flex items-center justify-between border-b px-3.5 py-2.5">
          <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            3. Vista previa de sesiones a importar (${st.parsedSessions.length})
          </p>
        </div>
        ${
          st.parsedSessions.length === 0
            ? `<div class="p-6 text-center text-xs text-muted-foreground">
                ${
                  st.fileName
                    ? 'El archivo seleccionado tiene las filas de Actividad vacías. Completá al menos un día en la columna "Actividad / Desarrollo detallado" y volvé a subirlo.'
                    : 'Seleccioná un archivo Excel (.xlsx) arriba para previsualizar los días, fechas y actividades antes de importar.'
                }
              </div>`
            : `<div class="max-h-56 overflow-y-auto">
                <table class="w-full text-left text-xs">
                  <thead class="sticky top-0 border-b bg-muted text-[11px] font-semibold text-muted-foreground">
                    <tr>
                      <th class="px-3 py-2">Día / Fecha</th>
                      <th class="px-3 py-2">Actividad / Desarrollo detallado</th>
                      <th class="px-3 py-2">Objetivo</th>
                      <th class="px-3 py-2">Duración</th>
                      <th class="px-3 py-2">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y">
                    ${st.parsedSessions
                      .map(
                        (s) => `
                      <tr>
                        <td class="px-3 py-2 whitespace-nowrap">
                          <span class="font-semibold">${esc(s.diaLabel)}</span>
                          <span class="block text-[10px] font-mono text-muted-foreground">${Helpers.fechaCorta(s.fecha)}</span>
                        </td>
                        <td class="px-3 py-2">
                          <span class="font-medium text-foreground">${esc(s.actividadRaw || s.titulo)}</span>
                        </td>
                        <td class="px-3 py-2 text-muted-foreground">${esc(s.objetivoRaw || '—')}</td>
                        <td class="px-3 py-2 whitespace-nowrap font-mono">${esc(s.duracionRaw || (s.duracionMin ? s.duracionMin + ' min' : '—'))}</td>
                        <td class="px-3 py-2 text-muted-foreground">${esc(s.observacionesRaw || '—')}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>`
        }
      </div>

      <div class="flex justify-end gap-2 pt-1">
        <button type="button" onclick="closeModal()" class="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
          Cancelar
        </button>
        <button
          type="button"
          onclick="confirmImportPlanExcel()"
          ${st.parsedSessions.length === 0 ? 'disabled' : ''}
          class="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-40"
        >
          <i data-lucide="check" class="size-4"></i> Confirmar e Importar Planificación
        </button>
      </div>
    </div>
  `,
    'max-w-4xl'
  );
};

window.setExcelImportModo = (modo) => {
  window._excelPlanImportState.modoDestino = modo;
  renderImportarPlanExcelModal();
};

window.changeExcelImportDisciplina = (disc) => {
  window._excelPlanImportState.selectedDisciplina = disc;
  window._excelPlanImportState.metaDisciplina = disc;
  renderImportarPlanExcelModal();
};

window.toggleExcelManualAtleta = (atletaId, checked) => {
  const arr = window._excelPlanImportState.manualAtletaIds;
  if (checked && !arr.includes(atletaId)) arr.push(atletaId);
  if (!checked) {
    window._excelPlanImportState.manualAtletaIds = arr.filter((id) => id !== atletaId);
  }
};

window.updatePlanExcelMondayStart = (newDate) => {
  if (!newDate) return;
  const st = window._excelPlanImportState;
  st.mondayStart = newDate;
  if (st.rawRows.length > 0) {
    st.parsedSessions = parseExcelRowsToSessions(st.rawRows, st.mondayStart);
  }
  renderImportarPlanExcelModal();
};

window.handlePlanExcelFileSelect = (fileInput) => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  if (!window.XLSX) {
    showToast('La librería Excel aún se está cargando. Revisá tu conexión e intentá de nuevo.', 'info');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = window.XLSX.read(data, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[firstSheetName];
      const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      const st = window._excelPlanImportState;
      st.fileName = file.name;

      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const row = rows[i] || [];
        const colA = normalizeAscii(row[0]);
        const colB = String(row[1] || '').trim();
        if (colA === 'atleta' && colB) {
          st.metaAtleta = colB;
        } else if (colA === 'disciplina' && colB) {
          st.metaDisciplina = colB;
          st.selectedDisciplina = colB;
          if (
            Array.isArray(DB.disciplinasDisponibles) &&
            !DB.disciplinasDisponibles.some((d) => d.toLowerCase() === colB.toLowerCase())
          ) {
            DB.disciplinasDisponibles.push(colB);
          }
        } else if (colA === 'objetivo' && colB && headerRowIdx === -1) {
          st.metaObjetivo = colB;
        } else if (
          (colA === 'dia' || colA === 'fecha') &&
          normalizeAscii(row[1]).includes('actividad')
        ) {
          headerRowIdx = i;
          break;
        }
      }

      if (headerRowIdx === -1) {
        headerRowIdx = 6; // Fila 7 por defecto en Planilla de Carga.xlsx
      }

      // Intentar vincular automáticamente si el nombre en B4 coincide con un atleta de la base
      if (st.metaAtleta && !st.defaultAtletaId) {
        const metaNorm = normalizeAscii(st.metaAtleta);
        const matchAtleta = DB.atletas.find((a) => {
          const full1 = normalizeAscii(`${a.nombre} ${a.apellido}`);
          const full2 = normalizeAscii(`${a.apellido} ${a.nombre}`);
          const firstLast = normalizeAscii(`${a.nombre.split(' ')[0]} ${a.apellido.split(' ')[0]}`);
          return (
            full1 === metaNorm ||
            full2 === metaNorm ||
            firstLast === metaNorm ||
            full1.includes(metaNorm)
          );
        });
        if (matchAtleta) {
          st.selectedAtletaId = matchAtleta.id;
          st.modoDestino = 'individual';
        }
      }

      const rawRows = [];
      for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const r = rows[i] || [];
        rawRows.push({
          dia: r[0] ?? '',
          actividad: r[1] ?? '',
          objetivo: r[2] ?? '',
          duracion: r[3] ?? '',
          observaciones: r[4] ?? '',
        });
      }

      st.rawRows = rawRows;
      st.parsedSessions = parseExcelRowsToSessions(rawRows, st.mondayStart);
      renderImportarPlanExcelModal();
    } catch (err) {
      console.error('Error leyendo Excel:', err);
      alert('No se pudo leer el archivo Excel: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
};

window.confirmImportPlanExcel = () => {
  const st = window._excelPlanImportState;
  if (!st || st.parsedSessions.length === 0) {
    showToast('No hay sesiones con actividad para importar.', 'info');
    return;
  }

  let targets = [];
  if (st.modoDestino === 'individual') {
    const a = Helpers.getAtleta(st.selectedAtletaId);
    if (a) targets = [a];
  } else if (st.modoDestino === 'disciplina') {
    targets = DB.atletas.filter((a) =>
      Helpers.atletaPracticaDisciplina(a, st.selectedDisciplina)
    );
    if (targets.length === 0) {
      showToast(
        `Aún no hay atletas asignados a la disciplina "${st.selectedDisciplina}". Asignalos primero o usá Selección Manual.`,
        'info'
      );
      return;
    }
  } else if (st.modoDestino === 'categoria') {
    targets = DB.atletas.filter((a) => a.categoria === st.selectedCategoria);
  } else if (st.modoDestino === 'manual') {
    targets = DB.atletas.filter((a) => st.manualAtletaIds.includes(a.id));
  }

  if (targets.length === 0) {
    showToast('Seleccioná al menos un atleta destinatario.', 'info');
    return;
  }

  const discToAssign = (st.metaDisciplina || st.selectedDisciplina || '').trim();
  const objToAssign = (st.metaObjetivo || '').trim();
  const importedDates = new Set(st.parsedSessions.map((s) => s.fecha));

  targets.forEach((atleta, aIdx) => {
    // 1. Asignar disciplina si corresponde
    if (st.assignDisciplinaToTargets && discToAssign) {
      if (!Array.isArray(atleta.disciplinas)) atleta.disciplinas = [];
      if (!atleta.disciplinas.some((d) => d.toLowerCase() === discToAssign.toLowerCase())) {
        atleta.disciplinas.push(discToAssign);
      }
    }

    // 2. Guardar objetivo general (B6) en la ficha del atleta si no lo tenía
    if (st.addObjetivoToTargets && objToAssign) {
      if (!Array.isArray(atleta.objetivos)) atleta.objetivos = [];
      const objTexto = discToAssign ? `${discToAssign}: ${objToAssign}` : objToAssign;
      const yaExisteObj = atleta.objetivos.some(
        (o) => normalizeAscii(o.texto) === normalizeAscii(objTexto) || normalizeAscii(o.texto) === normalizeAscii(objToAssign)
      );
      if (!yaExisteObj) {
        atleta.objetivos.push({
          id: `obj-xls-${Date.now()}-${aIdx}`,
          texto: objTexto,
          tipo: 'entrenador',
          progreso: 0,
        });
      }
    }

    // 3. Cargar sesiones en el plan del atleta
    let planActual = DB.planes[atleta.id] || [];
    if (st.replaceSameDates) {
      planActual = planActual.filter((s) => !importedDates.has(s.fecha));
    }

    const nuevasSesiones = st.parsedSessions.map((s, sIdx) => ({
      id: `xls-${Date.now()}-${aIdx}-${sIdx}`,
      fecha: s.fecha,
      tipo: s.tipo,
      intensidad: s.intensidad,
      titulo: s.titulo,
      detalle: s.detalle,
      distanciaKm: s.distanciaKm,
      duracionMin: s.duracionMin,
      series: s.series,
      disciplina: discToAssign || undefined,
      estado: 'pendiente',
      modificada: false,
    }));

    DB.planes[atleta.id] = [...planActual, ...nuevasSesiones].sort((x, y) =>
      (x.fecha || '').localeCompare(y.fecha || '')
    );
  });

  saveDB();
  closeModal();
  showToast(
    `Se importaron ${st.parsedSessions.length} sesiones de entrenamiento para ${targets.length} atleta${
      targets.length === 1 ? '' : 's'
    }`
  );
  renderApp();
};

// Modal para asignar una disciplina en lote a múltiples atletas rápidamente
window.openAsignarDisciplinasLoteModal = (defaultDisciplina = 'Running') => {
  const disciplinasCatalogo =
    Array.isArray(DB.disciplinasDisponibles) && DB.disciplinasDisponibles.length > 0
      ? DB.disciplinasDisponibles
      : ['Running', 'Velocidad', 'Medio Fondo', 'Fondo', 'Cross / Trail', 'Saltos', 'Lanzamientos', 'Marcha', 'Iniciación Atlética'];

  window._loteDiscState = {
    disciplina: defaultDisciplina || disciplinasCatalogo[0],
    catFilter: 'Todas',
    search: '',
  };
  renderAsignarDisciplinasLoteModal();
};

window.renderAsignarDisciplinasLoteModal = () => {
  const st = window._loteDiscState;
  const disciplinasCatalogo =
    Array.isArray(DB.disciplinasDisponibles) && DB.disciplinasDisponibles.length > 0
      ? DB.disciplinasDisponibles
      : ['Running', 'Velocidad', 'Medio Fondo', 'Fondo', 'Cross / Trail', 'Saltos', 'Lanzamientos', 'Marcha', 'Iniciación Atlética'];
  const categorias = ['Todas', 'Infantiles', 'U12', 'U14', 'U16', 'U18', 'U20', 'Mayores'];

  const atletasFiltrados = DB.atletas
    .filter((a) => {
      const mCat = st.catFilter === 'Todas' || a.categoria === st.catFilter;
      const mSearch = `${a.apellido} ${a.nombre} ${a.dni || ''}`
        .toLowerCase()
        .includes(st.search.trim().toLowerCase());
      return mCat && mSearch;
    })
    .sort((a, b) => a.apellido.localeCompare(b.apellido));

  const totalConDisciplina = DB.atletas.filter(
    (a) => Array.isArray(a.disciplinas) && a.disciplinas.includes(st.disciplina)
  ).length;

  showModalHtml(
    `
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold">Asignar Disciplinas a los Atletas</h2>
        <p class="text-xs text-muted-foreground">
          Definí rápidamente qué atletas entrenan cada disciplina para poder importarles planes grupales desde Excel.
        </p>
      </div>
      <button type="button" onclick="closeModal()" class="text-muted-foreground hover:text-foreground">✕</button>
    </div>

    <div class="mt-4 space-y-4">
      <div class="grid gap-3 rounded-xl border bg-primary/5 p-3.5 sm:grid-cols-[1fr_auto]">
        <div>
          <label class="text-xs font-bold uppercase tracking-wide text-primary">Disciplina seleccionada (Running · Pista · Campo)</label>
          <select
            onchange="window._loteDiscState.disciplina = this.value; renderAsignarDisciplinasLoteModal()"
            class="mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm font-semibold"
          >
            ${renderSelectDisciplinasOptions(st.disciplina)}
          </select>
        </div>
        <div class="flex items-end gap-2">
          <input id="lote-nueva-disc" placeholder="Nueva disciplina…" class="h-10 w-40 rounded-lg border bg-card px-2.5 text-xs" />
          <button
            type="button"
            onclick="crearDisciplinaDesdeLote()"
            class="h-10 rounded-lg border bg-card px-3 text-xs font-semibold hover:bg-muted"
          >
            + Crear
          </button>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap gap-1">
          ${categorias
            .map(
              (c) => `
            <button
              type="button"
              onclick="window._loteDiscState.catFilter = '${c}'; renderAsignarDisciplinasLoteModal()"
              class="rounded-full border px-2.5 py-1 text-xs font-medium ${
                st.catFilter === c ? 'border-ink bg-ink text-ink-foreground' : 'bg-card hover:bg-muted'
              }"
            >
              ${c}
            </button>
          `
            )
            .join('')}
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick="marcarTodosDisciplinaVisible(true)"
            class="rounded-md border bg-card px-2.5 py-1 text-xs font-semibold hover:bg-muted"
          >
            Marcar visibles (${atletasFiltrados.length})
          </button>
          <button
            type="button"
            onclick="marcarTodosDisciplinaVisible(false)"
            class="rounded-md border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            Desmarcar visibles
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between gap-2">
        <input
          type="text"
          value="${esc(st.search)}"
          oninput="window._loteDiscState.search = this.value; renderAsignarDisciplinasLoteModal()"
          placeholder="Buscar atleta por apellido o nombre…"
          class="h-9 flex-1 rounded-lg border bg-card px-3 text-xs"
        />
        <span class="text-xs font-semibold text-primary">${totalConDisciplina} atletas en ${esc(st.disciplina)}</span>
      </div>

      <div class="grid max-h-64 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border bg-muted/20 p-2.5 sm:grid-cols-2">
        ${atletasFiltrados
          .map((a) => {
            const hasDisc = Array.isArray(a.disciplinas) && a.disciplinas.includes(st.disciplina);
            return `
              <label class="flex cursor-pointer items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-xs transition-colors hover:border-primary">
                <input
                  type="checkbox"
                  ${hasDisc ? 'checked' : ''}
                  onchange="toggleAtletaDisciplinaLote('${a.id}', this.checked)"
                  class="size-4 accent-primary"
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate font-semibold">${esc(a.apellido)}, ${esc(a.nombre)}</p>
                  <p class="text-[10px] text-muted-foreground">${esc(a.categoria)} · ${(a.disciplinas || []).join(', ') || 'Sin disciplinas'}</p>
                </div>
              </label>
            `;
          })
          .join('')}
      </div>

      <div class="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onclick="saveDB(); closeModal(); showToast('Disciplinas guardadas'); renderApp()"
          class="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
        >
          Listo y Guardar
        </button>
      </div>
    </div>
  `,
    'max-w-3xl'
  );
};

window.crearDisciplinaDesdeLote = () => {
  const inp = document.getElementById('lote-nueva-disc');
  const val = inp ? inp.value.trim() : '';
  if (!val) return;
  if (!Array.isArray(DB.disciplinasDisponibles)) DB.disciplinasDisponibles = [];
  if (!DB.disciplinasDisponibles.some((d) => d.toLowerCase() === val.toLowerCase())) {
    DB.disciplinasDisponibles.push(val);
  }
  window._loteDiscState.disciplina = val;
  saveDB();
  renderAsignarDisciplinasLoteModal();
};

window.toggleAtletaDisciplinaLote = (atletaId, checked) => {
  const disc = window._loteDiscState.disciplina;
  const a = Helpers.getAtleta(atletaId);
  if (!a) return;
  if (!Array.isArray(a.disciplinas)) a.disciplinas = [];
  if (checked && !a.disciplinas.includes(disc)) {
    a.disciplinas.push(disc);
  } else if (!checked) {
    a.disciplinas = a.disciplinas.filter((d) => d !== disc);
  }
  renderAsignarDisciplinasLoteModal();
};

window.marcarTodosDisciplinaVisible = (checked) => {
  const st = window._loteDiscState;
  const disc = st.disciplina;
  DB.atletas.forEach((a) => {
    const mCat = st.catFilter === 'Todas' || a.categoria === st.catFilter;
    const mSearch = `${a.apellido} ${a.nombre} ${a.dni || ''}`
      .toLowerCase()
      .includes(st.search.trim().toLowerCase());
    if (mCat && mSearch) {
      if (!Array.isArray(a.disciplinas)) a.disciplinas = [];
      if (checked && !a.disciplinas.includes(disc)) {
        a.disciplinas.push(disc);
      } else if (!checked) {
        a.disciplinas = a.disciplinas.filter((d) => d !== disc);
      }
    }
  });
  renderAsignarDisciplinasLoteModal();
};

// 2. Modal de Registro del Atleta (Mobile-First: Lo hice / No pude + Resultados reales de la sesión + Esfuerzo RPE + Comentarios)
let tempRegHecho = true;
let tempRegSensacion = 4;
let tempRegResultadoReal = '';
let tempRegDistanciaReal = '';
let tempRegTiempoReal = '';

window.openRegistroModal = (atletaId, sesionId, defaultHecho) => {
  const sesion = (DB.planes[atletaId] || []).find((s) => s.id === sesionId);
  if (!sesion) return;
  if (defaultHecho !== undefined) {
    tempRegHecho = Boolean(defaultHecho);
  } else {
    tempRegHecho = sesion.estado !== 'no-realizado';
  }
  tempRegSensacion = sesion.sensacion || 4;
  tempRegResultadoReal = sesion.resultadoReal || '';
  tempRegDistanciaReal = sesion.distanciaRealKm != null ? String(sesion.distanciaRealKm) : (sesion.distanciaKm != null ? String(sesion.distanciaKm) : '');
  tempRegTiempoReal = sesion.tiempoRealMin != null ? String(sesion.tiempoRealMin) : (sesion.duracionMin != null ? String(sesion.duracionMin) : '');
  renderRegistroModalContent(atletaId, sesion);
};

window.setRegQuickResultado = (text) => {
  const inp = document.getElementById('reg-resultado');
  if (inp) {
    if (inp.value.trim()) {
      inp.value = `${inp.value.trim()} · ${text}`;
    } else {
      inp.value = text;
    }
  }
};

window.setRegQuickMotivo = (text) => {
  const textarea = document.getElementById('reg-com');
  if (textarea) {
    textarea.value = text;
  }
};

function renderRegistroModalContent(atletaId, sesion) {
  const caras = [
    { num: 1, emoji: '😣', label: '1 · Muy suave', desc: 'Sin esfuerzo' },
    { num: 2, emoji: '😕', label: '2 · Cómodo', desc: 'Ritmo suave' },
    { num: 3, emoji: '😐', label: '3 · Moderado', desc: 'Esfuerzo medio' },
    { num: 4, emoji: '🙂', label: '4 · Exigente', desc: 'Ritmo fuerte' },
    { num: 5, emoji: '💪', label: '5 · Máximo', desc: 'Todo dado' },
  ];

  const comentarioActual = document.getElementById('reg-com')?.value ?? (sesion.comentario || '');
  const resActual = document.getElementById('reg-resultado')?.value ?? (tempRegResultadoReal || '');
  const distActual = document.getElementById('reg-dist')?.value ?? (tempRegDistanciaReal || '');
  const tiempoActual = document.getElementById('reg-tiempo')?.value ?? (tempRegTiempoReal || '');

  showModalHtml(`
    <div class="flex items-start justify-between gap-3">
      <div>
        <span class="inline-flex items-center gap-1.5 rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
          <i data-lucide="clipboard-check" class="size-3"></i> Informe de Entrenamiento
        </span>
        <h2 class="mt-1 font-display text-2xl font-extrabold uppercase leading-tight sm:text-3xl">${esc(sesion.titulo)}</h2>
        <p class="text-xs text-muted-foreground">
          ${Helpers.fechaCorta(sesion.fecha)} · ${esc(sesion.tipo || 'Sesión')}${sesion.disciplina ? ` · 🏃 ${esc(sesion.disciplina)}` : ''}
        </p>
      </div>
      <button type="button" onclick="closeModal()" class="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">✕</button>
    </div>

    <div class="mt-4 space-y-4">
      <!-- Selector Estado: Lo hice / No pude (Botones táctiles grandes) -->
      <div>
        <label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
          ¿Pudiste realizar la sesión hoy?
        </label>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            onclick="setRegHecho(true, '${atletaId}', '${sesion.id}')"
            class="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 py-3 px-2 text-sm font-extrabold transition-all ${
              tempRegHecho
                ? 'border-success bg-success-soft text-success shadow-xs scale-[1.01]'
                : 'border-border bg-card text-muted-foreground hover:bg-muted'
            }"
          >
            <i data-lucide="check-circle-2" class="size-5"></i>
            ✓ ¡Completado!
          </button>
          <button
            type="button"
            onclick="setRegHecho(false, '${atletaId}', '${sesion.id}')"
            class="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 py-3 px-2 text-sm font-extrabold transition-all ${
              !tempRegHecho
                ? 'border-destructive bg-destructive/10 text-destructive shadow-xs scale-[1.01]'
                : 'border-border bg-card text-muted-foreground hover:bg-muted'
            }"
          >
            <i data-lucide="x-circle" class="size-5"></i>
            ✕ No pude entrenar
          </button>
        </div>
      </div>

      ${
        tempRegHecho
          ? `
          <!-- Bloque de Resultados Reales -->
          <div class="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-primary">
                📊 Resultados reales de la sesión
              </p>
              <p class="text-[11px] text-muted-foreground">
                Indicá tus tiempos en las pasadas, metros conseguidos o distancia y ritmo real para tu entrenador.
              </p>
            </div>

            <div>
              <label for="reg-resultado" class="text-xs font-semibold block mb-1">
                Tiempos de pasadas / marcas en campo / ritmo:
              </label>
              <input
                id="reg-resultado"
                value="${esc(resActual)}"
                placeholder="Ej.: 6x400m en 1:16, 1:15, 1:14... o Jabalina 38.50 m o 10 km a 4:35/km"
                class="h-10 w-full rounded-lg border bg-card px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
              />
              <div class="mt-1.5 flex flex-wrap gap-1">
                <button type="button" onclick="setRegQuickResultado('Completé todas las series al ritmo')" class="rounded bg-card border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground">
                  + Todas al ritmo
                </button>
                <button type="button" onclick="setRegQuickResultado('Series progresivas')" class="rounded bg-card border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground">
                  + Progresivas
                </button>
                <button type="button" onclick="setRegQuickResultado('Más rápido de lo previsto')" class="rounded bg-card border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground">
                  + Más rápido
                </button>
                <button type="button" onclick="setRegQuickResultado('Buenas sensaciones de fuerza')" class="rounded bg-card border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground">
                  + Mucha fuerza
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label for="reg-dist" class="text-[11px] font-semibold text-muted-foreground block">Distancia real (km opcional)</label>
                <input
                  id="reg-dist"
                  type="number"
                  step="0.1"
                  value="${esc(distActual)}"
                  placeholder="Ej.: 8.5"
                  class="mt-0.5 h-9 w-full rounded-lg border bg-card px-2.5 text-sm font-mono"
                />
              </div>
              <div>
                <label for="reg-tiempo" class="text-[11px] font-semibold text-muted-foreground block">Tiempo real (minutos)</label>
                <input
                  id="reg-tiempo"
                  type="number"
                  step="1"
                  value="${esc(tiempoActual)}"
                  placeholder="Ej.: 42"
                  class="mt-0.5 h-9 w-full rounded-lg border bg-card px-2.5 text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <!-- Escala de Esfuerzo Percibido RPE -->
          <fieldset class="space-y-2">
            <legend class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              💪 ¿Cómo te sentiste? (Escala de esfuerzo RPE)
            </legend>
            <div class="grid grid-cols-5 gap-1.5 sm:gap-2">
              ${caras
                .map((c) => {
                  const isSel = tempRegSensacion === c.num;
                  return `
                    <button
                      type="button"
                      onclick="setRegSensacion(${c.num}, '${atletaId}', '${sesion.id}')"
                      class="flex flex-col items-center justify-center rounded-xl border-2 py-2 px-1 transition-all ${
                        isSel
                          ? 'border-primary bg-primary/10 text-primary shadow-xs scale-105'
                          : 'border-border bg-card opacity-70 hover:opacity-100 hover:border-primary/50'
                      }"
                    >
                      <span class="text-2xl sm:text-3xl">${c.emoji}</span>
                      <span class="mt-1 text-[11px] font-bold leading-tight">${c.num}</span>
                      <span class="hidden text-[9px] font-medium text-muted-foreground sm:inline">${c.desc}</span>
                    </button>
                  `;
                })
                .join('')}
            </div>
            <p class="text-center text-xs font-bold text-primary">
              ${caras.find((c) => c.num === tempRegSensacion)?.label || ''}
            </p>
          </fieldset>
          `
          : `
          <!-- Bloque cuando NO pudo entrenar -->
          <div class="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 space-y-2.5">
            <p class="text-xs font-bold uppercase tracking-wide text-destructive">
              ✕ Motivo por el cual no pudiste entrenar
            </p>
            <p class="text-[11px] text-muted-foreground">
              Avisale al entrenador Cristian para que pueda adaptar los descansos y la carga de tu semana:
            </p>
            <div class="flex flex-wrap gap-1">
              <button type="button" onclick="setRegQuickMotivo('Molestia muscular en la pierna / dolor')" class="rounded-md border bg-card px-2 py-1 text-xs font-medium hover:border-destructive">
                🦵 Molestia muscular
              </button>
              <button type="button" onclick="setRegQuickMotivo('Examen y estudio para la escuela/facultad')" class="rounded-md border bg-card px-2 py-1 text-xs font-medium hover:border-destructive">
                📚 Examen / Estudio
              </button>
              <button type="button" onclick="setRegQuickMotivo('Clima adverso (lluvia torrencial / temporal de viento)')" class="rounded-md border bg-card px-2 py-1 text-xs font-medium hover:border-destructive">
                🌧️ Lluvia / Viento
              </button>
              <button type="button" onclick="setRegQuickMotivo('Complicación de horario o trabajo familiar')" class="rounded-md border bg-card px-2 py-1 text-xs font-medium hover:border-destructive">
                ⏰ Horario / Trabajo
              </button>
              <button type="button" onclick="setRegQuickMotivo('Enfermedad / estado gripal')" class="rounded-md border bg-card px-2 py-1 text-xs font-medium hover:border-destructive">
                🤒 Gripe / Salud
              </button>
            </div>
          </div>
          `
      }

      <!-- Comentario libre -->
      <div class="space-y-1">
        <label for="reg-com" class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          ${tempRegHecho ? '💬 Comentario adicional para tu entrenador (opcional)' : '💬 Explicación detallada para el entrenador'}
        </label>
        <textarea
          id="reg-com"
          rows="3"
          placeholder="${
            tempRegHecho
              ? '¿Cómo estuvo el viento, el calzado, alguna molestia que quieras que sepa Cristian?'
              : 'Detallá aquí qué pasó o cuándo pensás recuperar la sesión…'
          }"
          class="w-full rounded-xl border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
        >${esc(comentarioActual)}</textarea>
      </div>

      <!-- Botones de Acción (Grandes para el celular) -->
      <div class="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button
          type="button"
          onclick="closeModal()"
          class="flex min-h-11 items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          type="button"
          onclick="saveRegistroModal('${atletaId}', '${sesion.id}')"
          class="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-extrabold text-primary-foreground shadow-sm hover:opacity-95"
        >
          <i data-lucide="send" class="size-4"></i>
          Guardar e informar al entrenador
        </button>
      </div>
    </div>
  `);
}

window.setRegHecho = (val, atletaId, sesionId) => {
  tempRegHecho = val;
  const sesion = (DB.planes[atletaId] || []).find((s) => s.id === sesionId);
  renderRegistroModalContent(atletaId, sesion);
};

window.setRegSensacion = (val, atletaId, sesionId) => {
  tempRegSensacion = val;
  const sesion = (DB.planes[atletaId] || []).find((s) => s.id === sesionId);
  renderRegistroModalContent(atletaId, sesion);
};

window.saveRegistroModal = (atletaId, sesionId) => {
  const sesion = (DB.planes[atletaId] || []).find((s) => s.id === sesionId);
  if (!sesion) return;

  const com = document.getElementById('reg-com')?.value.trim();
  const resReal = document.getElementById('reg-resultado')?.value.trim();
  const distReal = document.getElementById('reg-dist')?.value.trim();
  const tiempoReal = document.getElementById('reg-tiempo')?.value.trim();

  sesion.estado = tempRegHecho ? 'realizado' : 'no-realizado';
  sesion.resultadoReal = tempRegHecho && resReal ? resReal : undefined;
  sesion.distanciaRealKm = tempRegHecho && distReal ? parseFloat(distReal) : undefined;
  sesion.tiempoRealMin = tempRegHecho && tiempoReal ? parseFloat(tiempoReal) : undefined;
  sesion.sensacion = tempRegHecho ? tempRegSensacion : undefined;
  sesion.comentario = com || undefined;
  sesion.fechaInforme = DB.hoy;

  // Recalcular porcentaje de adherencia del atleta automáticamente
  const atleta = Helpers.getAtleta(atletaId);
  if (atleta) {
    const activas = (DB.planes[atletaId] || []).filter((s) => s.tipo !== 'Descanso');
    if (activas.length > 0) {
      const hechas = activas.filter((s) => s.estado === 'realizado').length;
      atleta.adherencia = Math.round((hechas / activas.length) * 100);
    }
  }

  saveDB();
  closeModal();
  showToast(
    sesion.estado === 'realizado'
      ? '¡Entrenamiento registrado! Tu entrenador Cristian ya puede ver los resultados.'
      : 'Aviso guardado para el entrenador'
  );
  renderApp();
};

// 3. Modal de Nuevo Atleta (con DNI, cálculo automático de usuario nombre.apellido y categoría)
window.autoFillNuevoAtletaCreds = () => {
  const nom = (document.getElementById('na-nombre')?.value || '').trim().split(/\s+/)[0] || '';
  const ape = (document.getElementById('na-apellido')?.value || '').trim().split(/\s+/)[0] || '';
  const dni = (document.getElementById('na-dni')?.value || '').replace(/\./g, '').trim();
  if (nom && ape) {
    const clean = (s) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
    document.getElementById('na-user').value = `${clean(nom)}.${clean(ape)}`;
  }
  if (dni) {
    document.getElementById('na-pass').value = dni;
  }
};

window.openNuevoAtletaModal = () => {
  const disciplinasCatalogo =
    Array.isArray(DB.disciplinasDisponibles) && DB.disciplinasDisponibles.length > 0
      ? DB.disciplinasDisponibles
      : ['Running', 'Velocidad', 'Medio Fondo', 'Fondo', 'Cross / Trail', 'Saltos', 'Lanzamientos', 'Marcha', 'Iniciación Atlética'];

  showModalHtml(`
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold">Nuevo atleta</h2>
        <p class="text-sm text-muted-foreground">Sumá un corredor a la Escuela Municipal Willilefche.</p>
      </div>
      <button type="button" onclick="closeModal()" class="text-muted-foreground hover:text-foreground">✕</button>
    </div>
    <form onsubmit="saveNuevoAtleta(event)" class="mt-4 grid gap-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium">Nombre(s)</label>
          <input id="na-nombre" required oninput="autoFillNuevoAtletaCreds()" placeholder="Ej.: Alejo Efraín" class="h-9 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
        <div>
          <label class="text-xs font-medium">Apellido(s)</label>
          <input id="na-apellido" required oninput="autoFillNuevoAtletaCreds()" placeholder="Ej.: Rivas Abrate" class="h-9 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="text-xs font-medium">DNI</label>
          <input id="na-dni" required oninput="autoFillNuevoAtletaCreds()" placeholder="50.744.971" class="h-9 w-full rounded-lg border bg-card px-3 text-sm font-mono" />
        </div>
        <div>
          <label class="text-xs font-medium">Fecha Nac.</label>
          <input id="na-fnac" type="date" required value="2012-05-15" onchange="document.getElementById('na-cat').value = Helpers.calcularCategoria(this.value)" class="h-9 w-full rounded-lg border bg-card px-2 text-sm" />
        </div>
        <div>
          <label class="text-xs font-medium">Categoría</label>
          <select id="na-cat" class="h-9 w-full rounded-lg border bg-card px-2 text-sm">
            <option value="Infantiles">Infantiles</option>
            <option value="U12">U12</option>
            <option value="U14">U14</option>
            <option value="U16" selected>U16</option>
            <option value="U18">U18</option>
            <option value="U20">U20</option>
            <option value="Mayores">Mayores</option>
            <option value="Master A">Master A</option>
            <option value="Master B">Master B</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-2.5">
        <div>
          <label class="text-xs font-semibold">Usuario (nombre.apellido)</label>
          <input id="na-user" required placeholder="alejo.rivas" class="mt-1 h-8 w-full rounded-md border bg-card px-2.5 text-xs font-mono" />
        </div>
        <div>
          <label class="text-xs font-semibold">Contraseña (DNI sin puntos)</label>
          <input id="na-pass" required placeholder="50744971" class="mt-1 h-8 w-full rounded-md border bg-card px-2.5 text-xs font-mono" />
        </div>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="text-xs font-medium">Género</label>
          <select id="na-genero" class="h-9 w-full rounded-lg border bg-card px-2 text-sm">
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium">Nivel</label>
          <select id="na-nivel" class="h-9 w-full rounded-lg border bg-card px-2 text-sm">
            <option>Inicial</option>
            <option selected>Intermedio</option>
            <option>Avanzado</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium">Teléfono</label>
          <input id="na-tel" placeholder="+54 2920 ..." class="h-9 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
      </div>
      <div id="escalera-container-nuevo-atleta" class="max-h-72 overflow-y-auto">
        ${renderEscaleraDisciplinasAtleta('nuevo-atleta', null, true)}
      </div>
      <div>
        <label class="text-xs font-medium">Tutor / Familia (si es menor de edad)</label>
        <input id="na-tutor" placeholder="Ej.: Familia Rivas (dejar vacío si es mayor de 18)" class="h-9 w-full rounded-lg border bg-card px-3 text-sm" />
      </div>
      <div class="mt-2 flex justify-end gap-2">
        <button type="button" onclick="closeModal()" class="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
        <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">Crear ficha</button>
      </div>
    </form>
  `);
};

window.saveNuevoAtleta = (e) => {
  e.preventDefault();
  const nombre = document.getElementById('na-nombre').value.trim();
  const apellido = document.getElementById('na-apellido').value.trim();
  const dni = document.getElementById('na-dni').value.trim();
  const usuario = document.getElementById('na-user').value.trim().toLowerCase();
  const password = (document.getElementById('na-pass')?.value || '').trim() || dni;
  const fnac = document.getElementById('na-fnac').value;
  const stEsc = getEscaleraState('nuevo-atleta', null, false);
  const builtEsc = buildAtletaFieldsFromEscaleraState(stEsc);
  const id = `${nombre}-${apellido}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
  const tutorStr = document.getElementById('na-tutor').value.trim();
  const primerApellidoSlug = apellido
    .split(/\s+/)[0]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  const idAleatorio =
    typeof generarAtletaId === 'function'
      ? generarAtletaId()
      : `atl_${Math.random().toString(36).slice(2, 10)}`;

  const nuevo = {
    id: idAleatorio,
    legacyId: `${id}-${Date.now().toString().slice(-3)}`,
    nroNomina: DB.atletas.length + 1,
    nombre,
    apellido,
    dni,
    usuario,
    fechaNacimiento: fnac,
    genero: document.getElementById('na-genero').value,
    categoria: document.getElementById('na-cat').value,
    nivel: document.getElementById('na-nivel').value,
    tiposAtleta: builtEsc.tiposAtleta,
    disciplinas: builtEsc.disciplinas,
    pruebas: builtEsc.pruebas,
    ciudad: 'Valcheta',
    email: '',
    telefono: document.getElementById('na-tel').value.trim(),
    contactoEmergencia: tutorStr || `Familia ${apellido}`,
    tutor:
      tutorStr || Helpers.edad(fnac) < 18
        ? {
            nombre: tutorStr || `Familia ${apellido}`,
            vinculo: 'Tutor/a',
            email: '',
            usuario: `familia.${primerApellidoSlug}`,
            }
        : undefined,
    ingreso: DB.hoy,
    antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
    salud: 'Apto físico en seguimiento.',
    objetivos: [],
    marcas: [],
    resultados: [],
    evolucion: [],
    extra: [],
    adherencia: 100,
  };

  DB.atletas.push(nuevo);
  DB.planes[nuevo.id] = [];
  saveDB();
  closeModal();
  showToast(`Ficha de ${nombre} ${apellido} creada`);
  location.hash = `#/entrenador/atletas/${nuevo.id}`;
};

// 4. Modal de Nueva Competencia
window.openNuevaCompetenciaModal = () => {
  showModalHtml(`
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold">Nueva competencia</h2>
        <p class="text-sm text-muted-foreground">Agregá una fecha al calendario del equipo.</p>
      </div>
      <button type="button" onclick="closeModal()" class="text-muted-foreground hover:text-foreground">✕</button>
    </div>
    <form onsubmit="saveNuevaCompetencia(event)" class="mt-4 grid gap-3">
      <div>
        <label class="text-xs font-medium">Nombre de la competencia</label>
        <input id="nc-nombre" required placeholder="Ej.: Torneo Provincial de Pista" class="h-10 w-full rounded-lg border bg-card px-3 text-sm" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium">Fecha</label>
          <input id="nc-fecha" type="date" required value="${DB.hoy}" class="h-10 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
        <div>
          <label class="text-xs font-medium">Tipo</label>
          <select id="nc-tipo" class="h-10 w-full rounded-lg border bg-card px-3 text-sm">
            <option>Pista y Campo</option>
            <option>Pista</option>
            <option>Campo</option>
            <option>Calle</option>
            <option>Cross</option>
            <option>Trail</option>
          </select>
        </div>
      </div>
      <div>
        <label class="text-xs font-medium">Lugar</label>
        <input id="nc-lugar" required placeholder="Valcheta, Río Negro" class="h-10 w-full rounded-lg border bg-card px-3 text-sm" />
      </div>
      <div>
        <label class="text-xs font-medium">Pruebas / Distancias (separadas por coma)</label>
        <input id="nc-dist" required value="80 m, 150 m, 800 m, 1500 m, Salto en Largo, Lanzamiento de Jabalina, Bala" class="h-10 w-full rounded-lg border bg-card px-3 text-sm" />
      </div>
      <div class="mt-2 flex justify-end gap-2">
        <button type="button" onclick="closeModal()" class="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
        <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">Guardar competencia</button>
      </div>
    </form>
  `);
};

window.saveNuevaCompetencia = (e) => {
  e.preventDefault();
  const nombre = document.getElementById('nc-nombre').value.trim();
  const distancias = document
    .getElementById('nc-dist')
    .value.split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  DB.competencias.push({
    id: `c-${Date.now()}`,
    nombre,
    fecha: document.getElementById('nc-fecha').value,
    tipo: document.getElementById('nc-tipo').value,
    lugar: document.getElementById('nc-lugar').value.trim(),
    distancias: distancias.length ? distancias : ['1500 m'],
    inscriptos: [],
    sugeridos: [],
  });
  DB.competencias.sort((a, b) => a.fecha.localeCompare(b.fecha));
  saveDB();
  closeModal();
  showToast('Competencia agregada al calendario');
  renderApp();
};

// 5. Configuración de Conceptos y Valores de Cobro (Cuota, Indumentaria, Viajes y Competencias, y nuevos conceptos)
window.openConceptosCobroModal = () => {
  const lista = getConceptosCobroList();
  showModalHtml(
    `
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold">Conceptos y Valores de Cobro</h2>
        <p class="text-sm text-muted-foreground">Configurá los valores base de Cuota, Indumentaria, Viajes y Competencias, o creá nuevos conceptos.</p>
      </div>
      <button type="button" onclick="closeModal()" class="text-muted-foreground hover:text-foreground">✕</button>
    </div>

    <div class="mt-4 space-y-5">
      <form onsubmit="guardarValoresConceptos(event)" class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conceptos activos (editá los montos y guardá)</p>
        <div class="space-y-2.5">
          ${lista
            .map(
              (c, idx) => `
            <div class="grid items-center gap-2 rounded-xl border bg-muted/25 p-3 sm:grid-cols-[1fr_8.5rem_1fr_auto]">
              <div>
                <label class="text-[11px] font-medium text-muted-foreground">Concepto</label>
                <input
                  id="cc-nombre-${idx}"
                  required
                  value="${esc(c.nombre)}"
                  class="mt-0.5 h-9 w-full rounded-lg border bg-card px-2.5 text-sm font-semibold"
                />
              </div>
              <div>
                <label class="text-[11px] font-medium text-muted-foreground">Valor base ($)</label>
                <input
                  id="cc-monto-${idx}"
                  type="number"
                  min="0"
                  required
                  value="${Number(c.montoSugerido) || 0}"
                  class="mt-0.5 h-9 w-full rounded-lg border bg-card px-2.5 text-sm font-mono font-semibold"
                />
              </div>
              <div>
                <label class="text-[11px] font-medium text-muted-foreground">Detalle por defecto</label>
                <input
                  id="cc-detalle-${idx}"
                  value="${esc(c.detalleSugerido || '')}"
                  placeholder="Ej.: Cuota mensual"
                  class="mt-0.5 h-9 w-full rounded-lg border bg-card px-2.5 text-xs"
                />
              </div>
              <div class="pt-4 text-right">
                ${
                  lista.length > 1
                    ? `<button type="button" onclick="eliminarConceptoCobro('${c.id}')" class="rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10" title="Eliminar concepto">✕</button>`
                    : ''
                }
              </div>
            </div>
          `
            )
            .join('')}
        </div>
        <div class="flex justify-end">
          <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95">
            Guardar cambios en valores
          </button>
        </div>
      </form>

      <form onsubmit="agregarNuevoConceptoCobro(event)" class="rounded-xl border bg-card p-4 space-y-3">
        <p class="text-sm font-bold">+ Crear nuevo concepto de cobro</p>
        <div class="grid gap-2.5 sm:grid-cols-3">
          <div>
            <label class="text-xs font-medium">Nombre del concepto *</label>
            <input id="nuevo-cc-nombre" required placeholder="Ej.: Seguro Deportivo / Torneo" class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-sm" />
          </div>
          <div>
            <label class="text-xs font-medium">Valor sugerido (ARS) *</label>
            <input id="nuevo-cc-monto" type="number" min="0" required placeholder="10000" class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-sm font-mono" />
          </div>
          <div>
            <label class="text-xs font-medium">Detalle sugerido</label>
            <input id="nuevo-cc-detalle" placeholder="Ej.: Cobertura anual" class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-sm" />
          </div>
        </div>
        <div class="flex justify-end">
          <button type="submit" class="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3.5 py-2 text-xs font-semibold text-secondary-foreground hover:opacity-90">
            <i data-lucide="plus" class="size-3.5"></i> Agregar concepto al sistema
          </button>
        </div>
      </form>
    </div>
  `,
    'max-w-2xl'
  );
};

window.guardarValoresConceptos = (e) => {
  e.preventDefault();
  const lista = getConceptosCobroList();
  lista.forEach((c, idx) => {
    const nomEl = document.getElementById(`cc-nombre-${idx}`);
    const monEl = document.getElementById(`cc-monto-${idx}`);
    const detEl = document.getElementById(`cc-detalle-${idx}`);
    if (nomEl && nomEl.value.trim()) c.nombre = nomEl.value.trim();
    if (monEl) c.montoSugerido = Number(monEl.value) || 0;
    if (detEl) c.detalleSugerido = detEl.value.trim();
  });
  saveDB();
  closeModal();
  showToast('Valores y conceptos de cobro actualizados');
  renderApp();
};

window.agregarNuevoConceptoCobro = (e) => {
  e.preventDefault();
  const nombre = document.getElementById('nuevo-cc-nombre').value.trim();
  const monto = Number(document.getElementById('nuevo-cc-monto').value) || 0;
  const detalle = document.getElementById('nuevo-cc-detalle').value.trim() || nombre;
  if (!nombre) return;
  const lista = getConceptosCobroList();
  lista.push({
    id: `cc-${Date.now()}`,
    nombre,
    montoSugerido: monto,
    detalleSugerido: detalle,
  });
  saveDB();
  showToast(`Concepto "${nombre}" creado`);
  openConceptosCobroModal();
  renderApp();
};

window.eliminarConceptoCobro = (id) => {
  const lista = getConceptosCobroList();
  if (lista.length <= 1) return;
  DB.conceptosCobro = lista.filter((c) => c.id !== id);
  saveDB();
  showToast('Concepto eliminado');
  openConceptosCobroModal();
  renderApp();
};

// Modal de Nuevo / Editar Cobro (individual o masivo a toda la escuela / categoría)
window.openNuevoCobroModal = (preselectedAtletaId = null, editPagoId = null, preselectedConcepto = null) => {
  const catalogo = getConceptosCobroList();
  const existing = editPagoId ? DB.pagos.find((p) => p.id === editPagoId) : null;

  const conceptoInicial =
    existing?.concepto ||
    preselectedConcepto ||
    catalogo[0]?.nombre ||
    'Cuota';
  const objConcepto = catalogo.find((c) => c.nombre === conceptoInicial) || catalogo[0] || { montoSugerido: 15000, detalleSugerido: 'Cuota mensual' };
  const montoInicial = existing ? existing.monto : objConcepto.montoSugerido;
  const detalleInicial = existing ? existing.detalle : objConcepto.detalleSugerido || conceptoInicial;
  const vencInicial = existing ? existing.vencimiento : DB.hoy;
  const estadoInicial = existing ? existing.estado : 'pendiente';
  const targetAtletaId = existing ? existing.atletaId : preselectedAtletaId || (DB.atletas[0]?.id || '');

  const categoriasDisponibles = Array.from(new Set(DB.atletas.map((a) => a.categoria).filter(Boolean)));

  showModalHtml(`
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold">${existing ? 'Editar cobro' : 'Cargar cobro a atletas'}</h2>
        <p class="text-sm text-muted-foreground">${
          existing
            ? 'Modificá el valor, concepto, detalle, vencimiento o estado del cobro.'
            : 'Cargá un cobro a un atleta individual, a una categoría o a toda la escuela.'
        }</p>
      </div>
      <button type="button" onclick="closeModal()" class="text-muted-foreground hover:text-foreground">✕</button>
    </div>
    <form onsubmit="saveNuevoCobro(event, '${editPagoId || ''}')" class="mt-4 grid gap-3.5">
      <div>
        <label class="text-xs font-medium">${existing ? 'Atleta' : 'Destinatario del cobro'}</label>
        <select id="np-atleta" class="mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm font-medium">
          ${
            !existing
              ? `<option value="__TODOS__" ${!preselectedAtletaId ? '' : ''}>👥 Todos los atletas de la escuela (${DB.atletas.length} atletas)</option>
                 ${categoriasDisponibles
                   .map((cat) => `<option value="__CAT__:${esc(cat)}">🏷️ Todos los de categoría ${esc(cat)}</option>`)
                   .join('')}`
              : ''
          }
          ${DB.atletas
            .map(
              (a) =>
                `<option value="${a.id}" ${targetAtletaId === a.id ? 'selected' : ''}>${esc(a.apellido)}, ${esc(a.nombre)} (${esc(a.categoria)})</option>`
            )
            .join('')}
        </select>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <div class="flex items-center justify-between">
            <label class="text-xs font-medium">Concepto</label>
            <button type="button" onclick="openConceptosCobroModal()" class="text-[11px] font-semibold text-primary hover:underline">
              + Gestionar conceptos
            </button>
          </div>
          <select id="np-concepto" onchange="onConceptoCobroChange(this.value)" class="mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm">
            ${catalogo
              .map(
                (c) =>
                  `<option value="${esc(c.nombre)}" ${conceptoInicial === c.nombre ? 'selected' : ''}>${esc(c.nombre)} (${Helpers.pesos(c.montoSugerido)})</option>`
              )
              .join('')}
            ${
              existing && !catalogo.some((c) => c.nombre === existing.concepto)
                ? `<option value="${esc(existing.concepto)}" selected>${esc(existing.concepto)}</option>`
                : ''
            }
            <option value="__NUEVO__">+ Crear nuevo concepto…</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium">Valor a cobrar (ARS) *</label>
          <input id="np-monto" type="number" min="0" required value="${montoInicial}" class="mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm font-mono font-bold" />
        </div>
      </div>

      <div id="np-nuevo-concepto-wrap" class="hidden rounded-lg border border-primary/30 bg-muted/40 p-3">
        <label class="text-xs font-semibold text-primary">Nombre del nuevo concepto *</label>
        <input id="np-nuevo-concepto-nombre" placeholder="Ej.: Viaje Provincial / Seguro / Bono" class="mt-1 h-9 w-full rounded-lg border bg-card px-3 text-sm" />
        <label class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" id="np-guardar-concepto" checked class="accent-primary" />
          Guardar este concepto y su valor para futuros cobros
        </label>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium">Detalle / Descripción *</label>
          <input id="np-detalle" required value="${esc(detalleInicial)}" placeholder="Ej.: Cuota mensual / Viaje a torneo" class="mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
        <div>
          <label class="text-xs font-medium">Fecha de vencimiento *</label>
          <input id="np-venc" type="date" required value="${esc(vencInicial)}" class="mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
      </div>

      ${
        existing
          ? `<div>
              <label class="text-xs font-medium">Estado del pago</label>
              <select id="np-estado" class="mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm">
                <option value="pendiente" ${estadoInicial === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                <option value="vencido" ${estadoInicial === 'vencido' ? 'selected' : ''}>Vencido</option>
                <option value="pagado" ${estadoInicial === 'pagado' ? 'selected' : ''}>Pagado</option>
              </select>
            </div>`
          : ''
      }

      <div class="mt-2 flex justify-end gap-2">
        <button type="button" onclick="closeModal()" class="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
        <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">
          ${existing ? 'Guardar cambios' : 'Cargar cobro'}
        </button>
      </div>
    </form>
  `);
};

window.onConceptoCobroChange = (val) => {
  const wrap = document.getElementById('np-nuevo-concepto-wrap');
  const nuevoInput = document.getElementById('np-nuevo-concepto-nombre');
  if (val === '__NUEVO__') {
    if (wrap) wrap.classList.remove('hidden');
    if (nuevoInput) nuevoInput.required = true;
    return;
  }
  if (wrap) wrap.classList.add('hidden');
  if (nuevoInput) nuevoInput.required = false;

  const catalogo = getConceptosCobroList();
  const found = catalogo.find((c) => c.nombre === val);
  if (found) {
    const montoEl = document.getElementById('np-monto');
    const detEl = document.getElementById('np-detalle');
    if (montoEl) montoEl.value = Number(found.montoSugerido) || 0;
    if (detEl) detEl.value = found.detalleSugerido || found.nombre;
  }
};

window.saveNuevoCobro = (e, editPagoId = '') => {
  e.preventDefault();
  const destVal = document.getElementById('np-atleta').value;
  let concepto = document.getElementById('np-concepto').value;
  const monto = Number(document.getElementById('np-monto').value) || 0;
  const detalle = document.getElementById('np-detalle').value.trim();
  const vencimiento = document.getElementById('np-venc').value;

  if (concepto === '__NUEVO__') {
    const nuevoNombre = document.getElementById('np-nuevo-concepto-nombre').value.trim();
    if (!nuevoNombre) return;
    concepto = nuevoNombre;
    const guardarCat = document.getElementById('np-guardar-concepto')?.checked;
    if (guardarCat) {
      const catalogo = getConceptosCobroList();
      if (!catalogo.some((c) => c.nombre.toLowerCase() === concepto.toLowerCase())) {
        catalogo.push({
          id: `cc-${Date.now()}`,
          nombre: concepto,
          montoSugerido: monto,
          detalleSugerido: detalle || concepto,
        });
      }
    }
  }

  if (editPagoId) {
    const existing = DB.pagos.find((p) => p.id === editPagoId);
    if (existing) {
      existing.atletaId = destVal;
      existing.concepto = concepto;
      existing.monto = monto;
      existing.detalle = detalle;
      existing.vencimiento = vencimiento;
      const estEl = document.getElementById('np-estado');
      if (estEl) {
        existing.estado = estEl.value;
        if (existing.estado === 'pagado' && !existing.fechaPago) {
          existing.fechaPago = DB.hoy;
        }
      }
    }
    saveDB();
    closeModal();
    showToast('Cobro actualizado correctamente');
    renderApp();
    return;
  }

  let targets = [];
  if (destVal === '__TODOS__') {
    targets = DB.atletas;
  } else if (destVal.startsWith('__CAT__:')) {
    const cat = destVal.replace('__CAT__:', '');
    targets = DB.atletas.filter((a) => a.categoria === cat);
  } else {
    const single = Helpers.getAtleta(destVal);
    if (single) targets = [single];
  }

  targets.forEach((a, idx) => {
    DB.pagos.push({
      id: `p-${Date.now()}-${idx}`,
      atletaId: a.id,
      concepto,
      monto,
      detalle,
      vencimiento,
      estado: 'pendiente',
    });
  });

  saveDB();
  closeModal();
  showToast(
    targets.length > 1
      ? `Se cargó "${concepto}" (${Helpers.pesos(monto)}) a ${targets.length} atletas`
      : 'Cobro registrado correctamente'
  );
  renderApp();
};

// 6. Modal de Nuevo Resultado / Marca Personal (Running, Pista y Campo)
window.onChangePruebaResultadoModal = (val) => {
  const esCampo = Helpers.esPruebaDeCampo(val);
  const lbl = document.getElementById('nr-tiempo-label');
  const inp = document.getElementById('nr-tiempo');
  if (lbl) {
    lbl.textContent = esCampo ? 'Marca en metros (ej.: 38.40 m)' : 'Tiempo / Marca (mm:ss)';
  }
  if (inp) {
    inp.placeholder = esCampo ? 'Ej.: 38.40 m o 4.85 m' : 'Ej.: 4:45 o 12.8';
  }
};

window.openNuevoResultadoModal = (atletaId, defaultCompetencia = '', defaultFecha = '') => {
  const atleta = Helpers.getAtleta(atletaId);
  if (!atleta) return;
  const bloques = window.DISCIPLINAS_POR_BLOQUE || [];
  const pruebasDelAtleta = String(atleta.pruebas || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const defaultPrueba = pruebasDelAtleta[0] || '1500 m';
  const esCampoInicial = Helpers.esPruebaDeCampo(defaultPrueba);

  showModalHtml(`
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-bold">Cargar resultado · ${esc(atleta.nombre)}</h2>
        <p class="text-sm text-muted-foreground">Actualiza automáticamente su historial, marcas personales (PB en Corredor, Pista o Campo) y ranking público.</p>
      </div>
      <button type="button" onclick="closeModal()" class="text-muted-foreground hover:text-foreground">✕</button>
    </div>
    <form onsubmit="saveNuevoResultado(event, '${atletaId}')" class="mt-4 grid gap-3">
      <div>
        <label class="text-xs font-medium">Competencia / Torneo</label>
        <input id="nr-comp" required value="${esc(defaultCompetencia)}" placeholder="Ej.: Torneo Provincial Valcheta" class="h-10 w-full rounded-lg border bg-card px-3 text-sm" />
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label class="text-xs font-medium">Prueba (Corredor · Pista · Campo)</label>
          <select id="nr-dist" onchange="onChangePruebaResultadoModal(this.value)" class="h-10 w-full rounded-lg border bg-card px-2 text-sm font-medium">
            ${
              pruebasDelAtleta.length > 0
                ? `<optgroup label="★ Pruebas de ${esc(atleta.nombre)}">
                    ${pruebasDelAtleta
                      .map(
                        (d, idx) =>
                          `<option value="${esc(d)}" ${idx === 0 ? 'selected' : ''}>★ ${esc(d)}</option>`
                      )
                      .join('')}
                  </optgroup>`
                : ''
            }
            ${bloques
              .flatMap((b) =>
                (b.subdisciplinas || []).map(
                  (sub) => `
                  <optgroup label="${esc(b.tipoAtleta)} · ${esc(sub.nombre)}">
                    ${(sub.pruebas || [])
                      .map(
                        (d) =>
                          `<option value="${esc(d)}" ${pruebasDelAtleta.length === 0 && d === defaultPrueba ? 'selected' : ''}>${esc(d)}</option>`
                      )
                      .join('')}
                  </optgroup>
                `
                )
              )
              .join('')}
          </select>
        </div>
        <div>
          <label id="nr-tiempo-label" class="text-xs font-medium">${esCampoInicial ? 'Marca en metros (ej.: 38.40 m)' : 'Tiempo / Marca (mm:ss)'}</label>
          <input id="nr-tiempo" required placeholder="${esCampoInicial ? 'Ej.: 38.40 m o 4.85 m' : 'Ej.: 4:45 o 12.8'}" class="h-10 w-full rounded-lg border bg-card px-3 text-sm font-semibold" />
        </div>
        <div>
          <label class="text-xs font-medium">Fecha</label>
          <input id="nr-fecha" type="date" required value="${esc(defaultFecha || DB.hoy)}" class="h-10 w-full rounded-lg border bg-card px-2 text-sm" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium">Puesto General</label>
          <input id="nr-posg" type="number" required value="1" class="h-10 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
        <div>
          <label class="text-xs font-medium">Puesto Categoría</label>
          <input id="nr-posc" type="number" required value="1" class="h-10 w-full rounded-lg border bg-card px-3 text-sm" />
        </div>
      </div>
      <div class="mt-2 flex justify-end gap-2">
        <button type="button" onclick="closeModal()" class="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
        <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">Guardar resultado</button>
      </div>
    </form>
  `);
};

window.saveNuevoResultado = (e, atletaId) => {
  e.preventDefault();
  const atleta = Helpers.getAtleta(atletaId);
  if (!atleta) return;
  const competencia = document.getElementById('nr-comp').value.trim();
  const distancia = document.getElementById('nr-dist').value;
  let tiempo = document.getElementById('nr-tiempo').value.trim();
  const esCampo = Helpers.esPruebaDeCampo(distancia);
  if (esCampo && tiempo && !tiempo.toLowerCase().includes('m')) {
    tiempo = `${tiempo} m`;
  }
  const fecha = document.getElementById('nr-fecha').value;
  const posGeneral = Number(document.getElementById('nr-posg').value);
  const posCategoria = Number(document.getElementById('nr-posc').value);

  atleta.resultados = atleta.resultados || [];
  atleta.resultados.unshift({
    competenciaId: `c-${Date.now()}`,
    competencia,
    fecha,
    distancia,
    tiempo,
    posGeneral,
    posCategoria,
  });

  if (Array.isArray(DB.distanciasRanking) && !DB.distanciasRanking.includes(distancia)) {
    DB.distanciasRanking.push(distancia);
  }

  atleta.marcas = atleta.marcas || [];
  const marcaExistente = atleta.marcas.find((m) => m.distancia === distancia);
  if (!marcaExistente) {
    atleta.marcas.push({ distancia, tiempo, fecha, competencia });
  } else if (esCampo) {
    if (Helpers.aMetros(tiempo) >= Helpers.aMetros(marcaExistente.tiempo)) {
      marcaExistente.tiempo = tiempo;
      marcaExistente.fecha = fecha;
      marcaExistente.competencia = competencia;
    }
  } else if (Helpers.aSegundos(tiempo) <= Helpers.aSegundos(marcaExistente.tiempo)) {
    marcaExistente.tiempo = tiempo;
    marcaExistente.fecha = fecha;
    marcaExistente.competencia = competencia;
  }

  // Actualizar colección ranking_publico si el atleta no está excluido
  if (!atleta.excluirRanking) {
    const itemRanking = {
      prueba: distancia,
      distancia,
      atletaId: atleta.id,
      nombre: `${atleta.nombre} ${atleta.apellido ? atleta.apellido[0] + '.' : ''}`,
      categoria: atleta.categoria || '',
      edad: Helpers.edad(atleta.fechaNacimiento),
      genero: atleta.genero || '',
      tiempo,
      fecha,
      competencia,
    };
    window.DB.ranking_publico = window.DB.ranking_publico || [];
    const idx = window.DB.ranking_publico.findIndex(
      (r) => (r.distancia === distancia || r.prueba === distancia) && (r.atletaId || r.id) === atleta.id
    );
    if (idx >= 0) {
      window.DB.ranking_publico[idx] = itemRanking;
    } else {
      window.DB.ranking_publico.push(itemRanking);
    }
    if (window.CloudSync && typeof window.CloudSync.guardarRankingPublicoItem === 'function') {
      window.CloudSync.guardarRankingPublicoItem(itemRanking);
    }
  }

  // Alimentar automáticamente el gráfico de evolución (ritmo en min/km) solo en pruebas de carrera
  if (!esCampo) {
    const segs = Helpers.aSegundos(tiempo);
    let distKm = 0;
    if (distancia.toUpperCase().endsWith('K')) {
      distKm = parseFloat(distancia);
    } else if (distancia.toLowerCase().includes('m')) {
      distKm = parseFloat(distancia) / 1000;
    }
    if (segs > 0 && distKm > 0) {
      const ritmoMinKm = Number((segs / 60 / distKm).toFixed(2));
      if (ritmoMinKm > 1.5 && ritmoMinKm < 15) {
        atleta.evolucion = atleta.evolucion || [];
        atleta.evolucion.push({ fecha, ritmo: ritmoMinKm });
        atleta.evolucion.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
      }
    }
  }

  saveDB();
  closeModal();
  showToast('Resultado y marca personal actualizados');
  renderApp();
};

/* ==========================================================================
   ENRUTADOR PRINCIPAL CON PROTECCIÓN DE ACCESO POR ROL
   ========================================================================== */

function renderApp(preserveSearchFocus = false) {
  const hash = location.hash || '#/';
  const path = hash.slice(1) || '/';
  const session = typeof Auth.verifyCurrentSession === 'function' ? Auth.verifyCurrentSession() : Auth.getSession();
  const app = document.getElementById('app');
  if (!app) return;

  // Guardias de seguridad estrictos por rol
  if (path.startsWith('/entrenador')) {
    if (!session) {
      location.hash = '#/ingresar';
      return;
    } else if (session.role === 'athlete') {
      location.hash = `#/atleta/${session.atletaId}`;
      return;
    } else if (session.role === 'guardian') {
      location.hash = `#/familia/${session.atletaId}`;
      return;
    }
  } else if (path.startsWith('/atleta')) {
    if (!session) {
      location.hash = '#/ingresar';
      return;
    }
    if (session.role === 'athlete') {
      const requestedId = path.replace('/atleta', '').replace('/', '');
      if (requestedId && requestedId !== session.atletaId) {
        location.hash = `#/atleta/${session.atletaId}`;
        return;
      }
    }
  } else if (path.startsWith('/familia')) {
    if (!session) {
      location.hash = '#/ingresar';
      return;
    }
    if (session.role === 'guardian') {
      const requestedId = path.replace('/familia', '').replace('/', '');
      if (requestedId && requestedId !== session.atletaId) {
        location.hash = `#/familia/${session.atletaId}`;
        return;
      }
    }
  }

  let html = '';
  if (path === '/' || path === '') {
    document.title = 'Willilefche · Escuela Municipal de Valcheta';
    html = viewHome();
  } else if (path === '/rankings') {
    document.title = 'Rankings y marcas · Willilefche';
    html = viewRankings();
  } else if (path === '/competencias') {
    document.title = 'Calendario de competencias · Willilefche';
    html = viewCompetenciasPublic();
  } else if (path === '/ingresar') {
    document.title = 'Ingresar · Willilefche';
    html = viewIngresar();
  } else if (path === '/entrenador' || path === '/entrenador/') {
    document.title = 'Panel del entrenador · Willilefche';
    html = viewCoachDashboard();
  } else if (path === '/entrenador/atletas' || path === '/entrenador/atletas/') {
    document.title = 'Atletas · Willilefche';
    html = viewCoachAtletas();
  } else if (path.startsWith('/entrenador/atletas/')) {
    const atletaId = path.replace('/entrenador/atletas/', '').split('/')[0];
    const a = Helpers.getAtleta(atletaId);
    document.title = a ? `${Helpers.nombreCompleto(a)} · Willilefche` : 'Atleta · Willilefche';
    html = viewCoachAtletaFicha(atletaId);
  } else if (path === '/entrenador/competencias') {
    document.title = 'Competencias · Willilefche';
    html = viewCoachCompetencias();
  } else if (path === '/entrenador/pagos') {
    document.title = 'Pagos · Willilefche';
    html = viewCoachPagos();
  } else if (path === '/entrenador/avisos') {
    document.title = 'Avisos · Willilefche';
    html = viewCoachAvisos();
  } else if (path === '/atleta' || path.startsWith('/atleta/')) {
    const atletaId = path.replace('/atleta', '').replace('/', '') || session?.atletaId || DB.atletas[0]?.id;
    document.title = 'Mi plan · Willilefche';
    html = viewAtletaPortal(atletaId, false);
  } else if (path === '/familia' || path.startsWith('/familia/')) {
    const atletaId = path.replace('/familia', '').replace('/', '') || session?.atletaId || DB.atletas[0]?.id;
    document.title = 'Cuenta familiar · Willilefche';
    html = viewAtletaPortal(atletaId, true);
  } else {
    html = viewHome();
  }

  app.innerHTML = html;
  if (window.lucide) {
    window.lucide.createIcons();
  }

  if (preserveSearchFocus) {
    const input = document.getElementById('search-atletas-input');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  } else {
    window.scrollTo(0, 0);
  }
}

window.renderApp = renderApp;
window.addEventListener('hashchange', () => renderApp(false));

function bootApp() {
  if (window._appBooted) return;
  window._appBooted = true;
  if (window.CloudSync && typeof window.CloudSync.init === 'function') {
    CloudSync.init();
  }
  if (typeof renderApp === 'function') {
    renderApp(false);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}

