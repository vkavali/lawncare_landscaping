export type Language = 'en' | 'es'
export type ServiceType = 'mantenimiento' | 'paisajismo' | 'poda'
export type Frequency = 'semanal' | 'quincenal' | 'mensual'
export type Zone = 'urbana' | 'residencial' | 'periferia'
export type LeadStage = 'nuevo' | 'visita' | 'propuesta' | 'anticipo'
export type JobStatus = 'en-ruta' | 'trabajando' | 'pendiente-cobro' | 'cerrado'
export type PaymentMethod = 'transferencia' | 'efectivo' | 'tarjeta' | 'codi'

export interface LocalizedText {
  en: string
  es: string
}

export interface Crew {
  id: string
  name: string
  lead: string
  members: number
  progress: number
  nextStop: string
  eta: string
  fuel: number
  equipment: LocalizedText
  route: LocalizedText
}

export interface Job {
  id: string
  time: string
  client: string
  contact: string
  address: string
  neighborhood: string
  service: LocalizedText
  crewId: string
  status: JobStatus
  amount: number
  payment: PaymentMethod
  invoice: boolean
  checklistTotal: number
  checklistDone: number
  beforePhotos: number
  afterPhotos: number
  note: LocalizedText
  rainSensitive: boolean
  materials: LocalizedText
}

export interface Lead {
  id: string
  client: string
  neighborhood: string
  source: LocalizedText
  service: LocalizedText
  stage: LeadStage
  value: number
  nextStep: LocalizedText
}

export interface CollectionItem {
  id: string
  client: string
  amount: number
  due: LocalizedText
  payment: PaymentMethod
  invoice: boolean
  risk: 'alta' | 'media' | 'baja'
  note: LocalizedText
}

export interface ServiceDefinition {
  id: ServiceType
  label: LocalizedText
  base: number
  sqmRate: number
  hours: number
  crew: LocalizedText
  detail: LocalizedText
}

export interface ExtraOption {
  id: string
  label: LocalizedText
  detail: LocalizedText
  price: number
}

export interface ScheduleSlot {
  id: string
  client: string
  service: LocalizedText
  crewId: string
  dayId: string
  time: string
  duration: string
  status: 'confirmado' | 'por-confirmar' | 'reprogramar'
  recurring?: LocalizedText
  invoice: boolean
  note: LocalizedText
}

export interface RecurringPlan {
  id: string
  client: string
  service: LocalizedText
  frequency: Frequency
  window: LocalizedText
  dayLabel: LocalizedText
  amount: number
  autopilot: boolean
}

const lt = (en: string, es: string): LocalizedText => ({ en, es })

export function translateText(text: LocalizedText, language: Language) {
  return text[language]
}

export const merchantProfile = {
  businessName: 'Cuadrilla',
  appName: 'Cuadrilla',
  ownerName: 'Juan Gutierrez',
  serviceArea: 'Monterrey, Nuevo Leon',
  serviceAreaShort: 'Monterrey, N.L.',
  supportEmail: 'hola@gutierrezverde.mx',
  supportPhone: '+52 81 0000 0000',
  whatsappDisplay: '+52 81 0000 0000',
  ownerLine: {
    en: 'Juan Gutierrez · Monterrey, N.L.',
    es: 'Juan Gutierrez · Monterrey, N.L.',
  },
  serviceLine: {
    en: 'Residential lawn care',
    es: 'Cesped residencial',
  },
  quoteClosing: {
    en: 'Handled by Juan Gutierrez · Cuadrilla · WhatsApp +52 81 0000 0000.',
    es: 'Atiende Juan Gutierrez · Cuadrilla · WhatsApp +52 81 0000 0000.',
  },
} as const

export const serviceDefinitions: ServiceDefinition[] = [
  {
    id: 'mantenimiento',
    label: lt('Maintenance', 'Mantenimiento'),
    base: 1180,
    sqmRate: 7.5,
    hours: 2.1,
    crew: lt('Light crew · 2 people', 'Cuadrilla ligera · 2 personas'),
    detail: lt(
      'Mowing, edging, blowing, irrigation check, and closeout photo.',
      'Corte, orillas, soplado, revision de riego y foto de cierre.',
    ),
  },
  {
    id: 'paisajismo',
    label: lt('Landscaping', 'Paisajismo'),
    base: 5800,
    sqmRate: 21.8,
    hours: 6.5,
    crew: lt('Installation · 4 people', 'Instalacion · 4 personas'),
    detail: lt(
      'Layout, prep, planting, gravel, mulch, and final cleanup.',
      'Trazo, preparacion, plantado, grava, mulch y limpieza final.',
    ),
  },
  {
    id: 'poda',
    label: lt('Pruning', 'Poda'),
    base: 2140,
    sqmRate: 11.2,
    hours: 3.8,
    crew: lt('Tree crew · 3 people', 'Poda alta · 3 personas'),
    detail: lt(
      'Structural pruning, green waste haul-off, and area clear-out.',
      'Poda estructural, retiro de verde y liberacion de area.',
    ),
  },
]

