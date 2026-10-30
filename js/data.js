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
    // Usuario Entrenador (Renglón 19 de la Nómina Inicial)
    entrenador: 'Cristian Javier Torres',
    entrenadorDni: '27.884.821',
    entrenadorFechaNacimiento: '1980-07-02',
    coachUser: 'cristian.torres',
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

/* ---------- Sanitización de Credenciales (Cero contraseñas en texto plano) ---------- */
function sanitizeDBCredentials(dbObj) {
  if (!dbObj) return dbObj;
  if (Array.isArray(dbObj.atletas)) {
    dbObj.atletas.forEach((a) => {
      delete a.password;
      delete a.altPasswords;
      if (a.tutor) {
        delete a.tutor.password;
        delete a.tutor.altPasswords;
      }
    });
  }
  if (dbObj.equipo) {
    delete dbObj.equipo.adminPass;
    delete dbObj.equipo.coachPass;
  }
  return dbObj;
}
window.sanitizeDBCredentials = sanitizeDBCredentials;

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
          entrenador: parsed.equipo?.entrenador || 'Cristian Javier Torres',
          entrenadorDni: parsed.equipo?.entrenadorDni || '27.884.821',
          entrenadorFechaNacimiento: parsed.equipo?.entrenadorFechaNacimiento || '1980-07-02',
          coachUser: parsed.equipo?.coachUser || 'cristian.torres',
        };
        if (!Array.isArray(parsed.conceptosCobro) || parsed.conceptosCobro.length === 0) {
          parsed.conceptosCobro = JSON.parse(JSON.stringify(DEFAULT_CONCEPTOS_COBRO));
        }
        ensureCatalogosActualizados(parsed);
        ensureInitialAtletasMerged(parsed);
        migrarAtletaIdsAOpace(parsed);
        parsed.hoy = getTodayISO();
        parsed.semanaActual = getCurrentWeekISO(parsed.hoy);
        sanitizeDBCredentials(parsed);
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
    sanitizeDBCredentials(fresh);
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
              this.setStatus('connecting', 'Verificando sesión…');
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

        // Oyentes nativos de conexión del navegador
        if (!this._netListenersAttached) {
          this._netListenersAttached = true;
          window.addEventListener('online', () => {
            this.setStatus('online', 'En línea');
            this.dispatchSubscriptionByRole();
          });
          window.addEventListener('offline', () => {
            this.setStatus('error', 'Sin conexión (Caché local)');
          });
        }
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

  setStatus(status, text) {
    this.status = status;
    this.statusText = text;
    const badges = document.querySelectorAll('[data-cloud-badge]');
    badges.forEach((b) => {
      b.innerHTML = this.renderBadgeHtml();
    });
  },

  _renderTimeout: null,
  requestRender() {
    if (this._renderTimeout) clearTimeout(this._renderTimeout);
    this._renderTimeout = setTimeout(() => {
      if (typeof window.renderApp === 'function') {
        window.renderApp(true);
      }
    }, 60);
  },

  renderBadgeHtml() {
    const isOnline = navigator.onLine !== false;
    const effectiveStatus = isOnline ? (this.status || 'local') : 'error';
    const effectiveText = isOnline ? (this.statusText || 'En línea') : 'Sin conexión (Caché local)';

    const map = {
      online: {
        cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        dot: '<span class="inline-block size-2 rounded-full bg-emerald-500 animate-pulse"></span>',
      },
      connecting: {
        cls: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        dot: '<span class="inline-block size-2 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></span>',
      },
      error: {
        cls: 'border-destructive/30 bg-destructive/10 text-destructive',
        dot: '<span class="inline-block size-2 rounded-full bg-destructive"></span>',
      },
      local: {
        cls: 'border-border bg-muted/60 text-muted-foreground',
        dot: '<span class="inline-block size-2 rounded-full bg-muted-foreground/60"></span>',
      },
    };

    const cfg = map[effectiveStatus] || map.local;
    return `
      <span
        title="Estado de sincronización en tiempo real: ${effectiveText}"
        class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold select-none shadow-2xs ${cfg.cls}"
      >
        ${cfg.dot}
        <span>${effectiveText}</span>
      </span>
    `;
  },

  startPublicFirestoreSubscription() {
    if (!this.firestore) return;
    this.stopSubscriptions();
    const db = this.firestore;
    this.setStatus('connecting', 'Cargando datos públicos…');

    // 1. Competencias públicas
    const unsubComp = db.collection('competencias').onSnapshot(
      (snap) => {
        const comps = [];
        snap.forEach((d) => comps.push(fixMojibakeInObj(d.data())));
        if (comps.length > 0) window.DB.competencias = comps;
        this.setStatus('online', 'Modo Público');
        this.requestRender();
      },
      (err) => {
        console.warn('Aviso competencias públicas:', err);
        this.setStatus('online', 'Modo Público');
      }
    );
    this._unsubscribers.push(unsubComp);

    // 2. Ranking público separado (sin fichas de salud de menores)
    const unsubRanking = db.collection('ranking_publico').onSnapshot(
      (snap) => {
        const ranking = [];
        snap.forEach((d) => ranking.push(fixMojibakeInObj(d.data())));
        window.DB.ranking_publico = ranking;
        this.setStatus('online', 'Modo Público');
        this.requestRender();
      },
      (err) => {
        console.warn('Aviso ranking público:', err);
        this.setStatus('online', 'Modo Público');
      }
    );
    this._unsubscribers.push(unsubRanking);

    // 3. Configuración pública en tiempo real (programas de torneos, disciplinas y equipo)
    const unsubCfg = db.collection('config').doc('general').onSnapshot(
      (snap) => {
        if (snap.exists) {
          const cfg = fixMojibakeInObj(snap.data());
          if (cfg.equipo) window.DB.equipo = { ...window.DB.equipo, ...cfg.equipo };
          if (cfg.programasTorneos && typeof cfg.programasTorneos === 'object') {
            window.DB.programasTorneos = cfg.programasTorneos;
          }
          this.requestRender();
        }
      },
      () => {}
    );
    this._unsubscribers.push(unsubCfg);
  },

  /**
   * Suscripción Segura y Filtrada para Atletas y Familias:
   * Cada portal solicita ÚNICAMENTE sus propios datos (fichas, sesiones, pagos y avisos).
   * Ningún dato privado de otros menores viaja al dispositivo ni queda en localStorage.
   */
  _saveAtletaCache(atletaId) {
    try {
      const a = (window.DB.atletas || []).find((x) => x.id === atletaId) || (window.DB.atletas || [])[0];
      const cacheAtleta = {
        atleta: a,
        planes: (window.DB.planes || []).filter((p) => p.atletaId === atletaId),
        sesiones: (window.DB.sesiones || []).filter((s) => s.atletaId === atletaId),
        pagos: (window.DB.pagos || []).filter((pg) => pg.atletaId === atletaId),
        avisos: (window.DB.avisos || []).filter(
          (av) =>
            Array.isArray(av.destinatarios) &&
            (av.destinatarios.includes(atletaId) || av.destinatarios.includes('TODOS'))
        ),
        competencias: window.DB.competencias || [],
        ranking_publico: window.DB.ranking_publico || [],
      };
      localStorage.setItem(`willilefche_atleta_${atletaId}`, JSON.stringify(cacheAtleta));
    } catch (e) {}
  },

  startAtletaFirestoreSubscription(atletaId) {
    if (!this.firestore || !atletaId) return;
    this.stopSubscriptions();
    const db = this.firestore;
    this.setStatus('connecting', 'Cargando tu información...');

    // 1. Configuración general
    const unsubCfg = db.collection('config').doc('general').onSnapshot((snap) => {
      if (snap.exists) {
        const cfg = fixMojibakeInObj(snap.data());
        if (cfg.equipo) window.DB.equipo = { ...window.DB.equipo, ...cfg.equipo };
        if (cfg.conceptosCobro) window.DB.conceptosCobro = cfg.conceptosCobro;
        if (cfg.disciplinas) window.DB.disciplinas = cfg.disciplinas;
      }
    }, () => {});
    this._unsubscribers.push(unsubCfg);

    // 2. Perfil público deportivo del propio atleta
    const unsubAtleta = db.collection('atletas').doc(atletaId).onSnapshot(
      (snap) => {
        if (snap.exists) {
          const data = fixMojibakeInObj(snap.data());
          const existing = (window.DB.atletas || []).find((a) => a.id === atletaId) || {};
          window.DB.atletas = [{ ...existing, ...data }];
          this._saveAtletaCache(atletaId);
          this.requestRender();
        }
      },
      (err) => console.warn('Atleta sub error:', err)
    );
    this._unsubscribers.push(unsubAtleta);

    // 3. Ficha privada médica/salud del atleta (salud, apto físico, tutor)
    const unsubSalud = db.collection('atletas').doc(atletaId).collection('privado').doc('salud').onSnapshot(
      (snap) => {
        if (snap.exists) {
          const data = fixMojibakeInObj(snap.data());
          const existing = (window.DB.atletas || []).find((a) => a.id === atletaId) || {};
          window.DB.atletas = [{ ...existing, ...data }];
          this._saveAtletaCache(atletaId);
          this.requestRender();
        }
      },
      (err) => console.warn('Salud sub error:', err)
    );
    this._unsubscribers.push(unsubSalud);

    // 4. Sesiones individuales del atleta (colección 'sesiones' filtrada por atletaId)
    const unsubSesiones = db.collection('sesiones').where('atletaId', '==', atletaId).onSnapshot(
      (snap) => {
        const ses = [];
        snap.forEach((d) => ses.push(fixMojibakeInObj(d.data())));
        window.DB.sesiones = ses;
        if (!window.DB.planes) window.DB.planes = {};
        window.DB.planes[atletaId] = ses;
        this._saveAtletaCache(atletaId);
        this.requestRender();
      },
      (err) => console.warn('Sesiones sub error:', err)
    );
    this._unsubscribers.push(unsubSesiones);

    // 5. Pagos propios del atleta (colección 'pagos' filtrada por atletaId)
    const unsubPagos = db.collection('pagos').where('atletaId', '==', atletaId).onSnapshot(
      (snap) => {
        const pgs = [];
        snap.forEach((d) => pgs.push(fixMojibakeInObj(d.data())));
        window.DB.pagos = pgs;
        this._saveAtletaCache(atletaId);
        this.requestRender();
      },
      (err) => console.warn('Pagos sub error:', err)
    );
    this._unsubscribers.push(unsubPagos);

    // 6. Avisos dirigidos al atleta o a 'TODOS'
    const unsubAvisos = db.collection('avisos').where('destinatarios', 'array-contains-any', [atletaId, 'TODOS']).onSnapshot(
      (snap) => {
        const avs = [];
        snap.forEach((d) => avs.push(fixMojibakeInObj(d.data())));
        window.DB.avisos = avs;
        this._saveAtletaCache(atletaId);
        this.requestRender();
      },
      (err) => console.warn('Avisos sub error:', err)
    );
    this._unsubscribers.push(unsubAvisos);

    // 7. Competencias y Rankings públicos
    const unsubComps = db.collection('competencias').onSnapshot(
      (snap) => {
        const comps = [];
        snap.forEach((d) => comps.push(fixMojibakeInObj(d.data())));
        if (comps.length > 0) window.DB.competencias = comps;
        this.requestRender();
      },
      () => {}
    );
    this._unsubscribers.push(unsubComps);

    const unsubRanking = db.collection('ranking_publico').onSnapshot(
      (snap) => {
        const ranking = [];
        snap.forEach((d) => ranking.push(fixMojibakeInObj(d.data())));
        window.DB.ranking_publico = ranking;
        this.setStatus('online', 'En línea');
        this.requestRender();
      },
      () => {}
    );
    this._unsubscribers.push(unsubRanking);
  },

  /**
   * Suscripción Modular para el Entrenador / Staff:
   * Sincroniza cada colección de forma independiente (atletas, sesiones, pagos, competencias, avisos).
   * Elimina la dependencia del documento monolítico 'main_db' y el límite de 1 MiB de Firestore.
   */
  startFirestoreSubscription() {
    if (!this.firestore) return;
    this.stopSubscriptions();
    const db = this.firestore;
    this.setStatus('connecting', 'Sincronizando en vivo…');

    // 1. Configuración General (config/general)
    const unsubCfg = db.collection('config').doc('general').onSnapshot(
      (snap) => {
        if (snap.exists) {
          const cfg = fixMojibakeInObj(snap.data());
          if (cfg.equipo) window.DB.equipo = { ...window.DB.equipo, ...cfg.equipo };
          if (Array.isArray(cfg.conceptosCobro)) window.DB.conceptosCobro = cfg.conceptosCobro;
          if (Array.isArray(cfg.disciplinas)) window.DB.disciplinas = cfg.disciplinas;
          if (Array.isArray(cfg.distanciasRanking)) window.DB.distanciasRanking = cfg.distanciasRanking;
          if (cfg.programasTorneos && typeof cfg.programasTorneos === 'object') window.DB.programasTorneos = cfg.programasTorneos;
        }
        this.setStatus('online', 'Sincronizado');
      },
      (err) => console.warn('Aviso config/general:', err)
    );
    this._unsubscribers.push(unsubCfg);

    // 2. Colección de Atletas (atletas/{atletaId})
    const unsubAtletas = db.collection('atletas').onSnapshot(
      async (snap) => {
        if (this._isSyncing) return;
        this.setStatus('online', 'Sincronizado');
        if (snap.empty) {
          console.log('Colección atletas vacía en Firestore. Subiendo nómina inicial modular...');
          this.pushToCloud();
          return;
        }

        const atletasMap = {};
        snap.forEach((d) => {
          const a = fixMojibakeInObj(d.data());
          atletasMap[a.id] = a;
        });

        // Optimización de alto rendimiento: Caché inteligente de datos privados de salud
        if (!this._saludCache) {
          this._saludCache = {};
          (window.DB.atletas || []).forEach((at) => {
            if (at && at.id && (at.dni || at.salud || at.fechaNacimiento || at.tutor)) {
              this._saludCache[at.id] = {
                dni: at.dni,
                fechaNacimiento: at.fechaNacimiento,
                email: at.email,
                telefono: at.telefono,
                salud: at.salud,
                aptoFisico: at.aptoFisico,
                observaciones: at.observaciones,
                contactoEmergencia: at.contactoEmergencia,
                tutor: at.tutor,
              };
            }
          });
        }

        // Detectar cambios puntuales para no re-descargar los 63 atletas en cada evento
        const changedIds = [];
        snap.docChanges().forEach((ch) => {
          if (ch.type === 'added' || ch.type === 'modified') {
            changedIds.push(ch.doc.id);
          }
        });

        // Solo buscar en Firestore la salud de los atletas que no estén en caché
        const idsToFetch = (changedIds.length > 0 ? changedIds : Object.keys(atletasMap))
          .filter((id) => !this._saludCache[id]);

        if (idsToFetch.length > 0) {
          await Promise.all(
            idsToFetch.map(async (id) => {
              try {
                const salSnap = await db.collection('atletas').doc(id).collection('privado').doc('salud').get();
                if (salSnap.exists) {
                  this._saludCache[id] = fixMojibakeInObj(salSnap.data());
                }
              } catch (e) {}
            })
          );
        }

        // Combinar datos públicos con la caché de salud en memoria
        Object.keys(atletasMap).forEach((id) => {
          if (this._saludCache[id]) {
            atletasMap[id] = { ...atletasMap[id], ...this._saludCache[id] };
          }
        });

        const atletasArray = Object.values(atletasMap);
        ensureCatalogosActualizados({ atletas: atletasArray });
        ensureInitialAtletasMerged({ atletas: atletasArray });
        migrarAtletaIdsAOpace({ atletas: atletasArray });
        sanitizeDBCredentials({ atletas: atletasArray });
        window.DB.atletas = atletasArray;

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(window.DB));
        } catch (e) {}
        this.setStatus('online', 'Sincronizado');
        this.requestRender();
      },
      (err) => {
        console.error('Error suscribiendo a colección atletas:', err);
        if (err.code === 'permission-denied') {
          this.setStatus('error', 'Permiso denegado (Revisar Reglas Firestore)');
        } else {
          this.setStatus('error', 'Sin conexión (Caché local)');
        }
      }
    );
    this._unsubscribers.push(unsubAtletas);

    // 3. Colección de Sesiones de Entrenamiento (sesiones/{id})
    const unsubSesiones = db.collection('sesiones').onSnapshot(
      (snap) => {
        const ses = [];
        const planesMap = {};
        snap.forEach((d) => {
          const s = fixMojibakeInObj(d.data());
          ses.push(s);
          if (s.atletaId) {
            if (!planesMap[s.atletaId]) planesMap[s.atletaId] = [];
            planesMap[s.atletaId].push(s);
          }
        });
        window.DB.sesiones = ses;
        if (Object.keys(planesMap).length > 0) {
          window.DB.planes = { ...window.DB.planes, ...planesMap };
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(window.DB));
        } catch (e) {}
        this.requestRender();
      },
      (err) => console.warn('Aviso sesiones:', err)
    );
    this._unsubscribers.push(unsubSesiones);

    // 4. Colección de Pagos (pagos/{id})
    const unsubPagos = db.collection('pagos').onSnapshot(
      (snap) => {
        const pgs = [];
        snap.forEach((d) => pgs.push(fixMojibakeInObj(d.data())));
        if (pgs.length > 0) window.DB.pagos = pgs;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(window.DB));
        } catch (e) {}
        this.requestRender();
      },
      (err) => console.warn('Aviso pagos:', err)
    );
    this._unsubscribers.push(unsubPagos);

    // 5. Colección de Competencias (competencias/{id})
    const unsubComps = db.collection('competencias').onSnapshot(
      (snap) => {
        const comps = [];
        snap.forEach((d) => comps.push(fixMojibakeInObj(d.data())));
        if (comps.length > 0) window.DB.competencias = comps;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(window.DB));
        } catch (e) {}
        this.requestRender();
      },
      (err) => console.warn('Aviso competencias:', err)
    );
    this._unsubscribers.push(unsubComps);

    // 6. Colección de Resultados (resultados/{id})
    const unsubResultados = db.collection('resultados').onSnapshot(
      (snap) => {
        const res = [];
        snap.forEach((d) => res.push(fixMojibakeInObj(d.data())));
        if (res.length > 0) window.DB.resultados = res;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(window.DB));
        } catch (e) {}
        this.requestRender();
      },
      (err) => console.warn('Aviso resultados:', err)
    );
    this._unsubscribers.push(unsubResultados);

    // 7. Colección de Avisos (avisos/{id})
    const unsubAvisos = db.collection('avisos').onSnapshot(
      (snap) => {
        const avs = [];
        snap.forEach((d) => avs.push(fixMojibakeInObj(d.data())));
        if (avs.length > 0) window.DB.avisos = avs;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(window.DB));
        } catch (e) {}
        this.requestRender();
      },
      (err) => console.warn('Aviso avisos:', err)
    );
    this._unsubscribers.push(unsubAvisos);

    // 8. Colección de Ranking Público (ranking_publico/{prueba_atleta})
    const unsubRanking = db.collection('ranking_publico').onSnapshot(
      (snap) => {
        const rks = [];
        snap.forEach((d) => rks.push(fixMojibakeInObj(d.data())));
        if (rks.length > 0) window.DB.ranking_publico = rks;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(window.DB));
        } catch (e) {}
        this.requestRender();
      },
      (err) => console.warn('Aviso ranking_publico:', err)
    );
    this._unsubscribers.push(unsubRanking);
  },

  /**
   * Planificador con Debounce (Anti-Spam de Red):
   * Evita enviar cientos de peticiones cuando el usuario realiza cambios sucesivos o rápidos.
   */
  schedulePush(delayMs = 1200) {
    if (this._pushTimer) clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => {
      this.pushToCloud();
    }, delayMs);
  },

  /**
   * Sincronización Inmediata de Entidades Individuales (Granular):
   * Sincroniza en 40-60ms el documento exacto que cambió sin re-subir la base completa.
   */
  async syncAtleta(atleta) {
    if (!this.firestore || !atleta || !atleta.id) return;
    const db = this.firestore;
    const now = Date.now();
    try {
      const atletaDoc = sanitizeForFirestore({
        id: atleta.id,
        legacyId: atleta.legacyId || null,
        nroNomina: atleta.nroNomina || null,
        nombre: atleta.nombre || '',
        apellido: atleta.apellido || '',
        categoria: atleta.categoria || '',
        usuario: atleta.usuario || '',
        disciplinas: atleta.disciplinas || [],
        tiposAtleta: atleta.tiposAtleta || [],
        subdisciplinas: atleta.subdisciplinas || [],
        pruebas: atleta.pruebas || '',
        genero: atleta.genero || '',
        ciudad: atleta.ciudad || 'Valcheta',
        activo: atleta.activo !== false,
        excluirRanking: Boolean(atleta.excluirRanking),
        adherencia: atleta.adherencia || 100,
        updatedAt: now,
      });
      const saludDoc = sanitizeForFirestore({
        id: atleta.id,
        dni: atleta.dni || '',
        fechaNacimiento: atleta.fechaNacimiento || '',
        email: atleta.email || '',
        telefono: atleta.telefono || '',
        salud: atleta.salud || 'Apto físico en seguimiento.',
        aptoFisico: atleta.aptoFisico || atleta.salud || 'Apto físico en seguimiento.',
        observaciones: atleta.observaciones || atleta.antecedentes || '',
        contactoEmergencia: atleta.contactoEmergencia || '',
        tutor: atleta.tutor || null,
        updatedAt: now,
      });
      this._saludCache = this._saludCache || {};
      this._saludCache[atleta.id] = saludDoc;

      await Promise.all([
        db.collection('atletas').doc(atleta.id).set(atletaDoc, { merge: true }),
        db.collection('atletas').doc(atleta.id).collection('privado').doc('salud').set(saludDoc, { merge: true }),
        db.collection('atletas').doc(atleta.id).collection('privado').doc('ficha').set(saludDoc, { merge: true }),
      ]);
    } catch (e) {
      console.warn('Error en syncAtleta:', e);
    }
  },

  async syncPago(pago) {
    if (!this.firestore || !pago || !pago.id) return;
    try {
      const pagoDoc = sanitizeForFirestore({
        id: pago.id,
        atletaId: pago.atletaId,
        concepto: pago.concepto || 'Cuota mensual',
        detalle: pago.detalle || pago.concepto || '',
        monto: pago.monto || 0,
        vencimiento: pago.vencimiento || '',
        fechaPago: pago.fechaPago || '',
        estado: pago.estado || 'pendiente',
        medioPago: pago.medioPago || '',
        notaPago: pago.notaPago || '',
        comprobanteDataUrl: pago.comprobanteDataUrl || '',
        motivoRechazo: pago.motivoRechazo || '',
        confirmadoPor: pago.confirmadoPor || '',
        confirmadoEn: pago.confirmadoEn || '',
        informadoPor: pago.informadoPor || '',
        informadoEn: pago.informadoEn || '',
        updatedAt: Date.now(),
      });
      await this.firestore.collection('pagos').doc(pago.id).set(pagoDoc, { merge: true });
    } catch (e) {
      console.warn('Error en syncPago:', e);
    }
  },

  async syncSesion(sesion) {
    if (!this.firestore || !sesion || !sesion.id) return;
    try {
      const sesionDoc = sanitizeForFirestore({
        id: sesion.id,
        atletaId: sesion.atletaId,
        fecha: sesion.fecha || '',
        tipo: sesion.tipo || 'Rodaje',
        descripcion: sesion.descripcion || '',
        distancia: sesion.distancia || '',
        objetivo: sesion.objetivo || '',
        completada: Boolean(sesion.completada),
        tiempoReal: sesion.tiempoReal || '',
        distanciaReal: sesion.distanciaReal || '',
        sensaciones: sesion.sensaciones || '',
        ritmo: sesion.ritmo || '',
        updatedAt: Date.now(),
      });
      await this.firestore.collection('sesiones').doc(sesion.id).set(sesionDoc, { merge: true });
    } catch (e) {
      console.warn('Error en syncSesion:', e);
    }
  },

  async syncAviso(aviso) {
    if (!this.firestore || !aviso || !aviso.id) return;
    try {
      const avisoDoc = sanitizeForFirestore({
        id: aviso.id,
        tipo: aviso.tipo || 'General',
        destinatarios: Array.isArray(aviso.destinatarios) ? aviso.destinatarios : ['TODOS'],
        titulo: aviso.titulo || '',
        cuerpo: aviso.cuerpo || '',
        fecha: aviso.fecha || '',
        autor: aviso.autor || 'Prof. Cristian Javier Torres',
        updatedAt: Date.now(),
      });
      await this.firestore.collection('avisos').doc(aviso.id).set(avisoDoc, { merge: true });
    } catch (e) {
      console.warn('Error en syncAviso:', e);
    }
  },

  async syncCompetencia(comp) {
    if (!this.firestore || !comp || !comp.id) return;
    try {
      const compDoc = sanitizeForFirestore({
        id: comp.id,
        nombre: comp.nombre || '',
        fecha: comp.fecha || '',
        tipo: comp.tipo || 'Pista y Campo',
        lugar: comp.lugar || 'Valcheta',
        pruebas: comp.pruebas || [],
        inscriptos: comp.inscriptos || [],
        sugeridos: comp.sugeridos || [],
        updatedAt: Date.now(),
      });
      await this.firestore.collection('competencias').doc(comp.id).set(compDoc, { merge: true });
    } catch (e) {
      console.warn('Error en syncCompetencia:', e);
    }
  },

  async syncConfig() {
    if (!this.firestore) return;
    try {
      const configData = sanitizeForFirestore({
        equipo: window.DB.equipo || {},
        conceptosCobro: window.DB.conceptosCobro || [],
        disciplinas: window.DB.disciplinas || [],
        distanciasRanking: window.DB.distanciasRanking || DEFAULT_DISTANCIAS_RANKING,
        programasTorneos: window.DB.programasTorneos || null,
        updatedAt: Date.now(),
      });
      await Promise.all([
        this.firestore.collection('config').doc('general').set(configData, { merge: true }),
        this.firestore.collection('configuracion').doc('general').set(configData, { merge: true }),
      ]);
    } catch (e) {
      console.warn('Error en syncConfig:', e);
    }
  },

  async deleteDoc(collection, docId) {
    if (!this.firestore || !collection || !docId) return;
    try {
      await this.firestore.collection(collection).doc(docId).delete();
      console.log(`Documento ${collection}/${docId} eliminado en Firestore.`);
    } catch (e) {
      console.warn(`Error eliminando ${collection}/${docId}:`, e);
    }
  },

  /**
   * Sincronización Modular por Lotes (Batch) Ultrarrápida:
   * Empaqueta hasta 400 operaciones por lote en una sola petición atómica a Firestore.
   * En lugar de cientos de peticiones HTTP en cascada que tardan 1 minuto,
   * se realiza en 1 sola ronda de red en ~300ms.
   */
  async pushToCloud() {
    if (!this.firestore) return false;
    if (this._isSyncing) {
      this.schedulePush(1500);
      return false;
    }
    this._isSyncing = true;
    const db = this.firestore;
    const now = Date.now();
    this.setStatus('connecting', 'Sincronizando...');

    try {
      sanitizeDBCredentials(window.DB);

      const batches = [db.batch()];
      let currentBatch = batches[0];
      let opCount = 0;

      const addToBatch = (docRef, data, options = { merge: true }) => {
        if (opCount >= 400) {
          currentBatch = db.batch();
          batches.push(currentBatch);
          opCount = 0;
        }
        currentBatch.set(docRef, data, options);
        opCount++;
      };

      // 1. config/general y configuracion/general
      const configData = sanitizeForFirestore({
        equipo: window.DB.equipo || {},
        conceptosCobro: window.DB.conceptosCobro || [],
        disciplinas: window.DB.disciplinas || [],
        distanciasRanking: window.DB.distanciasRanking || DEFAULT_DISTANCIAS_RANKING,
        updatedAt: now,
      });
      addToBatch(db.collection('config').doc('general'), configData);
      addToBatch(db.collection('configuracion').doc('general'), configData);

      // 2. atletas/{atletaId} y atletas/{atletaId}/privado/salud
      const atletas = window.DB.atletas || [];
      this._saludCache = this._saludCache || {};

      for (const a of atletas) {
        if (!a.id) continue;
        const atletaDoc = sanitizeForFirestore({
          id: a.id,
          legacyId: a.legacyId || null,
          nroNomina: a.nroNomina || null,
          nombre: a.nombre || '',
          apellido: a.apellido || '',
          categoria: a.categoria || '',
          usuario: a.usuario || '',
          disciplinas: a.disciplinas || [],
          tiposAtleta: a.tiposAtleta || [],
          subdisciplinas: a.subdisciplinas || [],
          pruebas: a.pruebas || '',
          genero: a.genero || '',
          ciudad: a.ciudad || 'Valcheta',
          activo: a.activo !== false,
          excluirRanking: Boolean(a.excluirRanking),
          adherencia: a.adherencia || 100,
          updatedAt: now,
        });
        addToBatch(db.collection('atletas').doc(a.id), atletaDoc);

        const saludDoc = sanitizeForFirestore({
          id: a.id,
          dni: a.dni || '',
          fechaNacimiento: a.fechaNacimiento || '',
          email: a.email || '',
          telefono: a.telefono || '',
          salud: a.salud || 'Apto físico en seguimiento.',
          aptoFisico: a.aptoFisico || a.salud || 'Apto físico en seguimiento.',
          observaciones: a.observaciones || a.antecedentes || '',
          contactoEmergencia: a.contactoEmergencia || '',
          tutor: a.tutor || null,
          updatedAt: now,
        });
        this._saludCache[a.id] = saludDoc;
        addToBatch(db.collection('atletas').doc(a.id).collection('privado').doc('salud'), saludDoc);
        addToBatch(db.collection('atletas').doc(a.id).collection('privado').doc('ficha'), saludDoc);
      }

      // 3. sesiones/{id}
      const sesionesToSave = [];
      if (window.DB.planes && typeof window.DB.planes === 'object') {
        Object.entries(window.DB.planes).forEach(([atletaId, sList]) => {
          if (Array.isArray(sList)) {
            sList.forEach((s) => {
              sesionesToSave.push({
                ...s,
                atletaId: s.atletaId || atletaId,
                id: s.id || `ses_${atletaId}_${s.fecha || Date.now()}`,
              });
            });
          }
        });
      }
      if (Array.isArray(window.DB.sesiones)) {
        window.DB.sesiones.forEach((s) => {
          if (!sesionesToSave.find((x) => x.id === s.id)) sesionesToSave.push(s);
        });
      }
      for (const s of sesionesToSave) {
        if (!s.id) continue;
        addToBatch(db.collection('sesiones').doc(s.id), sanitizeForFirestore({
          id: s.id,
          atletaId: s.atletaId,
          fecha: s.fecha || '',
          tipo: s.tipo || 'Rodaje',
          descripcion: s.descripcion || '',
          distancia: s.distancia || '',
          objetivo: s.objetivo || '',
          completada: Boolean(s.completada),
          tiempoReal: s.tiempoReal || '',
          distanciaReal: s.distanciaReal || '',
          sensaciones: s.sensaciones || '',
          ritmo: s.ritmo || '',
          updatedAt: now,
        }));
      }

      // 4. pagos/{id}
      const pagos = window.DB.pagos || [];
      for (const p of pagos) {
        if (!p.id) continue;
        addToBatch(db.collection('pagos').doc(p.id), sanitizeForFirestore({
          id: p.id,
          atletaId: p.atletaId,
          concepto: p.concepto || 'Cuota mensual',
          detalle: p.detalle || p.concepto || '',
          monto: p.monto || 0,
          vencimiento: p.vencimiento || '',
          fechaPago: p.fechaPago || '',
          estado: p.estado || 'pendiente',
          medioPago: p.medioPago || '',
          notaPago: p.notaPago || '',
          comprobanteDataUrl: p.comprobanteDataUrl || '',
          motivoRechazo: p.motivoRechazo || '',
          confirmadoPor: p.confirmadoPor || '',
          confirmadoEn: p.confirmadoEn || '',
          informadoPor: p.informadoPor || '',
          informadoEn: p.informadoEn || '',
          updatedAt: now,
        }));
      }

      // 5. competencias/{id} y resultados/{id}
      const competencias = window.DB.competencias || [];
      for (const c of competencias) {
        if (!c.id) continue;
        addToBatch(db.collection('competencias').doc(c.id), sanitizeForFirestore({
          id: c.id,
          nombre: c.nombre || '',
          fecha: c.fecha || '',
          tipo: c.tipo || 'Pista y Campo',
          lugar: c.lugar || 'Valcheta',
          pruebas: c.pruebas || [],
          inscriptos: c.inscriptos || [],
          sugeridos: c.sugeridos || [],
          updatedAt: now,
        }));
      }

      const resultados = window.DB.resultados || [];
      for (const r of resultados) {
        if (!r.id) continue;
        addToBatch(db.collection('resultados').doc(r.id), sanitizeForFirestore({
          id: r.id,
          atletaId: r.atletaId,
          competenciaId: r.competenciaId || '',
          prueba: r.prueba || '',
          marca: r.marca || r.tiempo || '',
          puesto: r.puesto || '',
          categoria: r.categoria || '',
          updatedAt: now,
        }));
      }

      // 6. avisos/{id}
      const avisos = window.DB.avisos || [];
      for (const av of avisos) {
        if (!av.id) continue;
        addToBatch(db.collection('avisos').doc(av.id), sanitizeForFirestore({
          id: av.id,
          tipo: av.tipo || 'General',
          destinatarios: Array.isArray(av.destinatarios) ? av.destinatarios : ['TODOS'],
          titulo: av.titulo || '',
          cuerpo: av.cuerpo || '',
          fecha: av.fecha || '',
          autor: av.autor || 'Prof. Cristian Javier Torres',
          updatedAt: now,
        }));
      }

      // 7. ranking_publico/{prueba_atleta}
      for (const a of atletas) {
        if (!a.excluirRanking && Array.isArray(a.marcas)) {
          for (const m of a.marcas) {
            if (m.distancia && m.tiempo) {
              const cleanDist = String(m.distancia).toLowerCase().replace(/\s+/g, '_');
              const docId = `${cleanDist}_${a.id}`;
              const apInicial = a.apellido ? `${a.apellido.trim().split(/\s+/)[0][0]}.` : '';
              const nombreCorto = `${a.nombre} ${apInicial}`.trim();
              addToBatch(db.collection('ranking_publico').doc(docId), sanitizeForFirestore({
                id: docId,
                atletaId: a.id,
                distancia: m.distancia,
                prueba: m.distancia,
                nombre: nombreCorto,
                nombreCorto: nombreCorto,
                categoria: a.categoria || '',
                genero: a.genero || '',
                tiempo: m.tiempo,
                marca: m.tiempo,
                fecha: m.fecha || '',
                competencia: m.competencia || '',
                updatedAt: now,
              }));
            }
          }
        }
      }

      // 8. Stub liviano de compatibilidad
      addToBatch(db.collection('willilefche').doc('main_db'), {
        appKey: 'WLF-VALCHETA-2026',
        migratedToCollections: true,
        version: '2.0-modular',
        atletasCount: atletas.length,
        updatedAt: now,
      });

      // Ejecución atómica de lotes en paralelo
      await Promise.all(batches.map((b) => b.commit()));

      this.setStatus('online', 'Sincronizado');
      return true;
    } catch (e) {
      console.error('Error sincronizando colecciones modulares:', e);
      this.setStatus('error', 'Error al sincronizar');
      return false;
    } finally {
      this._isSyncing = false;
    }
  },

  async guardarMarcaEnRankingPublico(atleta, marcaObj) {
    if (!this.firestore || !atleta || !marcaObj || !marcaObj.distancia || !marcaObj.tiempo) return;
    try {
      const cleanDist = String(marcaObj.distancia).toLowerCase().replace(/\s+/g, '_');
      const docId = `${cleanDist}_${atleta.id}`;
      const apInicial = atleta.apellido ? `${atleta.apellido.trim().split(/\s+/)[0][0]}.` : '';
      const nombreCorto = `${atleta.nombre} ${apInicial}`.trim();
      const edadCalc = typeof Helpers !== 'undefined' && typeof Helpers.edad === 'function' ? Helpers.edad(atleta.fechaNacimiento) : null;

      await this.firestore.collection('ranking_publico').doc(docId).set(
        sanitizeForFirestore({
          id: docId,
          atletaId: atleta.id,
          distancia: marcaObj.distancia,
          prueba: marcaObj.distancia,
          nombre: nombreCorto,
          nombreCorto: nombreCorto,
          categoria: atleta.categoria || '',
          edad: edadCalc,
          genero: atleta.genero || '',
          tiempo: marcaObj.tiempo,
          marca: marcaObj.tiempo,
          fecha: marcaObj.fecha || '',
          competencia: marcaObj.competencia || '',
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

function saveDB(immediateSyncEntity = null) {
  sanitizeDBCredentials(window.DB);
  window.DB.updatedAt = Date.now();
  const session =
    window.Auth && typeof window.Auth.getSession === 'function' ? window.Auth.getSession() : null;
  const isCoachOrAdmin = Boolean(session && (session.role === 'coach' || session.subRole === 'admin'));

  if (isCoachOrAdmin) {
    // 1. Guardado local inmediato en 0 milisegundos (la interfaz responde al instante)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(window.DB));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage:', e);
    }

    // 2. Si se pasa una entidad específica (ej.: pago confirmado o atleta editado), disparar sync puntual en 40ms
    if (immediateSyncEntity && typeof window.CloudSync === 'object') {
      if (immediateSyncEntity.type === 'atleta' && immediateSyncEntity.data) {
        window.CloudSync.syncAtleta(immediateSyncEntity.data);
      } else if (immediateSyncEntity.type === 'pago' && immediateSyncEntity.data) {
        window.CloudSync.syncPago(immediateSyncEntity.data);
      } else if (immediateSyncEntity.type === 'sesion' && immediateSyncEntity.data) {
        window.CloudSync.syncSesion(immediateSyncEntity.data);
      } else if (immediateSyncEntity.type === 'aviso' && immediateSyncEntity.data) {
        window.CloudSync.syncAviso(immediateSyncEntity.data);
      } else if (immediateSyncEntity.type === 'competencia' && immediateSyncEntity.data) {
        window.CloudSync.syncCompetencia(immediateSyncEntity.data);
      } else if (immediateSyncEntity.type === 'config') {
        window.CloudSync.syncConfig();
      }
    }

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

    // Si el atleta informó un pago, sincronizarlo de inmediato a la nube
    if (immediateSyncEntity && immediateSyncEntity.type === 'pago' && immediateSyncEntity.data && window.CloudSync) {
      window.CloudSync.syncPago(immediateSyncEntity.data);
    }
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
