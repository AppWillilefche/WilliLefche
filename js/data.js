/**
 * data.js - Motor de Datos Reales Cache-First + Sincronización en Tiempo Real con Firebase Firestore
 * Escuela Municipal de Atletismo Willilefche · Valcheta, Río Negro
 */

const STORAGE_KEY = 'willilefche_db_real_v1';
const CUSTOM_FB_CONFIG_KEY = 'willilefche_firebase_config';

// Limpiar restos de bases de prueba anteriores en el navegador
try {
  localStorage.removeItem('willilefche_db_v1');
  localStorage.removeItem('willilefche_db_v2');
} catch (e) {}

function getTodayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getCurrentWeekISO(baseIso) {
  const [y, m, d] = (baseIso || getTodayISO()).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=Dom, 1=Lun...
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  dt.setUTCDate(dt.getUTCDate() + diffToMonday);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(dt);
    cur.setUTCDate(dt.getUTCDate() + i);
    days.push(cur.toISOString().slice(0, 10));
  }
  return days;
}

const HOY_DEFAULT = getTodayISO();

const DEFAULT_CONCEPTOS_COBRO = [
  { id: 'cuota', nombre: 'Cuota', montoSugerido: 15000, detalleSugerido: 'Cuota mensual' },
  { id: 'indumentaria', nombre: 'Indumentaria', montoSugerido: 25000, detalleSugerido: 'Indumentaria del equipo' },
  { id: 'viajes-competencias', nombre: 'Viajes y Competencias', montoSugerido: 20000, detalleSugerido: 'Viaje y participación en competencia' },
];

const DISCIPLINAS_POR_BLOQUE = [
  {
    id: 'running',
    tipoAtleta: 'Corredor',
    titulo: '1. Corredor (Calle y Trail)',
    subtitulo: 'Calle y Trail',
    icono: 'footprints',
    emoji: '🏃',
    colorBadge: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    disciplinas: ['Corredor', 'Calle', 'Trail', 'Running', 'Cross / Trail', 'Fondo en Calle'],
    subdisciplinas: [
      {
        id: 'calle',
        nombre: 'Calle',
        descripcion: 'Carreras de calle, ruta y asfalto',
        aliases: ['Calle', 'Running', 'Fondo en Calle'],
        pruebas: ['5K', '10K', '15K', '21K', '42K'],
      },
      {
        id: 'trail',
        nombre: 'Trail',
        descripcion: 'Trail running, aventura y cross country',
        aliases: ['Trail', 'Cross / Trail', 'Cross Country', 'Trail Running'],
        pruebas: ['Cross Country', 'Trail Running', '6K Trail', '12K Trail', '21K Trail'],
      },
    ],
    pruebasSugeridas: ['5K', '10K', '15K', '21K', '42K', 'Cross Country', 'Trail Running', '6K Trail', '12K Trail', '21K Trail'],
  },
  {
    id: 'pista',
    tipoAtleta: 'Pista',
    titulo: '2. Pista (Velocidad, Medio Fondo, Fondo y Obstáculos)',
    subtitulo: 'Velocidad, Medio Fondo, Fondo y Obstáculos',
    icono: 'timer',
    emoji: '⏱️',
    colorBadge: 'bg-primary/15 text-primary border-primary/30',
    disciplinas: [
      'Pista',
      'Velocidad',
      'Medio Fondo',
      'Fondo',
      'Obstáculos',
      'Vallas y Obstáculos',
      'Marcha',
      'Postas / Relevos',
      'Iniciación Atlética',
    ],
    subdisciplinas: [
      {
        id: 'velocidad',
        nombre: 'Velocidad',
        descripcion: 'Pruebas de velocidad pura, prolongada y postas',
        aliases: ['Velocidad', 'Postas / Relevos', 'Iniciación Atlética'],
        pruebas: ['60 m', '80 m', '100 m', '150 m', '200 m', '300 m', '400 m', 'Posta 5x80 m', 'Posta 4x100 m'],
      },
      {
        id: 'mediofondo',
        nombre: 'Medio Fondo',
        descripcion: 'Pruebas de mediofondo en pista',
        aliases: ['Medio Fondo', 'Mediofondo'],
        pruebas: ['600 m', '800 m', '1200 m', '1500 m', '2400 m'],
      },
      {
        id: 'fondo',
        nombre: 'Fondo',
        descripcion: 'Pruebas de fondo y marcha en pista',
        aliases: ['Fondo', 'Marcha'],
        pruebas: ['3000 m', '5000 m', '10000 m', 'Marcha 2000 m'],
      },
      {
        id: 'obstaculos',
        nombre: 'Obstáculos',
        descripcion: 'Pruebas con vallas y obstáculos',
        aliases: ['Obstáculos', 'Vallas y Obstáculos'],
        pruebas: [
          '80 m c/vallas',
          '100 m c/vallas',
          '110 m c/vallas',
          '295 m c/vallas',
          '400 m c/vallas',
          '1500 m c/obstáculos',
          '2000 m c/obstáculos',
          '3000 m c/obstáculos',
        ],
      },
    ],
    pruebasSugeridas: [
      '60 m',
      '80 m',
      '100 m',
      '150 m',
      '200 m',
      '300 m',
      '400 m',
      '600 m',
      '800 m',
      '1200 m',
      '1500 m',
      '2400 m',
      '3000 m',
      '5000 m',
      '10000 m',
      '80 m c/vallas',
      '100 m c/vallas',
      '110 m c/vallas',
      '295 m c/vallas',
      '400 m c/vallas',
      '1500 m c/obstáculos',
      '2000 m c/obstáculos',
      '3000 m c/obstáculos',
      'Marcha 2000 m',
      'Posta 5x80 m',
      'Posta 4x100 m',
    ],
  },
  {
    id: 'campo',
    tipoAtleta: 'Campo',
    titulo: '3. Campo (Lanzamientos y Saltos)',
    subtitulo: 'Lanzamientos y Saltos',
    icono: 'medal',
    emoji: '🥇',
    colorBadge: 'bg-amber-500/15 text-amber-800 border-amber-500/30',
    disciplinas: [
      'Campo',
      'Lanzamientos',
      'Saltos',
      'Lanzamiento de Jabalina',
      'Lanzamiento de Bala',
      'Lanzamiento de Martillo',
      'Lanzamiento de Disco',
      'Salto en Largo',
      'Salto en Alto',
      'Salto Triple',
      'Salto con Garrocha',
    ],
    subdisciplinas: [
      {
        id: 'lanzamientos',
        nombre: 'Lanzamientos',
        descripcion: 'Bala, jabalina, disco, martillo y pelotita',
        aliases: [
          'Lanzamientos',
          'Lanzamiento de Jabalina',
          'Lanzamiento de Bala',
          'Lanzamiento de Martillo',
          'Lanzamiento de Disco',
          'Lanzamiento de Pelotita',
        ],
        pruebas: [
          'Lanzamiento de Bala',
          'Lanzamiento de Jabalina',
          'Lanzamiento de Disco',
          'Lanzamiento de Martillo',
          'Lanzamiento de Pelotita',
        ],
      },
      {
        id: 'saltos',
        nombre: 'Saltos',
        descripcion: 'Largo, alto, triple y garrocha',
        aliases: ['Saltos', 'Salto en Largo', 'Salto en Alto', 'Salto Triple', 'Salto con Garrocha'],
        pruebas: ['Salto en Largo', 'Salto en Alto', 'Salto Triple', 'Salto con Garrocha'],
      },
    ],
    pruebasSugeridas: [
      'Lanzamiento de Jabalina',
      'Lanzamiento de Bala',
      'Lanzamiento de Martillo',
      'Lanzamiento de Disco',
      'Lanzamiento de Pelotita',
      'Salto en Largo',
      'Salto en Alto',
      'Salto Triple',
      'Salto con Garrocha',
    ],
  },
];

window.DISCIPLINAS_POR_BLOQUE = DISCIPLINAS_POR_BLOQUE;

const DEFAULT_DISCIPLINAS = [
  // 1. Corredor (Calle y Trail)
  'Corredor',
  'Calle',
  'Trail',
  'Running',
  'Cross / Trail',
  'Fondo en Calle',
  // 2. Pista
  'Pista',
  'Velocidad',
  'Medio Fondo',
  'Fondo',
  'Obstáculos',
  'Vallas y Obstáculos',
  'Marcha',
  'Postas / Relevos',
  'Iniciación Atlética',
  // 3. Campo (Lanzamientos y Saltos)
  'Campo',
  'Lanzamientos',
  'Saltos',
  'Lanzamiento de Jabalina',
  'Lanzamiento de Bala',
  'Lanzamiento de Martillo',
  'Lanzamiento de Disco',
  'Salto en Largo',
  'Salto en Alto',
  'Salto Triple',
  'Salto con Garrocha',
];

const DEFAULT_DISTANCIAS_RANKING = [
  '80 m',
  '100 m',
  '150 m',
  '200 m',
  '300 m',
  '400 m',
  '600 m',
  '800 m',
  '1200 m',
  '1500 m',
  '3000 m',
  '2000 m c/obstáculos',
  '3000 m c/obstáculos',
  '5K',
  '10K',
  '15K',
  '21K',
  'Lanzamiento de Jabalina',
  'Lanzamiento de Bala',
  'Lanzamiento de Martillo',
  'Lanzamiento de Disco',
  'Salto en Largo',
  'Salto en Alto',
  'Salto Triple',
];