export const extraOptions: ExtraOption[] = [
  {
    id: 'deshierbe',
    label: lt('Fine weeding', 'Deshierbe fino'),
    detail: lt('Beds, sidewalks, and joints.', 'Arriates, banquetas y juntas.'),
    price: 680,
  },
  {
    id: 'retiro',
    label: lt('Green waste removal', 'Retiro de verde'),
    detail: lt('Loading, bags, and disposal.', 'Carga, costales y disposicion.'),
    price: 840,
  },
  {
    id: 'riego',
    label: lt('Irrigation tune-up', 'Ajuste de riego'),
    detail: lt('Nozzles, pressure, and timing.', 'Boquillas, presion y tiempos.'),
    price: 1180,
  },
  {
    id: 'altura',
    label: lt('High pruning', 'Poda en altura'),
    detail: lt('Palms, ficus, and high canopies.', 'Palmas, ficus y copas altas.'),
    price: 1520,
  },
]

export const zoneDefinitions: Record<
  Zone,
  { label: LocalizedText; fee: number; note: LocalizedText }
> = {
  urbana: {
    label: lt('Nearby urban', 'Urbana cercana'),
    fee: 0,
    note: lt(
      'Faster turnaround and lower travel cost.',
      'Retorno rapido y menor costo de traslado.',
    ),
  },
  residencial: {
    label: lt('Premium residential', 'Residencial premium'),
    fee: 360,
    note: lt(
      'Gated access and higher visual-detail expectations.',
      'Acceso controlado y mayor detalle visual.',
    ),
  },
  periferia: {
    label: lt('Outskirts or large lot', 'Periferia o lote amplio'),
    fee: 720,
    note: lt(
      'Longer travel, more maneuvering, and more waste handling.',
      'Mayor traslado, maniobra y disposicion de residuos.',
    ),
  },
}

export const crews: Crew[] = [
  {
    id: 'norte',
    name: 'Cuadrilla Norte',
    lead: 'Luis Meza',
    members: 4,
    progress: 72,
    nextStop: 'Terraza Arboleda',
    eta: '14:00',
    fuel: 82,
    equipment: lt(
      '2 mowers, blower, and brush cutter',
      '2 podadoras, sopladora y desbrozadora',
    ),
    route: lt('Cumbres -> Contry', 'Cumbres -> Contry'),
  },
  {
    id: 'centro',
    name: 'Cuadrilla Centro',
    lead: 'Carlos Perez',
    members: 3,
    progress: 58,
    nextStop: 'Oficinas Koi',
    eta: '10:10',
    fuel: 64,
    equipment: lt(
      'Mower, pole pruner, and fertilizer spreader',
      'Podadora, tijera de altura y fertilizadora',
    ),
    route: lt('San Jeronimo -> Valle Oriente', 'San Jeronimo -> Valle Oriente'),
  },
  {
    id: 'oriente',
    name: 'Cuadrilla Oriente',
    lead: 'Marta Lopez',
    members: 3,
    progress: 45,
    nextStop: 'Privada Nova',
    eta: '11:30',
    fuel: 58,
    equipment: lt('Mower, blower, and debris bags', 'Podadora, sopladora y costales'),
    route: lt('Apodaca -> Guadalupe', 'Apodaca -> Guadalupe'),
  },
]

export const jobs: Job[] = [
  {
    id: 'job-encinos',
    time: '07:30',
    client: 'Residencial Encinos',
    contact: 'Marisol Tamez',
    address: 'Cumbres 2do Sector, Monterrey',
    neighborhood: 'Cumbres',
    service: lt('Weekly maintenance', 'Mantenimiento semanal'),
    crewId: 'norte',
    status: 'en-ruta',
    amount: 1850,
    payment: 'transferencia',
    invoice: false,
    checklistTotal: 5,
    checklistDone: 1,
    beforePhotos: 1,
    afterPhotos: 0,
    note: lt(
      'Use gate 2. Water front planters only.',
      'Acceso por caseta 2. Regar solo jardineras frontales.',
    ),
    rainSensitive: false,
    materials: lt('Foliar fertilizer', 'Fertilizante foliar'),
  },
  {
    id: 'job-tamez',
    time: '08:50',
    client: 'Casa Tamez',
    contact: 'Rocio Tamez',
    address: 'San Jeronimo, Monterrey',
    neighborhood: 'San Jeronimo',
    service: lt('Palm and bougainvillea pruning', 'Poda de palmas y buganvilias'),
    crewId: 'centro',
    status: 'trabajando',
    amount: 3200,
    payment: 'efectivo',
    invoice: false,
    checklistTotal: 5,
    checklistDone: 3,
    beforePhotos: 4,
    afterPhotos: 1,
    note: lt(
      'Protect walkway light fixtures on the side path.',
      'Proteger luminarias del pasillo lateral.',
    ),
    rainSensitive: false,
    materials: lt('Cut sealer', 'Sellador de corte'),
  },
  {
    id: 'job-koi',
    time: '10:10',
    client: 'Oficinas Koi',
    contact: 'Ana Ruiz',
    address: 'Valle Oriente, San Pedro',
    neighborhood: 'Valle Oriente',
    service: lt('Irrigation, fertilization, and cleanup', 'Riego, fertilizacion y limpieza'),
    crewId: 'centro',
    status: 'pendiente-cobro',
    amount: 4600,
    payment: 'transferencia',
    invoice: true,
    checklistTotal: 5,
    checklistDone: 4,
    beforePhotos: 3,
    afterPhotos: 5,
    note: lt('Request CFDI data before 1:00 PM.', 'Pedir datos CFDI antes de las 13:00.'),
    rainSensitive: false,
    materials: lt('18-12-6 fertilizer and nozzles', '18-12-6 y boquillas'),
  },
  {
    id: 'job-nova',
    time: '11:30',
    client: 'Privada Nova',
    contact: 'Javier Luna',
    address: 'Apodaca Centro, Apodaca',
    neighborhood: 'Apodaca Centro',
    service: lt('Biweekly maintenance', 'Mantenimiento quincenal'),
    crewId: 'oriente',
    status: 'en-ruta',
    amount: 1450,
    payment: 'codi',
    invoice: false,
    checklistTotal: 5,
    checklistDone: 2,
    beforePhotos: 2,
    afterPhotos: 0,
    note: lt(
      'Client wants before-and-after photos.',
      'Cliente pide foto del antes y despues.',
    ),
    rainSensitive: true,
    materials: lt('Debris bags and blow-off', 'Costales y soplado'),
  },
  {
    id: 'job-arboleda',
    time: '14:00',
    client: 'Terraza Arboleda',
    contact: 'Lia Campos',
    address: 'Contry, Monterrey',
    neighborhood: 'Contry',
    service: lt('Seasonal landscaping', 'Paisajismo de temporada'),
    crewId: 'norte',
    status: 'en-ruta',
    amount: 12800,
    payment: 'tarjeta',
    invoice: true,
    checklistTotal: 5,
    checklistDone: 0,
    beforePhotos: 0,
    afterPhotos: 0,
    note: lt(
      'Collect remaining deposit and confirm Saturday planting.',
      'Cobrar anticipo restante y confirmar plantado sabatino.',
    ),
    rainSensitive: true,
    materials: lt('Agaves, gravel, and red mulch', 'Agaves, grava y mulch rojo'),
  },
]