const INITIAL_DB = {
  appKey: 'WLF-VALCHETA-2026',
  version: 'real-1.0',
  updatedAt: Date.now(),
  hoy: HOY_DEFAULT,
  equipo: {
    nombre: 'Escuela Municipal Willilefche',
    sede: 'Valcheta, Río Negro',
    // Usuario Administrador
    adminUser: 'admin',
    adminPass: 'Admin123@',
    // Usuario Entrenador (Renglón 19 de la Nómina Inicial)
    entrenador: 'Cristian Javier Torres',
    entrenadorDni: '27.884.821',
    entrenadorFechaNacimiento: '1980-07-02',
    coachUser: 'cristian.torres',
    coachPass: '27884821',
  },
  semanaActual: getCurrentWeekISO(HOY_DEFAULT),
  distanciasRanking: DEFAULT_DISTANCIAS_RANKING,
  conceptosCobro: DEFAULT_CONCEPTOS_COBRO,
  disciplinasDisponibles: DEFAULT_DISCIPLINAS,
  atletas: [
    {
      id: 'alejo-rivas-abrate',
      nroNomina: 1,
      nombre: 'Alejo Efraín',
      apellido: 'Rivas Abrate',
      dni: '50.744.971',
      usuario: 'alejo.rivas',
      password: '50744971',
      fechaNacimiento: '2011-02-07',
      genero: 'M',
      categoria: 'U16',
      nivel: 'Intermedio',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Rivas Abrate',
      tutor: {
        nombre: 'Familia Rivas Abrate',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.rivas',
        password: '50744971',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'valentina-guenumil',
      nroNomina: 2,
      nombre: 'Valentina',
      apellido: 'Guenumil',
      dni: '47.914.403',
      usuario: 'valentina.guenumil',
      password: '47914403',
      fechaNacimiento: '2007-02-28',
      genero: 'F',
      categoria: 'U20',
      nivel: 'Intermedio',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Guenumil',
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'nicolas-cayun',
      nroNomina: 3,
      nombre: 'Nicolás Axel',
      apellido: 'Cayún',
      dni: '52.322.748',
      usuario: 'nicolas.cayun',
      password: '52322748',
      fechaNacimiento: '2012-04-22',
      genero: 'M',
      categoria: 'U16',
      nivel: 'Intermedio',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Cayún',
      tutor: {
        nombre: 'Familia Cayún',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.cayun',
        password: '52322748',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'rocio-ostertag',
      nroNomina: 4,
      nombre: 'Rocío Belén',
      apellido: 'Ostertag',
      dni: '52.328.278',
      usuario: 'rocio.ostertag',
      password: '52328278',
      fechaNacimiento: '2012-10-16',
      genero: 'F',
      categoria: 'U16',
      nivel: 'Intermedio',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Ostertag',
      tutor: {
        nombre: 'Familia Ostertag',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.ostertag',
        password: '52328278',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'keyla-albatte-canoel',
      nroNomina: 5,
      nombre: 'Keyla Agostina',
      apellido: 'Albatte Cañoel',
      dni: '52.325.514',
      usuario: 'keyla.albatte',
      password: '52325514',
      fechaNacimiento: '2011-08-04',
      genero: 'F',
      categoria: 'U16',
      nivel: 'Intermedio',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Albatte Cañoel',
      tutor: {
        nombre: 'Familia Albatte Cañoel',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.albatte',
        password: '52325514',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'jonas-yanca-paillalef',
      nroNomina: 6,
      nombre: 'Jonas Taiel',
      apellido: 'Yanca Paillalef',
      dni: '53.352.267',
      usuario: 'jonas.yanca',
      password: '53352267',
      altPasswords: ['53392267'],
      fechaNacimiento: '2013-08-30',
      genero: 'M',
      categoria: 'U14',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Yanca Paillalef',
      tutor: {
        nombre: 'Familia Yanca Paillalef',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.yanca',
        password: '53352267',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'mauro-ghezzi',
      nroNomina: 7,
      nombre: 'Mauro',
      apellido: 'Ghezzi',
      dni: '50.208.984',
      usuario: 'mauro.ghezzi',
      password: '50208984',
      fechaNacimiento: '2010-05-04',
      genero: 'M',
      categoria: 'U18',
      nivel: 'Intermedio',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Ghezzi',
      tutor: {
        nombre: 'Familia Ghezzi',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.ghezzi',
        password: '50208984',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'lucila-chico',
      nroNomina: 8,
      nombre: 'Lucila Aymará',
      apellido: 'Chico',
      dni: '53.014.584',
      usuario: 'lucila.chico',
      password: '53014584',
      fechaNacimiento: '2013-05-28',
      genero: 'F',
      categoria: 'U14',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Chico',
      tutor: {
        nombre: 'Familia Chico',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.chico',
        password: '53014584',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'eluney-quiroga-casas',
      nroNomina: 9,
      nombre: 'Eluney Amely',
      apellido: 'Quiroga Casas',
      dni: '52.320.548',
      usuario: 'eluney.quiroga',
      password: '52320548',
      fechaNacimiento: '2012-04-28',
      genero: 'F',
      categoria: 'U16',
      nivel: 'Intermedio',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Quiroga Casas',
      tutor: {
        nombre: 'Familia Quiroga Casas',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.quiroga',
        password: '52320548',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'rebea-catriel',
      nroNomina: 10,
      nombre: 'Rebeca Aylén',
      apellido: 'Catriel',
      dni: '53.014.585',
      usuario: 'rebea.catriel',
      altUsuarios: ['rebeca.catriel'],
      password: '53014585',
      altPasswords: ['53014595'],
      fechaNacimiento: '2013-07-16',
      genero: 'F',
      categoria: 'U14',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Catriel',
      tutor: {
        nombre: 'Familia Catriel',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.catriel',
        password: '53014585',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'ian-mortada',
      nroNomina: 11,
      nombre: 'Ian Nayhen',
      apellido: 'Mortada',
      dni: '51.237.336',
      usuario: 'ian.mortada',
      password: '51237336',
      fechaNacimiento: '2011-08-09',
      genero: 'M',
      categoria: 'U16',
      nivel: 'Intermedio',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Mortada',
      tutor: {
        nombre: 'Familia Mortada',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.mortada',
        password: '51237336',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'santiago-marileo',
      nroNomina: 12,
      nombre: 'Santiago Darío',
      apellido: 'Marileo',
      dni: '53.015.898',
      usuario: 'santiago.marileo',
      password: '53015898',
      fechaNacimiento: '2013-04-28',
      genero: 'M',
      categoria: 'U14',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Marileo',
      tutor: {
        nombre: 'Familia Marileo',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.marileo',
        password: '53015898',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'tiziana-zapata',
      nroNomina: 13,
      nombre: 'Tiziana Elizabeth',
      apellido: 'Zapata',
      dni: '51.033.277',
      usuario: 'tiziana.zapata',
      password: '51033277',
      fechaNacimiento: '2011-08-04',
      genero: 'F',
      categoria: 'U16',
      nivel: 'Intermedio',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Zapata',
      tutor: {
        nombre: 'Familia Zapata',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.zapata',
        password: '51033277',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'jazmin-quilogran-cerdan',
      nroNomina: 14,
      nombre: 'Jazmín Selena',
      apellido: 'Quilográn Cerdan',
      dni: '51.237.348',
      usuario: 'jazmin.quilogran',
      password: '51237348',
      fechaNacimiento: '2011-09-19',
      genero: 'F',
      categoria: 'U16',
      nivel: 'Intermedio',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Quilográn Cerdan',
      tutor: {
        nombre: 'Familia Quilográn Cerdan',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.quilogran',
        password: '51237348',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'lucas-furlan',
      nroNomina: 15,
      nombre: 'Lucas Benjamín',
      apellido: 'Furlan',
      dni: '50.432.052',
      usuario: 'lucas.furlan',
      password: '50432052',
      fechaNacimiento: '2010-07-12',
      genero: 'M',
      categoria: 'U18',
      nivel: 'Intermedio',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Furlan',
      tutor: {
        nombre: 'Familia Furlan',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.furlan',
        password: '50432052',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'malena-bahamonde-uircain',
      nroNomina: 16,
      nombre: 'Malena Ahitana',
      apellido: 'Bahamonde Uircain',
      dni: '53.014.587',
      usuario: 'malena.bahamonde',
      altUsuarios: ['malena.uircain'],
      password: '53014587',
      fechaNacimiento: '2013-06-05',
      genero: 'F',
      categoria: 'U14',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Bahamonde Uircain',
      tutor: {
        nombre: 'Familia Bahamonde Uircain',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.bahamonde',
        altUsuarios: ['familia.uircain'],
        password: '53014587',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'aylen-liendaf',
      nroNomina: 17,
      nombre: 'Aylén Olivia',
      apellido: 'Liendaf',
      dni: '58.258.987',
      usuario: 'aylen.liendaf',
      password: '58258987',
      fechaNacimiento: '2020-07-14',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Liendaf',
      tutor: {
        nombre: 'Familia Liendaf',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.liendaf',
        password: '58258987',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'amelia-torres-abrate',
      nroNomina: 18,
      nombre: 'Amelia',
      apellido: 'Torres Abrate',
      dni: '58.411.599',
      usuario: 'amelia.torres',
      password: '58411599',
      fechaNacimiento: '2021-03-18',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Torres Abrate',
      tutor: {
        nombre: 'Familia Torres Abrate',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.torres',
        password: '58411599',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'luis-yanca-paillalef',
      nroNomina: 19,
      nombre: 'Luis Ezequiel',
      apellido: 'Yanca Paillalef',
      dni: '58.041.012',
      usuario: 'luis.yanca',
      password: '58041012',
      fechaNacimiento: '2020-09-03',
      genero: 'M',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Yanca Paillalef',
      tutor: {
        nombre: 'Familia Yanca Paillalef',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.yanca',
        password: '58041012',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'gabriel-cariman',
      nroNomina: 20,
      nombre: 'Gabriel Matheo',
      apellido: 'Cariman',
      dni: '58.409.181',
      usuario: 'gabriel.cariman',
      password: '58409181',
      fechaNacimiento: '2020-11-05',
      genero: 'M',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Cariman',
      tutor: {
        nombre: 'Familia Cariman',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.cariman',
        password: '58409181',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'mateo-quichan',
      nroNomina: 21,
      nombre: 'Mateo Agustín',
      apellido: 'Quichan',
      dni: '58.410.827',
      usuario: 'mateo.quichan',
      password: '58410827',
      fechaNacimiento: '2020-08-30',
      genero: 'M',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Quichan',
      tutor: {
        nombre: 'Familia Quichan',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.quichan',
        password: '58410827',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'clara-quidel',
      nroNomina: 22,
      nombre: 'Clara Jazmín',
      apellido: 'Quidel',
      dni: '58.260.027',
      usuario: 'clara.quidel',
      password: '58260027',
      fechaNacimiento: '2020-05-15',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Quidel',
      tutor: {
        nombre: 'Familia Quidel',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.quidel',
        password: '58260027',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'ihan-walter',
      nroNomina: 23,
      nombre: 'Ihan Leonel',
      apellido: 'Walter',
      dni: '57.806.066',
      usuario: 'ihan.walter',
      password: '57806066',
      fechaNacimiento: '2019-10-24',
      genero: 'M',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Walter',
      tutor: {
        nombre: 'Familia Walter',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.walter',
        password: '57806066',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'aylen-quiroga-casas',
      nroNomina: 24,
      nombre: 'Aylén Cecilia',
      apellido: 'Quiroga Casas',
      dni: '58.410.709',
      usuario: 'aylen.quiroga',
      password: '58410709',
      fechaNacimiento: '2020-10-09',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Quiroga Casas',
      tutor: {
        nombre: 'Familia Quiroga Casas',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.quiroga',
        password: '58410709',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'cristal-canulef-fernandez',
      nroNomina: 25,
      nombre: 'Cristal Keyla',
      apellido: 'Cañulef Fernández',
      dni: '57.492.789',
      usuario: 'cristal.canulef',
      password: '57492789',
      fechaNacimiento: '2019-03-06',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Cañulef Fernández',
      tutor: {
        nombre: 'Familia Cañulef Fernández',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.canulef',
        password: '57492789',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'jazmin-morales',
      nroNomina: 26,
      nombre: 'Jazmín Luana',
      apellido: 'Morales',
      dni: '58.042.149',
      usuario: 'jazmin.morales',
      password: '58042149',
      fechaNacimiento: '2020-01-31',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Morales',
      tutor: {
        nombre: 'Familia Morales',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.morales',
        password: '58042149',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'ignacio-escobar-hernandez',
      nroNomina: 27,
      nombre: 'Ignacio',
      apellido: 'Escobar Hernández',
      dni: '57.806.430',
      usuario: 'ignacio.escobar',
      password: '57806430',
      fechaNacimiento: '2019-12-15',
      genero: 'M',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Escobar Hernández',
      tutor: {
        nombre: 'Familia Escobar Hernández',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.escobar',
        password: '57806430',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'noah-gutierrez-contrera',
      nroNomina: 28,
      nombre: 'Noah Benjamín',
      apellido: 'Gutiérrez Contrera',
      dni: '58.042.772',
      usuario: 'noah.gutierrez',
      password: '58042772',
      fechaNacimiento: '2020-04-01',
      genero: 'M',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Gutiérrez Contrera',
      tutor: {
        nombre: 'Familia Gutiérrez Contrera',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.gutierrez',
        password: '58042772',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'tomas-wuchal',
      nroNomina: 29,
      nombre: 'Tomás Ezequiel',
      apellido: 'Wuchal',
      dni: '56.984.218',
      usuario: 'tomas.wuchal',
      password: '56984218',
      fechaNacimiento: '2018-08-18',
      genero: 'M',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Wuchal',
      tutor: {
        nombre: 'Familia Wuchal',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.wuchal',
        password: '56984218',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'almendra-martinez',
      nroNomina: 30,
      nombre: 'Almendra',
      apellido: 'Martínez',
      dni: '57.649.809',
      usuario: 'almendra.martinez',
      password: '57649809',
      fechaNacimiento: '2019-05-17',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Martínez',
      tutor: {
        nombre: 'Familia Martínez',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.martinez',
        password: '57649809',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'eluney-capristo-paez',
      nroNomina: 31,
      nombre: 'Eluney',
      apellido: 'Capristo Páez',
      dni: '56.983.279',
      usuario: 'eluney.capristo',
      password: '56983279',
      fechaNacimiento: '2018-08-17',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Capristo Páez',
      tutor: {
        nombre: 'Familia Capristo Páez',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.capristo',
        password: '56983279',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'victoria-enchuleo',
      nroNomina: 32,
      nombre: 'Victoria Elisa',
      apellido: 'Enchuleo',
      dni: '57.191.105',
      usuario: 'victoria.enchuleo',
      password: '57191105',
      fechaNacimiento: '2019-01-08',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Enchuleo',
      tutor: {
        nombre: 'Familia Enchuleo',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.enchuleo',
        password: '57191105',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'mirela-ghezzi',
      nroNomina: 33,
      nombre: 'Mirela',
      apellido: 'Ghezzi',
      dni: '56.984.211',
      usuario: 'mirela.ghezzi',
      password: '56984211',
      fechaNacimiento: '2018-06-27',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Ghezzi',
      tutor: {
        nombre: 'Familia Ghezzi',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.ghezzi',
        password: '56984211',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'gino-montelpare-amaya',
      nroNomina: 34,
      nombre: 'Gino Amadeo',
      apellido: 'Montelpare Amaya',
      dni: '57.191.650',
      usuario: 'gino.montelpare',
      password: '57191650',
      fechaNacimiento: '2019-01-22',
      genero: 'M',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Montelpare Amaya',
      tutor: {
        nombre: 'Familia Montelpare Amaya',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.montelpare',
        password: '57191650',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'natanael-rios',
      nroNomina: 35,
      nombre: 'Natanael Jezier',
      apellido: 'Ríos',
      dni: '57.371.046',
      usuario: 'natanael.rios',
      password: '57371046',
      fechaNacimiento: '2019-04-01',
      genero: 'M',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Ríos',
      tutor: {
        nombre: 'Familia Ríos',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.rios',
        password: '57371046',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'pablo-cabezas-morandin',
      nroNomina: 36,
      nombre: 'Pablo Iker',
      apellido: 'Cabezas Morandín',
      dni: '56.606.312',
      usuario: 'pablo.cabezas',
      password: '56606312',
      fechaNacimiento: '2018-02-04',
      genero: 'M',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Cabezas Morandín',
      tutor: {
        nombre: 'Familia Cabezas Morandín',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.cabezas',
        password: '56606312',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'mia-cuniquir',
      nroNomina: 37,
      nombre: 'Mía Abigail',
      apellido: 'Cuñiquir',
      dni: '56.420.712',
      usuario: 'mia.cuniquir',
      password: '56420712',
      fechaNacimiento: '2017-11-28',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Cuñiquir',
      tutor: {
        nombre: 'Familia Cuñiquir',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.cuniquir',
        password: '56420712',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'agostina-martinez',
      nroNomina: 38,
      nombre: 'Agostina',
      apellido: 'Martínez',
      dni: '56.421.465',
      usuario: 'agostina.martinez',
      password: '56421465',
      fechaNacimiento: '2017-10-08',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Martínez',
      tutor: {
        nombre: 'Familia Martínez',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.martinez',
        password: '56421465',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'sofia-zapata-rodriguez',
      nroNomina: 39,
      nombre: 'Sofía Ayelén',
      apellido: 'Zapata Rodríguez',
      dni: '56.606.702',
      usuario: 'sofia.zapata',
      password: '56606702',
      fechaNacimiento: '2018-01-21',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Zapata Rodríguez',
      tutor: {
        nombre: 'Familia Zapata Rodríguez',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.zapata',
        password: '56606702',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'juana-muller',
      nroNomina: 40,
      nombre: 'Juana Marisol',
      apellido: 'Muller',
      dni: '56.605.444',
      usuario: 'juana.muller',
      password: '56605444',
      fechaNacimiento: '2017-12-24',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Muller',
      tutor: {
        nombre: 'Familia Muller',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.muller',
        password: '56605444',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'yuri-manqueo-monsalve',
      nroNomina: 41,
      nombre: 'Yuri Fresia Aixa',
      apellido: 'Manqueo Monsalve',
      dni: '56.846.303',
      usuario: 'yuri.manqueo',
      password: '56846303',
      fechaNacimiento: '2018-03-27',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Manqueo Monsalve',
      tutor: {
        nombre: 'Familia Manqueo Monsalve',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.manqueo',
        password: '56846303',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'martin-rios',
      nroNomina: 42,
      nombre: 'Martín',
      apellido: 'Ríos',
      dni: '56.846.304',
      usuario: 'martin.rios',
      password: '56846304',
      fechaNacimiento: '2018-04-06',
      genero: 'M',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Ríos',
      tutor: {
        nombre: 'Familia Ríos',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.rios',
        password: '56846304',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'fernando-martinez',
      nroNomina: 43,
      nombre: 'Fernando Mateo Joaquín',
      apellido: 'Martínez',
      dni: '56.846.309',
      usuario: 'fernando.martinez',
      password: '56846309',
      fechaNacimiento: '2018-04-02',
      genero: 'M',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Martínez',
      tutor: {
        nombre: 'Familia Martínez',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.martinez',
        password: '56846309',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'sofia-wuchal',
      nroNomina: 44,
      nombre: 'Sofía Jazmín',
      apellido: 'Wuchal',
      dni: '55.847.308',
      usuario: 'sofia.wuchal',
      password: '55847308',
      fechaNacimiento: '2016-12-18',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Wuchal',
      tutor: {
        nombre: 'Familia Wuchal',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.wuchal',
        password: '55847308',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'ciro-gomez',
      nroNomina: 45,
      nombre: 'Ciro',
      apellido: 'Gómez',
      dni: '55.649.470',
      usuario: 'ciro.gomez',
      password: '55649470',
      altPasswords: ['556494704'],
      fechaNacimiento: '2016-09-09',
      genero: 'M',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Gómez',
      tutor: {
        nombre: 'Familia Gómez',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.gomez',
        password: '55649470',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'lua-corribolo-casas',
      nroNomina: 46,
      nombre: 'Lua',
      apellido: 'Corribolo Casas',
      dni: '55.647.453',
      usuario: 'lua.corribolo',
      password: '55647453',
      fechaNacimiento: '2016-07-19',
      genero: 'F',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Corribolo Casas',
      tutor: {
        nombre: 'Familia Corribolo Casas',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.corribolo',
        password: '55647453',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'gianella-navelfil',
      nroNomina: 47,
      nombre: 'Gianella Inés',
      apellido: 'Navelfil',
      dni: '56.419.772',
      usuario: 'gianella.navelfil',
      password: '56419772',
      fechaNacimiento: '2016-08-05',
      genero: 'F',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Navelfil',
      tutor: {
        nombre: 'Familia Navelfil',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.navelfil',
        password: '56419772',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'nahiely-ramos',
      nroNomina: 48,
      nombre: 'Nahiely Jazmín Saray',
      apellido: 'Ramos',
      dni: '56.213.132',
      usuario: 'nahiely.ramos',
      password: '56213132',
      fechaNacimiento: '2017-04-30',
      genero: 'F',
      categoria: 'Infantiles',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Ramos',
      tutor: {
        nombre: 'Familia Ramos',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.ramos',
        password: '56213132',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'ulises-yanez-millaleo',
      nroNomina: 49,
      nombre: 'Ulises Samuel',
      apellido: 'Yáñez Millaleo',
      dni: '55.649.462',
      usuario: 'ulises.yanez',
      password: '55649462',
      fechaNacimiento: '2016-09-03',
      genero: 'M',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Yáñez Millaleo',
      tutor: {
        nombre: 'Familia Yáñez Millaleo',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.yanez',
        password: '55649462',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'maximiliano-zapata',
      nroNomina: 50,
      nombre: 'Maximiliano Benicio',
      apellido: 'Zapata',
      dni: '54.399.656',
      usuario: 'maximiliano.zapata',
      password: '54399656',
      fechaNacimiento: '2015-05-06',
      genero: 'M',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Zapata',
      tutor: {
        nombre: 'Familia Zapata',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.zapata',
        password: '54399656',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'luca-godoy-painemal',
      nroNomina: 51,
      nombre: 'Luca',
      apellido: 'Godoy Painemal',
      dni: '55.090.524',
      usuario: 'luca.godoy',
      password: '55090524',
      fechaNacimiento: '2015-12-19',
      genero: 'M',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Godoy Painemal',
      tutor: {
        nombre: 'Familia Godoy Painemal',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.godoy',
        password: '55090524',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'amina-otero-conoel',
      nroNomina: 52,
      nombre: 'Amina Agustina',
      apellido: 'Otero Coñoel',
      dni: '54.943.724',
      usuario: 'amina.otero',
      password: '54943724',
      fechaNacimiento: '2015-09-17',
      genero: 'F',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Otero Coñoel',
      tutor: {
        nombre: 'Familia Otero Coñoel',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.otero',
        password: '54943724',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'catalina-alles-garcia',
      nroNomina: 53,
      nombre: 'Catalina',
      apellido: 'Alles García',
      dni: '55.090.915',
      usuario: 'catalina.alles',
      password: '55090915',
      fechaNacimiento: '2016-01-13',
      genero: 'F',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Alles García',
      tutor: {
        nombre: 'Familia Alles García',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.alles',
        password: '55090915',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'jonas-escuer',
      nroNomina: 54,
      nombre: 'Jonás Adolfo',
      apellido: 'Escuer',
      dni: '54.941.537',
      usuario: 'jonas.escuer',
      password: '54941537',
      fechaNacimiento: '2015-07-14',
      genero: 'M',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Escuer',
      tutor: {
        nombre: 'Familia Escuer',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.escuer',
        password: '54941537',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'aymara-rivas-abrate',
      nroNomina: 55,
      nombre: 'Aymara',
      apellido: 'Rivas Abrate',
      dni: '54.943.728',
      usuario: 'aymara.rivas',
      password: '54943728',
      fechaNacimiento: '2015-11-06',
      genero: 'F',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Rivas Abrate',
      tutor: {
        nombre: 'Familia Rivas Abrate',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.rivas',
        password: '54943728',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'alisa-navelfil',
      nroNomina: 56,
      nombre: 'Alisa Aymé',
      apellido: 'Navelfil',
      dni: '55.303.425',
      usuario: 'alisa.navelfil',
      password: '55303425',
      fechaNacimiento: '2016-03-17',
      genero: 'F',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Navelfil',
      tutor: {
        nombre: 'Familia Navelfil',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.navelfil',
        password: '55303425',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'thiago-albornoz',
      nroNomina: 57,
      nombre: 'Thiago Gabriel',
      apellido: 'Albornoz',
      dni: '55.462.108',
      usuario: 'thiago.albornoz',
      password: '55462108',
      fechaNacimiento: '2016-04-18',
      genero: 'M',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Albornoz',
      tutor: {
        nombre: 'Familia Albornoz',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.albornoz',
        password: '55462108',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'debora-rosa-cariman',
      nroNomina: 58,
      nombre: 'Débora Loana',
      apellido: 'Rosa Cariman',
      dni: '54.774.237',
      usuario: 'debora.rosa',
      password: '54774237',
      fechaNacimiento: '2015-07-27',
      genero: 'F',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Rosa Cariman',
      tutor: {
        nombre: 'Familia Rosa Cariman',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.rosa',
        password: '54774237',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'luciel-colihuinca',
      nroNomina: 59,
      nombre: 'Luciel Kevin',
      apellido: 'Colihuinca',
      dni: '54.943.723',
      usuario: 'luciel.colihuinca',
      password: '54943723',
      fechaNacimiento: '2015-08-31',
      genero: 'M',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Colihuinca',
      tutor: {
        nombre: 'Familia Colihuinca',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.colihuinca',
        password: '54943723',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'nadide-arden-van-der-sandt',
      nroNomina: 60,
      nombre: 'Nadide Lucía',
      apellido: 'Arden Van Der Sandt',
      dni: '54.772.551',
      usuario: 'nadide.arden',
      password: '54772551',
      fechaNacimiento: '2015-04-17',
      genero: 'F',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Arden Van Der Sandt',
      tutor: {
        nombre: 'Familia Arden Van Der Sandt',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.arden',
        password: '54772551',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'juan-uircain-burriel',
      nroNomina: 61,
      nombre: 'Juan Ignacio',
      apellido: 'Uircain Burriel',
      dni: '53.615.914',
      usuario: 'juan.uircain',
      password: '53615914',
      fechaNacimiento: '2014-04-09',
      genero: 'M',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Uircain Burriel',
      tutor: {
        nombre: 'Familia Uircain Burriel',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.uircain',
        password: '53615914',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'maia-railef-benavidez',
      nroNomina: 62,
      nombre: 'Maia Aluhen',
      apellido: 'Railef Benavídez',
      dni: '54.090.153',
      usuario: 'maia.railef',
      password: '54090153',
      fechaNacimiento: '2014-08-19',
      genero: 'F',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Railef Benavídez',
      tutor: {
        nombre: 'Familia Railef Benavídez',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.railef',
        password: '54090153',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
    {
      id: 'thiago-perez-millaqueo',
      nroNomina: 63,
      nombre: 'Thiago Diego José',
      apellido: 'Pérez Millaqueo',
      dni: '53.615.924',
      usuario: 'thiago.perez',
      password: '53615924',
      fechaNacimiento: '2014-05-01',
      genero: 'M',
      categoria: 'U12',
      nivel: 'Inicial',
      ciudad: 'Valcheta',
      email: '',
      telefono: '',
      contactoEmergencia: 'Familia Pérez Millaqueo',
      tutor: {
        nombre: 'Familia Pérez Millaqueo',
        vinculo: 'Tutor/a',
        email: '',
        usuario: 'familia.perez',
        password: '53615924',
      },
      ingreso: '2026-03-01',
      antecedentes: 'Atleta de la Escuela Municipal de Atletismo Willilefche.',
      salud: 'Apto físico en seguimiento.',
      objetivos: [],
      marcas: [],
      resultados: [],
      evolucion: [],
      extra: [],
      adherencia: 100,
    },
  ],
  planes: {},
  competencias: [],
  pagos: [],
  avisos: [],
  mensajes: {},
};

/* ---------- Limpieza de campos undefined y reparación de acentos UTF-8 ---------- */
function fixMojibakeString(str) {
  if (typeof str !== 'string' || !str.includes('Ã')) return str;
  return str
    .replace(/Ã\u00ad/g, 'í')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã\u0081/g, 'Á')
    .replace(/Ã\u0089/g, 'É')
    .replace(/Ã\u008d/g, 'Í')
    .replace(/Ã\u0093/g, 'Ó')
    .replace(/Ã\u009a/g, 'Ú')
    .replace(/Ã\u0091/g, 'Ñ')
    .replace(/EfraÃn/g, 'Efraín')
    .replace(/RocÃo/g, 'Rocío')
    .replace(/DarÃo/g, 'Darío')
    .replace(/JazmÃn/g, 'Jazmín')
    .replace(/BenjamÃn/g, 'Benjamín')
    .replace(/RÃo/g, 'Río')
    .replace(/fÃsico/g, 'físico');
}

function fixMojibakeInObj(val) {
  if (typeof val === 'string') return fixMojibakeString(val);
  if (Array.isArray(val)) return val.map(fixMojibakeInObj);
  if (val && typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) out[k] = fixMojibakeInObj(v);
    }
    return out;
  }
  return val;
}

function sanitizeForFirestore(obj) {
  return fixMojibakeInObj(JSON.parse(JSON.stringify(obj)));
}

function isDummyData(dbObj) {
  if (!dbObj || !Array.isArray(dbObj.atletas)) return true;
  if (dbObj.equipo && dbObj.equipo.entrenador === 'Prof. Martín Ríos') return true;
  if (dbObj.atletas.some((a) => a.id === 'lucia-gomez' || a.id === 'tomas-ferreyra')) return true;
  return false;
}

function ensureInitialAtletasMerged(dbObj) {
  if (!dbObj || !Array.isArray(dbObj.atletas)) return false;
  let changed = false;
  const cleanDni = (s) => String(s || '').replace(/\D+/g, '');
  for (const initA of INITIAL_DB.atletas) {
    const existing = dbObj.atletas.find(
      (a) => a.id === initA.id || (a.legacyId && a.legacyId === initA.id) || (cleanDni(a.dni) && cleanDni(a.dni) === cleanDni(initA.dni))
    );
    if (!existing) {
      dbObj.atletas.push(JSON.parse(JSON.stringify(initA)));
      changed = true;
    } else {
      if (initA.altUsuarios && !existing.altUsuarios) {
        existing.altUsuarios = initA.altUsuarios;
        changed = true;
      }
      if (initA.altPasswords && !existing.altPasswords) {
        existing.altPasswords = initA.altPasswords;
        changed = true;
      }
      if (initA.tutor && initA.tutor.altUsuarios && existing.tutor && !existing.tutor.altUsuarios) {
        existing.tutor.altUsuarios = initA.tutor.altUsuarios;
        changed = true;
      }
    }
  }
  return changed;
}

function ensureCatalogosActualizados(dbObj) {
  if (!dbObj) return false;
  let changed = false;
  if (!Array.isArray(dbObj.disciplinasDisponibles)) {
    dbObj.disciplinasDisponibles = [];
  }
  DEFAULT_DISCIPLINAS.forEach((d) => {
    if (!dbObj.disciplinasDisponibles.includes(d)) {
      dbObj.disciplinasDisponibles.push(d);
      changed = true;
    }
  });
  if (!Array.isArray(dbObj.distanciasRanking)) {
    dbObj.distanciasRanking = [];
  }
  DEFAULT_DISTANCIAS_RANKING.forEach((dist) => {
    if (!dbObj.distanciasRanking.includes(dist)) {
      dbObj.distanciasRanking.push(dist);
      changed = true;
    }
  });
  return changed;
}

/* ---------- Generación de IDs Opacos y Migración de Privacidad ---------- */
function generarAtletaId() {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  let r = '';
  for (let i = 0; i < 8; i++) {
    r += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'atl_' + r;
}
window.generarAtletaId = generarAtletaId;

function migrarAtletaIdsAOpace(dbObj) {
  if (!dbObj || !Array.isArray(dbObj.atletas)) return false;
  let migrated = false;
  const idMap = {};

  dbObj.atletas.forEach((a) => {
    // Si el ID es un slug con nombre o no tiene prefijo atl_
    if (a.id && (!a.id.startsWith('atl_') || a.id.includes('-'))) {
      const oldId = a.id;
      const newId = generarAtletaId();
      a.legacyId = oldId;
      a.id = newId;
      idMap[oldId] = newId;
      migrated = true;
    }
  });

  if (migrated) {
    // 1. Planes (soporta estructura objeto por atletaId o array de planes)
    if (dbObj.planes && typeof dbObj.planes === 'object') {
      if (Array.isArray(dbObj.planes)) {
        dbObj.planes.forEach((p) => {
          if (p && idMap[p.atletaId]) p.atletaId = idMap[p.atletaId];
        });
      } else {
        Object.keys(idMap).forEach((oldId) => {
          if (dbObj.planes[oldId]) {
            dbObj.planes[idMap[oldId]] = dbObj.planes[oldId];
            delete dbObj.planes[oldId];
          }
        });
      }
    }

    // 2. Sesiones
    if (Array.isArray(dbObj.sesiones)) {
      dbObj.sesiones.forEach((s) => {
        if (s && idMap[s.atletaId]) s.atletaId = idMap[s.atletaId];
      });
    }

    // 3. Pagos
    if (Array.isArray(dbObj.pagos)) {
      dbObj.pagos.forEach((pg) => {
        if (pg && idMap[pg.atletaId]) pg.atletaId = idMap[pg.atletaId];
      });
    }

    // 4. Competencias
    if (Array.isArray(dbObj.competencias)) {
      dbObj.competencias.forEach((c) => {
        if (c) {
          if (Array.isArray(c.inscriptos)) {
            c.inscriptos = c.inscriptos.map((id) => idMap[id] || id);
          }
          if (Array.isArray(c.sugeridos)) {
            c.sugeridos = c.sugeridos.map((id) => idMap[id] || id);
          }
        }
      });
    }

    // 5. Avisos
    if (Array.isArray(dbObj.avisos)) {
      dbObj.avisos.forEach((av) => {
        if (av) {
          if (idMap[av.atletaId]) av.atletaId = idMap[av.atletaId];
          if (Array.isArray(av.destinatarios)) {
            av.destinatarios = av.destinatarios.map((id) => idMap[id] || id);
          }
        }
      });
    }

    // 6. Mensajes (objeto por atletaId)
    if (dbObj.mensajes && typeof dbObj.mensajes === 'object' && !Array.isArray(dbObj.mensajes)) {
      Object.keys(idMap).forEach((oldId) => {
        if (dbObj.mensajes[oldId]) {
          dbObj.mensajes[idMap[oldId]] = dbObj.mensajes[oldId];
          delete dbObj.mensajes[oldId];
        }
      });
    }

    // 7. Sesión activa
    if (window.Auth && typeof window.Auth.getSession === 'function') {
      const session = window.Auth.getSession();
      if (session && idMap[session.atletaId]) {
        session.atletaId = idMap[session.atletaId];
        window.Auth.setSession(session);
      }
    }
  }
  return migrated;
}
window.migrarAtletaIdsAOpace = migrarAtletaIdsAOpace;

/* ---------- Carga Inicial con Aislamiento Seguro ---------- */
function loadDB() {
  let session = null;
  try {
    const rawSession = localStorage.getItem('willilefche_session_real_v1');
    if (rawSession) session = JSON.parse(rawSession);
  } catch (e) {}
  if (!session && window.Auth && typeof window.Auth.getSession === 'function') {
    session = window.Auth.getSession();
  }

  const isAthleteOnly = Boolean(session && session.role === 'athlete' && session.atletaId);

  // 1. Si en este dispositivo hay una sesión exclusiva de atleta/menor: cargar solo su perfil aislado
  if (isAthleteOnly) {
    try {
      const atletaRaw = localStorage.getItem(`willilefche_atleta_${session.atletaId}`);
      if (atletaRaw) {
        const parsed = fixMojibakeInObj(JSON.parse(atletaRaw));
        if (parsed && parsed.atleta) {
          return {
            appKey: 'WLF-VALCHETA-2026',
            hoy: getTodayISO(),
            semanaActual: getCurrentWeekISO(getTodayISO()),
            equipo: {
              nombre: 'Escuela Municipal Willilefche',
              sede: 'Valcheta, Río Negro',
              entrenador: 'Cristian Javier Torres',
            },
            atletas: [parsed.atleta],
            planes: parsed.planes || [],
            sesiones: parsed.sesiones || [],
            pagos: parsed.pagos || [],
            avisos: parsed.avisos || [],
            competencias: parsed.competencias || [],
            ranking_publico: parsed.ranking_publico || [],
            distanciasRanking: DEFAULT_DISTANCIAS_RANKING,
          };
        }
      }
    } catch (e) {}
  }

  // 2. Para el Entrenador, Administrador o modo general: SIEMPRE cargar la base completa con los 63 atletas
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = fixMojibakeInObj(JSON.parse(raw));
      if (parsed && Array.isArray(parsed.atletas) && parsed.atletas.length > 0 && !isDummyData(parsed)) {
        parsed.equipo = {
          ...INITIAL_DB.equipo,
          ...(parsed.equipo || {}),
          adminUser: parsed.equipo?.adminUser || 'admin',
          adminPass: parsed.equipo?.adminPass || 'Admin123@',
          entrenador: parsed.equipo?.entrenador || 'Cristian Javier Torres',
          entrenadorDni: parsed.equipo?.entrenadorDni || '27.884.821',
          entrenadorFechaNacimiento: parsed.equipo?.entrenadorFechaNacimiento || '1980-07-02',
          coachUser: parsed.equipo?.coachUser || 'cristian.torres',
          coachPass: parsed.equipo?.coachPass || '27884821',
        };
        if (!Array.isArray(parsed.conceptosCobro) || parsed.conceptosCobro.length === 0) {
          parsed.conceptosCobro = JSON.parse(JSON.stringify(DEFAULT_CONCEPTOS_COBRO));
        }
        ensureCatalogosActualizados(parsed);
        ensureInitialAtletasMerged(parsed);
        migrarAtletaIdsAOpace(parsed);
        parsed.hoy = getTodayISO();
        parsed.semanaActual = getCurrentWeekISO(parsed.hoy);
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error leyendo localStorage:', e);
  }

  // Respaldo confiable: cargar INITIAL_DB con los 63 atletas
  const fresh = JSON.parse(JSON.stringify(INITIAL_DB));
  migrarAtletaIdsAOpace(fresh);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch (e) {}
  return fresh;
}

window.DB = loadDB();

/* ---------- Motor de Sincronización Firebase Firestore ---------- */
const CloudSync = {
  firestore: null,
  status: 'local', // 'local' | 'connecting' | 'online' | 'error'
  statusText: 'Modo Local (Sin nube)',
  _unsubscribe: null,
  _ignoreNextSnapshot: false,

  getActiveFirebaseConfig() {
    try {
      const customRaw = localStorage.getItem(CUSTOM_FB_CONFIG_KEY);
      if (customRaw) {
        const parsed = JSON.parse(customRaw);
        if (parsed && parsed.apiKey && parsed.projectId) {
          if (!parsed.databaseId) parsed.databaseId = (window.firebaseConfig && window.firebaseConfig.databaseId) || 'default';
          return parsed;
        }
      }
    } catch (e) {}
    return window.firebaseConfig || null;
  },

  isConfigValid(cfg) {
    return Boolean(
      cfg &&
        cfg.apiKey &&
        cfg.projectId &&
        !String(cfg.apiKey).includes('PEGAR_AQUI') &&
        String(cfg.apiKey).length > 10
    );
  },

  init() {
    const cfg = this.getActiveFirebaseConfig();
    if (!this.isConfigValid(cfg)) {
      this.setStatus('local', 'Modo Local · Falta configurar Firebase');
      return;
    }

    if (!window.firebase || !window.firebase.firestore) {
      this.setStatus('error', 'SDK de Firebase no disponible');
      return;
    }

    try {
      this.setStatus('connecting', 'Conectando a Firebase…');
      if (!window.firebase.apps.length) {
        window.firebase.initializeApp(cfg);
      }
      this.firestore = window.firebase.firestore();
      const targetDbId = cfg.databaseId || 'default';
      if (this.firestore && this.firestore._delegate && this.firestore._delegate._databaseId) {
        this.firestore._delegate._databaseId.database = targetDbId;
      }

      // Habilitar persistencia offline de Firestore
      this.firestore
        .enablePersistence({ synchronizeTabs: true })
        .catch(() => {});

      // Escuchar Firebase Authentication antes de suscribirse a Firestore
      if (window.firebase && typeof window.firebase.auth === 'function') {
        const auth = window.firebase.auth();
        auth.onAuthStateChanged(async (user) => {
          if (user) {
            this.dispatchSubscriptionByRole();
          } else {
            const session =
              window.Auth && typeof window.Auth.getSession === 'function' ? window.Auth.getSession() : null;
            if (session) {
              this.setStatus('connecting', 'Conectando con Firebase Auth…');
              if (window.Auth && typeof window.Auth.ensureFirebaseAuth === 'function') {
                const authedUser = await window.Auth.ensureFirebaseAuth(session);
                if (authedUser) {
                  this.dispatchSubscriptionByRole();
                  return;
                }
              }
            }
            // Visitante público sin sesión
            this.startPublicFirestoreSubscription();
          }
        });
      } else {
        this.dispatchSubscriptionByRole();
      }
    } catch (err) {
      console.error('Error inicializando Firebase:', err);
      this.setStatus('error', 'Error de configuración Firebase');
    }
  },

  _unsubscribers: [],

  stopSubscriptions() {
    if (this._unsubscribe) {
      try {
        this._unsubscribe();
      } catch (e) {}
      this._unsubscribe = null;
    }
    if (Array.isArray(this._unsubscribers)) {
      while (this._unsubscribers.length) {
        const unsub = this._unsubscribers.pop();
        if (typeof unsub === 'function') {
          try {
            unsub();
          } catch (e) {}
        }
      }
    }
  },

  dispatchSubscriptionByRole() {
    const session =
      window.Auth && typeof window.Auth.getSession === 'function' ? window.Auth.getSession() : null;
    if (session && (session.role === 'coach' || session.subRole === 'admin')) {
      this.startFirestoreSubscription();
    } else if (session && session.atletaId) {
      this.startAtletaFirestoreSubscription(session.atletaId);
    } else {
      this.startPublicFirestoreSubscription();
    }
  },

  startAtletaFirestoreSubscription(atletaId) {
    if (!this.firestore || !atletaId) return;
    this.stopSubscriptions();
    const db = this.firestore;
    this.setStatus('connecting', 'Cargando tu información…');

    // 1. Perfil del atleta (nombres, categoría, disciplinas)
    const unsubAtleta = db
      .collection('atletas')
      .doc(atletaId)
      .onSnapshot(
        (snap) => {
          if (snap.exists) {
            const data = fixMojibakeInObj(snap.data());
            const existing = (window.DB.atletas || []).find((a) => a.id === atletaId) || {};
            window.DB.atletas = [{ ...existing, ...data }];
            saveDB();
            if (typeof window.renderApp === 'function') window.renderApp(true);
          }
        },
        (err) => console.warn('Atleta sub error:', err)
      );
    this._unsubscribers.push(unsubAtleta);

    // 2. Ficha privada sensible del propio atleta (salud, apto, tutor, DNI)
    const unsubFicha = db
      .collection('atletas')
      .doc(atletaId)
      .collection('privado')
      .doc('ficha')
      .onSnapshot(
        (snap) => {
          if (snap.exists) {
            const data = fixMojibakeInObj(snap.data());
            const existing = (window.DB.atletas || []).find((a) => a.id === atletaId) || {};
            window.DB.atletas = [{ ...existing, ...data }];
            saveDB();
            if (typeof window.renderApp === 'function') window.renderApp(true);
          }
        },
        (err) => console.warn('Ficha sub error:', err)
      );
    this._unsubscribers.push(unsubFicha);

    // 3. Pagos de este atleta (where atletaId == atletaId)
    const unsubPagos = db
      .collection('pagos')
      .where('atletaId', '==', atletaId)
      .onSnapshot(
        (snap) => {
          window.DB.pagos = snap.docs.map((d) => fixMojibakeInObj(d.data()));
          saveDB();
          if (typeof window.renderApp === 'function') window.renderApp(true);
        },
        (err) => console.warn('Pagos sub error:', err)
      );
    this._unsubscribers.push(unsubPagos);

    // 4. Sesiones asignadas a este atleta (where atletaId == atletaId)
    const unsubSesiones = db
      .collection('sesiones')
      .where('atletaId', '==', atletaId)
      .onSnapshot(
        (snap) => {
          window.DB.sesiones = snap.docs.map((d) => fixMojibakeInObj(d.data()));
          saveDB();
          if (typeof window.renderApp === 'function') window.renderApp(true);
        },
        (err) => console.warn('Sesiones sub error:', err)
      );
    this._unsubscribers.push(unsubSesiones);

    // 5. Avisos dirigidos a este atleta (where destinatarios array-contains-any [atletaId, 'TODOS'])
    const unsubAvisos = db
      .collection('avisos')
      .where('destinatarios', 'array-contains-any', [atletaId, 'TODOS'])
      .onSnapshot(
        (snap) => {
          window.DB.avisos = snap.docs.map((d) => fixMojibakeInObj(d.data()));
          saveDB();
          if (typeof window.renderApp === 'function') window.renderApp(true);
        },
        (err) => console.warn('Avisos sub error:', err)
      );
    this._unsubscribers.push(unsubAvisos);

    // 6. Competencias públicas
    const unsubCompetencias = db.collection('competencias').onSnapshot(
      (snap) => {
        window.DB.competencias = snap.docs.map((d) => fixMojibakeInObj(d.data()));
        saveDB();
        if (typeof window.renderApp === 'function') window.renderApp(true);
      },
      (err) => console.warn('Competencias sub error:', err)
    );
    this._unsubscribers.push(unsubCompetencias);

    // 7. Ranking público anonimizado
    const unsubRanking = db.collection('ranking_publico').onSnapshot(
      (snap) => {
        window.DB.ranking_publico = snap.docs.map((d) => fixMojibakeInObj(d.data()));
        this.setStatus('online', 'Sincronizado en vivo');
        saveDB();
        if (typeof window.renderApp === 'function') window.renderApp(true);
      },
      (err) => console.warn('Ranking sub error:', err)
    );
    this._unsubscribers.push(unsubRanking);
  },

  startPublicFirestoreSubscription() {
    if (!this.firestore) return;
    this.stopSubscriptions();
    const db = this.firestore;

    // Solo competencias y ranking_publico (sin fichas de atletas)
    const unsubCompetencias = db.collection('competencias').onSnapshot(
      (snap) => {
        window.DB.competencias = snap.docs.map((d) => fixMojibakeInObj(d.data()));
        if (typeof window.renderApp === 'function') window.renderApp(true);
      },
      () => {}
    );
    this._unsubscribers.push(unsubCompetencias);

    const unsubRanking = db.collection('ranking_publico').onSnapshot(
      (snap) => {
        window.DB.ranking_publico = snap.docs.map((d) => fixMojibakeInObj(d.data()));
        this.setStatus('online', 'Público');
        if (typeof window.renderApp === 'function') window.renderApp(true);
      },
      () => {}
    );
    this._unsubscribers.push(unsubRanking);
  },

  startFirestoreSubscription() {
    if (!this.firestore) return;
    this.stopSubscriptions();

    const docRef = this.firestore.collection('willilefche').doc('main_db');

    this._unsubscribe = docRef.onSnapshot(
      (snapshot) => {
        if (this._ignoreNextSnapshot) {
          this._ignoreNextSnapshot = false;
          this.setStatus('online', 'Sincronizado en vivo');
          return;
        }

        if (snapshot.exists) {
          const cloudData = fixMojibakeInObj(snapshot.data());
          // Si en la nube habían quedado datos de prueba viejos, migrar automáticamente los datos reales
          if (isDummyData(cloudData)) {
            console.log('Migrando Nómina Inicial real a Firebase Firestore...');
            this.pushToCloud();
            return;
          }
          if (cloudData) {
            if (!Array.isArray(cloudData.atletas) || cloudData.atletas.length === 0) {
              cloudData.atletas = JSON.parse(JSON.stringify(INITIAL_DB.atletas));
            }
            if (!Array.isArray(cloudData.conceptosCobro) || cloudData.conceptosCobro.length === 0) {
              cloudData.conceptosCobro = JSON.parse(JSON.stringify(DEFAULT_CONCEPTOS_COBRO));
            }
            const mergedCatalogos = ensureCatalogosActualizados(cloudData);
            const mergedNew = ensureInitialAtletasMerged(cloudData);
            const migratedIds = migrarAtletaIdsAOpace(cloudData);
            window.DB = cloudData;
            window.DB.hoy = getTodayISO();
            window.DB.semanaActual = getCurrentWeekISO(window.DB.hoy);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(window.DB));
            } catch (e) {}
            if (mergedNew || mergedCatalogos || migratedIds) {
              this.pushToCloud();
            } else {
              this.setStatus('online', 'Sincronizado en vivo');
            }
            if (typeof window.renderApp === 'function') {
              window.renderApp(true);
            }
          }
        } else {
          // Primera vez que se conecta el proyecto Firebase: subir Nómina Inicial real automáticamente
          this.pushToCloud();
        }
      },
      (err) => {
        console.error('Error en suscripción Firestore:', err);
        if (err.code === 'permission-denied') {
          this.setStatus('error', 'Permiso denegado (Revisar Reglas Firestore)');
        } else if (err.code === 'not-found' || (err.message && err.message.includes('does not exist'))) {
          this.setStatus('error', 'Falta crear Firestore Database en consola');
        } else {
          this.setStatus('error', 'Sin conexión (Guardando en caché local)');
        }
      }
    );
  },

  setStatus(status, text) {
    this.status = status;
    this.statusText = text;
    const badges = document.querySelectorAll('[data-cloud-badge]');
    badges.forEach((b) => {
      b.innerHTML = this.renderBadgeHtml();
    });
  },

  renderBadgeHtml() {
    const map = {
      online: ['bg-success-soft text-success border-success/30', '●'],
      connecting: ['bg-warning-soft text-warning-text border-warning/30', '◌'],
      error: ['bg-destructive/15 text-destructive border-destructive/30', '▲'],
      local: ['bg-muted text-muted-foreground border-border', '○'],
    };
    const [cls, dot] = map[this.status] || map.local;
    return `
      <span
        title="Estado de sincronización de la base de datos"
        class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold select-none ${cls}"
      >
        <span>${dot}</span>
        <span>${this.statusText}</span>
      </span>
    `;
  },

  async pushToCloud() {
    if (!this.firestore) return false;
    try {
      this._ignoreNextSnapshot = true;
      window.DB.appKey = 'WLF-VALCHETA-2026';
      window.DB.updatedAt = Date.now();
      const cleanData = sanitizeForFirestore(window.DB);
      await this.firestore.collection('willilefche').doc('main_db').set(cleanData);

      // También sincronizar colección individual de atletas/usuarios para consultas directas en Firebase
      try {
        const batch = this.firestore.batch();
        const usersCol = this.firestore.collection('willilefche_usuarios');
        // Admin
        batch.set(usersCol.doc('admin'), {
          appKey: 'WLF-VALCHETA-2026',
          id: 'admin',
          usuario: window.DB.equipo.adminUser || 'admin',
          password: window.DB.equipo.adminPass || 'Admin123@',
          role: 'admin',
          nombre: 'Administrador',
          updatedAt: window.DB.updatedAt,
        });
        // Entrenador (Fila 19)
        batch.set(usersCol.doc('entrenador_cristian_torres'), {
          appKey: 'WLF-VALCHETA-2026',
          id: 'entrenador_cristian_torres',
          nroNomina: 19,
          usuario: window.DB.equipo.coachUser || 'cristian.torres',
          password: window.DB.equipo.coachPass || '27884821',
          role: 'coach',
          nombre: window.DB.equipo.entrenador || 'Cristian Javier Torres',
          dni: window.DB.equipo.entrenadorDni || '27.884.821',
          fechaNacimiento: window.DB.equipo.entrenadorFechaNacimiento || '1980-07-02',
          updatedAt: window.DB.updatedAt,
        });
        // Atletas
        (window.DB.atletas || []).forEach((a) => {
          batch.set(usersCol.doc(a.id), {
            appKey: 'WLF-VALCHETA-2026',
            id: a.id,
            nroNomina: a.nroNomina || null,
            nombre: a.nombre,
            apellido: a.apellido,
            dni: a.dni || '',
            fechaNacimiento: a.fechaNacimiento || '',
            categoria: a.categoria || '',
            usuario: a.usuario,
            password: a.password,
            role: 'athlete',
            tutor: a.tutor || null,
            updatedAt: window.DB.updatedAt,
          });
        });
        await batch.commit();
      } catch (subErr) {
        console.warn('Aviso al sincronizar colección secundaria:', subErr);
      }

      this.setStatus('online', 'Sincronizado en Nube');
      // Sincronizar en segundo plano las colecciones modulares seguras
      this.blindarBaseYCrearColecciones().catch((e) => {
        console.warn('Aviso sincronizando colecciones modulares:', e);
      });
      return true;
    } catch (e) {
      console.error('Error guardando en Firestore:', e);
      this._ignoreNextSnapshot = false;
      this.setStatus('error', 'Error al guardar en nube');
      return false;
    }
  },

  async blindarBaseYCrearColecciones() {
    if (!this.firestore) return { ok: false, error: 'Firestore no está inicializado.' };
    try {
      const db = this.firestore;
      const now = Date.now();

      // 1. Colección 'configuracion/general'
      try {
        await db.collection('configuracion').doc('general').set(
          sanitizeForFirestore({
            equipo: window.DB.equipo || {},
            conceptosCobro: window.DB.conceptosCobro || [],
            disciplinas: window.DB.disciplinas || [],
            updatedAt: now,
          }),
          { merge: true }
        );
      } catch (e1) {
        console.warn('Aviso configuracion/general:', e1.message);
      }

      // 2. Desacoplar Atletas en Perfil Público y Subcolección Privada/Ficha
      const atletas = window.DB.atletas || [];
      for (const a of atletas) {
        try {
          // Documento público deportivo (nombres, categoría, disciplinas)
          await db.collection('atletas').doc(a.id).set(
            sanitizeForFirestore({
              id: a.id,
              nroNomina: a.nroNomina || null,
              nombre: a.nombre || '',
              apellido: a.apellido || '',
              categoria: a.categoria || '',
              usuario: a.usuario || '',
              disciplinas: a.disciplinas || [],
              tiposAtleta: a.tiposAtleta || [],
              subdisciplinas: a.subdisciplinas || [],
              pruebas: a.pruebas || '',
              objetivo: a.objetivo || '',
              activo: a.activo !== false,
              updatedAt: now,
            }),
            { merge: true }
          );

          // Subdocumento privado sensible (DNI, fecha nac, salud, contacto tutores)
          await db.collection('atletas').doc(a.id).collection('privado').doc('ficha').set(
            sanitizeForFirestore({
              id: a.id,
              dni: a.dni || '',
              fechaNacimiento: a.fechaNacimiento || '',
              email: a.email || '',
              telefono: a.telefono || '',
              tutor: a.tutor || null,
              salud: a.salud || null,
              infoDeportiva: a.infoDeportiva || null,
              updatedAt: now,
            }),
            { merge: true }
          );
        } catch (eAtleta) {
          console.warn(`Aviso atleta ${a.id}:`, eAtleta.message);
        }
      }

      // 3. Colección 'pagos/{id}' (sensible, restringida a Coach o Atleta dueño)
      const pagos = window.DB.pagos || [];
      for (const p of pagos) {
        try {
          await db.collection('pagos').doc(p.id).set(sanitizeForFirestore({ ...p, updatedAt: now }), { merge: true });
        } catch (ePago) {}
      }

      // 4. Colecciones de Planes, Sesiones, Asistencias, Competencias y Resultados
      const planes = window.DB.planes || [];
      for (const pl of planes) {
        try {
          await db.collection('planes').doc(pl.id).set(sanitizeForFirestore({ ...pl, updatedAt: now }), { merge: true });
        } catch (ePl) {}
      }

      const sesiones = window.DB.sesiones || [];
      for (const s of sesiones) {
        try {
          await db.collection('sesiones').doc(s.id).set(sanitizeForFirestore({ ...s, updatedAt: now }), { merge: true });
        } catch (eS) {}
      }

      const asistencias = window.DB.asistencias || [];
      for (const as of asistencias) {
        try {
          await db.collection('asistencias').doc(as.id).set(sanitizeForFirestore({ ...as, updatedAt: now }), { merge: true });
        } catch (eAs) {}
      }

      const competencias = window.DB.competencias || [];
      for (const c of competencias) {
        try {
          await db.collection('competencias').doc(c.id).set(sanitizeForFirestore({ ...c, updatedAt: now }), { merge: true });
        } catch (eC) {}
      }

      const resultados = window.DB.resultados || [];
      for (const r of resultados) {
        try {
          await db.collection('resultados').doc(r.id).set(sanitizeForFirestore({ ...r, updatedAt: now }), { merge: true });
        } catch (eR) {}
      }

      // 5. Colección 'avisos/{id}' (con array de destinatarios)
      const avisos = window.DB.avisos || [];
      for (const av of avisos) {
        try {
          await db.collection('avisos').doc(av.id).set(sanitizeForFirestore({ ...av, updatedAt: now }), { merge: true });
        } catch (eAv) {}
      }

      // 6. Colección 'ranking_publico/{prueba}_{atletaId}' (datos públicos disociados de la ficha médica)
      for (const a of atletas) {
        try {
          if (a.excluirRanking) {
            await this.borrarRankingPublicoDeAtleta(a.id);
          } else if (Array.isArray(a.marcas)) {
            for (const m of a.marcas) {
              await this.guardarRankingPublicoItem({
                prueba: m.distancia,
                distancia: m.distancia,
                atletaId: a.id,
                nombre: `${a.nombre} ${a.apellido ? a.apellido[0] + '.' : ''}`,
                categoria: a.categoria || '',
                edad: window.Helpers ? window.Helpers.edad(a.fechaNacimiento) : null,
                genero: a.genero || '',
                tiempo: m.tiempo,
                fecha: m.fecha || '',
                competencia: m.competencia || '',
              });
            }
          }
        } catch (eRank) {}
      }

      // 7. Vincular usuario actual en 'usuarios/{uid}' si hay sesión activa con UID
      const cur = window.Auth && window.Auth.getSession();
      if (cur && cur.uid) {
        try {
          await db.collection('usuarios').doc(cur.uid).set(
            {
              uid: cur.uid,
              usuario: cur.usuario || '',
              nombre: cur.nombre || '',
              role: cur.subRole === 'admin' ? 'admin' : cur.role === 'coach' ? 'entrenador' : 'atleta',
              updatedAt: now,
            },
            { merge: true }
          );
        } catch (eU) {}
      }

      return { ok: true, mensaje: 'Base de datos blindada y colecciones separadas con éxito en Firestore.' };
    } catch (err) {
      console.error('Error en blindarBaseYCrearColecciones:', err);
      return { ok: false, error: err.message || 'Error al desacoplar colecciones' };
    }
  },

  async guardarRankingPublicoItem(item) {
    if (!this.firestore || !item || !item.atletaId) return;
    try {
      const pruebaNorm = String(item.distancia || item.prueba || '').replace(/[^a-zA-Z0-9]/g, '_');
      const docId = `${pruebaNorm}_${item.atletaId}`;
      await this.firestore.collection('ranking_publico').doc(docId).set(
        sanitizeForFirestore({
          id: docId,
          prueba: item.distancia || item.prueba,
          distancia: item.distancia || item.prueba,
          atletaId: item.atletaId,
          nombre: item.nombre,
          categoria: item.categoria || '',
          edad: item.edad || null,
          genero: item.genero || '',
          tiempo: item.tiempo,
          fecha: item.fecha || '',
          competencia: item.competencia || '',
          updatedAt: Date.now(),
        }),
        { merge: true }
      );
    } catch (e) {
      console.warn('Aviso guardando ranking_publico:', e.message || e);
    }
  },

  async borrarRankingPublicoDeAtleta(atletaId) {
    if (!this.firestore || !atletaId) return;
    try {
      const snap = await this.firestore.collection('ranking_publico').where('atletaId', '==', atletaId).get();
      const batch = this.firestore.batch();
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {
      console.warn('Aviso borrando ranking_publico de atleta:', e.message || e);
    }
  },
};

window.CloudSync = CloudSync;

function saveDB() {
  window.DB.updatedAt = Date.now();
  const session =
    window.Auth && typeof window.Auth.getSession === 'function' ? window.Auth.getSession() : null;
  const isCoachOrAdmin = Boolean(session && (session.role === 'coach' || session.subRole === 'admin'));

  if (isCoachOrAdmin) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(window.DB));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage:', e);
    }
    CloudSync.pushToCloud();
  } else if (session && session.atletaId) {
    // Para atletas / familias: solo guardar su propia caché individual (sin datos de terceros)
    try {
      const a =
        (window.DB.atletas || []).find((x) => x.id === session.atletaId || x.legacyId === session.atletaId) ||
        (window.DB.atletas || [])[0];
      const cacheAtleta = {
        atleta: a,
        planes: (window.DB.planes || []).filter((p) => p.atletaId === session.atletaId),
        sesiones: (window.DB.sesiones || []).filter((s) => s.atletaId === session.atletaId),
        pagos: (window.DB.pagos || []).filter((pg) => pg.atletaId === session.atletaId),
        avisos: (window.DB.avisos || []).filter(
          (av) =>
            Array.isArray(av.destinatarios) &&
            (av.destinatarios.includes(session.atletaId) || av.destinatarios.includes('TODOS'))
        ),
        competencias: window.DB.competencias || [],
        ranking_publico: window.DB.ranking_publico || [],
      };
      localStorage.setItem(`willilefche_atleta_${session.atletaId}`, JSON.stringify(cacheAtleta));
    } catch (e) {}
  }
}

function resetDB() {
  const s = window.Auth && typeof window.Auth.getSession === 'function' ? window.Auth.getSession() : null;
  if (!s || s.subRole !== 'admin') return;
  window.DB = JSON.parse(JSON.stringify(INITIAL_DB));
  saveDB();
}

window.saveDB = saveDB;
window.resetDB = resetDB;

/* ---------- Funciones de Backup (Exportar / Importar JSON - Exclusivo Admin) ---------- */
window.exportBackupJSON = () => {
  const s = window.Auth && typeof window.Auth.getSession === 'function' ? window.Auth.getSession() : null;
  if (!s || s.subRole !== 'admin') {
    if (window.showToast) window.showToast('Acceso restringido al Administrador', 'info');
    return;
  }
  const dataStr = JSON.stringify(window.DB, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_willilefche_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  if (window.showToast) window.showToast('Copia de seguridad descargada');
};

window.importBackupJSON = (fileInput) => {
  const s = window.Auth && typeof window.Auth.getSession === 'function' ? window.Auth.getSession() : null;
  if (!s || s.subRole !== 'admin') {
    if (window.showToast) window.showToast('Acceso restringido al Administrador', 'info');
    return;
  }
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed || !Array.isArray(parsed.atletas)) {
        alert('El archivo seleccionado no es un backup válido de Willilefche.');
        return;
      }
      window.DB = parsed;
      saveDB();
      if (window.closeModal) window.closeModal();
      if (window.showToast) window.showToast('Copia de seguridad restaurada con éxito');
      if (window.renderApp) window.renderApp();
    } catch (err) {
      alert('Error al leer el archivo JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
};

/* ---------- Helpers de formato y consulta ---------- */

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

window.Helpers = {
  getAtleta(id) {
    if (!id || !Array.isArray(window.DB.atletas)) return null;
    return window.DB.atletas.find((a) => a.id === id || a.legacyId === id);
  },
  getPlan(atletaId) {
    return (window.DB.planes[atletaId] || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
  },
  getPagos(atletaId) {
    return window.DB.pagos.filter((p) => p.atletaId === atletaId);
  },
  nombreCompleto(a) {
    return `${a.nombre} ${a.apellido}`;
  },
  edad(fechaNacimiento, hoy = window.DB.hoy) {
    if (!fechaNacimiento) return 0;
    const [y, m, d] = fechaNacimiento.split('-').map(Number);
    const [hy, hm, hd] = (hoy || getTodayISO()).split('-').map(Number);
    let e = hy - y;
    if (hm < m || (hm === m && hd < d)) e--;
    return e;
  },
  calcularCategoria(fechaNacimiento, hoy = window.DB.hoy) {
    const e = this.edad(fechaNacimiento, hoy);
    if (e <= 9) return 'Infantiles';
    if (e <= 11) return 'U12';
    if (e <= 13) return 'U14';
    if (e <= 15) return 'U16';
    if (e <= 17) return 'U18';
    if (e <= 19) return 'U20';
    if (e <= 34) return 'Mayores';
    if (e <= 44) return 'Master A';
    return 'Master B';
  },
  deudaDe(atletaId) {
    return this.getPagos(atletaId)
      .filter((p) => p.estado !== 'pagado')
      .reduce((t, p) => t + p.monto, 0);
  },
  tieneVencidos(atletaId) {
    return this.getPagos(atletaId).some((p) => p.estado === 'vencido');
  },
  aSegundos(t) {
    return String(t)
      .replace('″', '')
      .split(':')
      .map(Number)
      .reduce((acc, n) => acc * 60 + n, 0);
  },
  esPruebaDeCampo(prueba) {
    const s = String(prueba || '').toLowerCase();
    return (
      s.includes('lanzamiento') ||
      s.includes('jabalina') ||
      s.includes('bala') ||
      s.includes('martillo') ||
      s.includes('disco') ||
      s.includes('pelotita') ||
      s.includes('salto') ||
      s.includes('garrocha')
    );
  },
  atletaPracticaDisciplina(atleta, filtro) {
    if (!filtro || filtro === 'Todas') return true;
    if (!atleta) return false;
    const f = String(filtro).trim().toLowerCase();
    const discList = (Array.isArray(atleta.disciplinas) ? atleta.disciplinas : []).map((d) =>
      String(d).trim().toLowerCase()
    );
    const tiposList = (Array.isArray(atleta.tiposAtleta) ? atleta.tiposAtleta : []).map((t) =>
      String(t).trim().toLowerCase()
    );
    const pruebasList = String(atleta.pruebas || '')
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);

    if (
      discList.includes(f) ||
      tiposList.includes(f) ||
      pruebasList.includes(f) ||
      String(atleta.pruebas || '').toLowerCase().includes(f)
    ) {
      return true;
    }

    const bloques = window.DISCIPLINAS_POR_BLOQUE || [];
    for (const b of bloques) {
      const esBloqueMatch =
        b.id.toLowerCase() === f ||
        (b.tipoAtleta && b.tipoAtleta.toLowerCase() === f) ||
        (b.id === 'running' && (f === 'corredor' || f === 'running'));

      if (esBloqueMatch) {
        if (tiposList.includes(b.id.toLowerCase()) || (b.tipoAtleta && tiposList.includes(b.tipoAtleta.toLowerCase()))) {
          return true;
        }
        const todasDiscBloque = (b.disciplinas || []).map((x) => x.toLowerCase());
        if (discList.some((d) => todasDiscBloque.includes(d))) return true;
        const todasPruebasBloque = (b.pruebasSugeridas || []).map((x) => x.toLowerCase());
        if (pruebasList.some((p) => todasPruebasBloque.includes(p))) return true;
      }

      for (const sub of b.subdisciplinas || []) {
        const aliasesLow = (sub.aliases || [sub.nombre]).map((x) => x.toLowerCase());
        if (sub.nombre.toLowerCase() === f || sub.id.toLowerCase() === f || aliasesLow.includes(f)) {
          if (discList.some((d) => aliasesLow.includes(d) || d === sub.nombre.toLowerCase())) return true;
          const pruebasSubLow = (sub.pruebas || []).map((x) => x.toLowerCase());
          if (
            discList.some((d) => pruebasSubLow.includes(d)) ||
            pruebasList.some((p) => pruebasSubLow.includes(p))
          ) {
            return true;
          }
        }
      }
    }
    return false;
  },
  aMetros(val) {
    const num = parseFloat(
      String(val || '')
        .replace(',', '.')
        .replace(/[^0-9.]/g, '')
    );
    return Number.isFinite(num) ? num : 0;
  },
  formatoRitmo(seg) {
    const m = Math.floor(seg / 60);
    const s = String(seg % 60).padStart(2, '0');
    return `${m}:${s}`;
  },
  pesos(n) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(n);
  },
  fechaCorta(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${MESES[m - 1]} ${y}`;
  },
  diaSemana(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return { dia: DIAS[dt.getUTCDay()], num: d, mes: MESES[m - 1] };
  },
  diasHasta(iso, hoy = window.DB.hoy) {
    const a = Date.parse(`${iso}T00:00:00Z`);
    const b = Date.parse(`${hoy}T00:00:00Z`);
    return Math.round((a - b) / 86400000);
  },
  rankingPublico(distancia) {
    const esCampo = this.esPruebaDeCampo(distancia);
    // 1. Usar colección pública separada ranking_publico (no lee fichas ni datos privados de atletas)
    if (Array.isArray(window.DB.ranking_publico) && window.DB.ranking_publico.length > 0) {
      return window.DB.ranking_publico
        .filter((r) => r.distancia === distancia || r.prueba === distancia)
        .map((r) => ({
          id: r.atletaId || r.id,
          nombre: r.nombre,
          categoria: r.categoria,
          genero: r.genero,
          edad: r.edad,
          tiempo: r.tiempo,
          competencia: r.competencia,
          fecha: r.fecha,
        }))
        .sort((x, y) =>
          esCampo
            ? this.aMetros(y.tiempo) - this.aMetros(x.tiempo)
            : this.aSegundos(x.tiempo) - this.aSegundos(y.tiempo)
        );
    }
    // 2. Respaldo (solo si DB.atletas está disponible en el entorno del entrenador)
    if (Array.isArray(window.DB.atletas)) {
      return window.DB.atletas
        .filter((a) => !a.excluirRanking)
        .flatMap((a) =>
          (a.marcas || [])
            .filter((m) => m.distancia === distancia)
            .map((m) => ({
              id: a.id,
              nombre: `${a.nombre} ${a.apellido ? a.apellido[0] + '.' : ''}`,
              categoria: a.categoria,
              genero: a.genero,
              edad: this.edad(a.fechaNacimiento),
              tiempo: m.tiempo,
              competencia: m.competencia,
              fecha: m.fecha,
            }))
        )
        .sort((x, y) =>
          esCampo
            ? this.aMetros(y.tiempo) - this.aMetros(x.tiempo)
            : this.aSegundos(x.tiempo) - this.aSegundos(y.tiempo)
        );
    }
    return [];
  },
};