export const leads: Lead[] = [
  {
    id: 'lead-villarreal',
    client: 'Casa Villarreal',
    neighborhood: 'Mitras Norte',
    source: lt('WhatsApp', 'WhatsApp'),
    service: lt('Synthetic turf for a small patio', 'Pasto sintetico para patio pequeno'),
    stage: 'nuevo',
    value: 24500,
    nextStep: lt('Reply today before 11:00 AM', 'Responder hoy antes de 11:00'),
  },
  {
    id: 'lead-bodega7',
    client: 'Bodega 7',
    neighborhood: 'Escobedo',
    source: lt('Referral', 'Referido'),
    service: lt('Lot cleanup and haul-off', 'Limpieza de terreno y retiro'),
    stage: 'nuevo',
    value: 18800,
    nextStep: lt('Send the site-visit checklist', 'Enviar checklist de visita'),
  },
  {
    id: 'lead-rioja',
    client: 'Privada La Rioja',
    neighborhood: 'Carretera Nacional',
    source: lt('Instagram', 'Instagram'),
    service: lt('Front-yard design with agaves and gravel', 'Diseno frontal con agaves y grava'),
    stage: 'visita',
    value: 36400,
    nextStep: lt(
      'Site visit at 5:00 PM with reference photos',
      'Visita 17:00 con fotos de referencia',
    ),
  },
  {
    id: 'lead-arista',
    client: 'Consultorio Arista',
    neighborhood: 'Obispado',
    source: lt('WhatsApp', 'WhatsApp'),
    service: lt('Monthly maintenance', 'Mantenimiento mensual'),
    stage: 'propuesta',
    value: 2600,
    nextStep: lt(
      'Send a monthly package with 3 options',
      'Mandar paquete mensual con 3 opciones',
    ),
  },
  {
    id: 'lead-portales',
    client: 'Casa Portales',
    neighborhood: 'Satelite',
    source: lt('WhatsApp', 'WhatsApp'),
    service: lt('Zoned irrigation system', 'Sistema de riego por zonas'),
    stage: 'anticipo',
    value: 21900,
    nextStep: lt('Confirm 40% deposit', 'Confirmar anticipo de 40%'),
  },
]

export const collections: CollectionItem[] = [
  {
    id: 'col-koi',
    client: 'Oficinas Koi',
    amount: 5600,
    due: lt('Today · 6:00 PM', 'Hoy · 18:00'),
    payment: 'transferencia',
    invoice: true,
    risk: 'alta',
    note: lt(
      'Invoice requested and PO is open. Do not let this slip today.',
      'Factura solicitada y OC abierta. No dejar pasar hoy.',
    ),
  },
  {
    id: 'col-nova',
    client: 'Privada Nova',
    amount: 1450,
    due: lt('Tomorrow · 12:00 PM', 'Manana · 12:00'),
    payment: 'codi',
    invoice: false,
    risk: 'media',
    note: lt(
      'Client responds better with photo proof over WhatsApp.',
      'Cliente responde mejor con foto de evidencia en WhatsApp.',
    ),
  },
  {
    id: 'col-arboleda',
    client: 'Terraza Arboleda',
    amount: 4800,
    due: lt('Today · deposit', 'Hoy · anticipo'),
    payment: 'tarjeta',
    invoice: true,
    risk: 'alta',
    note: lt(
      'Do not start Saturday planting without payment applied.',
      'No arrancar plantado sabatino sin pago aplicado.',
    ),
  },
  {
    id: 'col-rivera',
    client: 'Casa Rivera',
    amount: 3200,
    due: lt('Friday · 9:00 AM', 'Viernes · 09:00'),
    payment: 'efectivo',
    invoice: false,
    risk: 'baja',
    note: lt(
      'Usually pays on time. Just send a reminder the night before.',
      'Pago puntual. Solo enviar recordatorio la noche anterior.',
    ),
  },
]

export const scheduleSlots: ScheduleSlot[] = [
  {
    id: 'slot-encinos',
    client: 'Residencial Encinos',
    service: lt('Weekly maintenance', 'Mantenimiento semanal'),
    crewId: 'norte',
    dayId: 'lun-26',
    time: '07:30',
    duration: '2 h',
    status: 'confirmado',
    recurring: lt('Weekly', 'Semanal'),
    invoice: false,
    note: lt('Use gate 2.', 'Acceso por caseta 2.'),
  },
  {
    id: 'slot-koi',
    client: 'Oficinas Koi',
    service: lt('Irrigation and fertilization', 'Riego y fertilizacion'),
    crewId: 'centro',
    dayId: 'lun-26',
    time: '10:10',
    duration: '2.5 h',
    status: 'confirmado',
    recurring: lt('Biweekly', 'Quincenal'),
    invoice: true,
    note: lt('Request CFDI before closeout.', 'Pedir CFDI antes del cierre.'),
  },
  {
    id: 'slot-rioja',
    client: 'Privada La Rioja',
    service: lt('Site assessment visit', 'Visita de valuacion'),
    crewId: 'norte',
    dayId: 'mar-27',
    time: '17:00',
    duration: '45 min',
    status: 'por-confirmar',
    invoice: false,
    note: lt(
      'Client gets back from the office at 4:45 PM.',
      'Cliente llega de oficina a las 16:45.',
    ),
  },
  {
    id: 'slot-portales',
    client: 'Casa Portales',
    service: lt('Irrigation installation', 'Instalacion de riego'),
    crewId: 'centro',
    dayId: 'mie-28',
    time: '09:00',
    duration: '4 h',
    status: 'confirmado',
    invoice: true,
    note: lt('Reserve nozzles and pipe.', 'Reservar boquillas y tuberia.'),
  },
  {
    id: 'slot-nova',
    client: 'Privada Nova',
    service: lt('Biweekly maintenance', 'Mantenimiento quincenal'),
    crewId: 'oriente',
    dayId: 'jue-29',
    time: '11:00',
    duration: '1.5 h',
    status: 'confirmado',
    recurring: lt('Biweekly', 'Quincenal'),
    invoice: false,
    note: lt('Send proof over WhatsApp.', 'Mandar evidencia por WhatsApp.'),
  },
  {
    id: 'slot-arboleda',
    client: 'Terraza Arboleda',
    service: lt('Seasonal landscaping', 'Paisajismo de temporada'),
    crewId: 'norte',
    dayId: 'vie-30',
    time: '14:30',
    duration: '5 h',
    status: 'reprogramar',
    invoice: true,
    note: lt('Move if the rain forecast holds.', 'Mover si sigue pronostico de lluvia.'),
  },
]

export const recurringPlans: RecurringPlan[] = [
  {
    id: 'plan-encinos',
    client: 'Residencial Encinos',
    service: lt('Residential maintenance', 'Mantenimiento residencial'),
    frequency: 'semanal',
    window: lt('Mon 07:30', 'Lun 07:30'),
    dayLabel: lt('Every Monday', 'Todos los lunes'),
    amount: 7400,
    autopilot: true,
  },
  {
    id: 'plan-nova',
    client: 'Privada Nova',
    service: lt('Biweekly maintenance', 'Mantenimiento quincenal'),
    frequency: 'quincenal',
    window: lt('Thu 11:00', 'Jue 11:00'),
    dayLabel: lt('Every 2 weeks', 'Cada 2 semanas'),
    amount: 2900,
    autopilot: true,
  },
  {
    id: 'plan-rivera',
    client: 'Casa Rivera',
    service: lt('Fine pruning and weed control', 'Poda fina y control de maleza'),
    frequency: 'mensual',
    window: lt('Fri 09:30', 'Vie 09:30'),
    dayLabel: lt('First Friday', 'Primer viernes'),
    amount: 3200,
    autopilot: false,
  },
]

export function frequencyLabel(language: Language, frequency: Frequency) {
  const labels = {
    semanal: { en: 'Weekly', es: 'Semanal' },
    quincenal: { en: 'Biweekly', es: 'Quincenal' },
    mensual: { en: 'Monthly', es: 'Mensual' },
  } as const

  return labels[frequency][language]
}

export function quoteFallbackRecipient(language: Language) {
  return language === 'es' ? 'cliente' : 'customer'
}

export function quoteFallbackZone(language: Language) {
  return language === 'es' ? 'tu zona' : 'your area'
}

export function quoteIncludesLabel(language: Language) {
  return language === 'es' ? 'Incluye' : 'Includes'
}

export function quoteNoExtrasLabel(language: Language) {
  return language === 'es'
    ? 'Extras: sin adicionales por ahora.'
    : 'Extras: no add-ons selected right now.'
}

export function quoteInvoicePrompt(language: Language) {
  return language === 'es'
    ? 'Favor de compartir datos fiscales para CFDI antes del anticipo.'
    : 'Please share invoice details before the deposit.'
}

export function quotePaymentPrompt(language: Language) {
  return language === 'es'
    ? 'Pago disponible por transferencia, efectivo, tarjeta o CoDi.'
    : 'Payment available via transfer, cash, card, or CoDi.'
}

export function buildQuoteIntro(
  language: Language,
  recipient: string,
  service: string,
  zone: string,
) {
  return language === 'es'
    ? `Hola ${recipient}, te comparto propuesta para ${service.toLowerCase()} en ${zone}.`
    : `Hi ${recipient}, here is the proposal for ${service.toLowerCase()} in ${zone}.`
}
