import type { Frequency, JobStatus, Language, LeadStage } from './data'

export const translations = {
  en: {
    app: {
      brandName: 'Gutierrez Verde Ops',
      brandTitle: 'Juan Gutierrez lawn care',
      modeLabel: 'Crew mode',
      demoLabel: 'Demo mode',
      syncLabel: 'Synced 08:12',
      offlineLabel: 'Offline ready',
      nativeOnlyLabel: 'iOS / Android',
      language: 'Language',
      english: 'EN',
      spanish: 'ES',
    },
    tabs: {
      demo: 'Demo',
      hoy: 'Today',
      agenda: 'Schedule',
      trabajos: 'Jobs',
      cotizar: 'Quote',
      crm: 'CRM',
      cobranza: 'Collections',
    },
    labels: {
      location: 'Location',
      crew: 'Crew',
      ticket: 'Ticket',
      checklist: 'Checklist',
      note: 'Ops note',
      materials: 'Materials',
      route: 'Route',
      nextStop: 'Next stop',
      fuel: 'Fuel',
      tracking: 'Tracking',
      eta: 'ETA',
      speed: 'Speed',
      weather: 'Weather',
      visibleShifts: 'Visible slots',
      busyCrews: 'Busy crews',
      recurrence: 'Recurrence',
      invoice: 'Invoice',
      value: 'Value',
      nextStep: 'Next step',
      total: 'Total estimate',
      extras: 'Extras',
      baseAndArea: 'Base + area',
      frequencyDiscount: 'Frequency discount',
      monthlyPlan: 'Suggested monthly plan',
      deposit: 'Suggested deposit',
      service: 'Service',
      client: 'Client',
      area: 'Estimated area',
      zone: 'Neighborhood / zone',
      suggestedTime: 'Suggested time',
      recurringPlan: 'Create recurring plan',
      clientWithInvoice: 'Client needs invoice',
      income: 'Revenue',
      window: 'Window',
      frequency: 'Frequency',
      due: 'Due',
      weatherRisk: 'Rain sensitive',
      planStatus: 'Generate future visits',
      cdfiChecklist: 'Invoice checklist',
    },
    sections: {
      todayTitle: 'Mobile operations for today',
      todaySubtitleOwner:
        'Owner/operator view: route, collections, rain risk, and crews on the move.',
      todaySubtitleCrew:
        'Crew-lead view: less admin, more proof, progress, and execution.',
      quickActionsTitle: 'Quick actions',
      quickActionsSubtitle: 'Built for one-handed use and frequent field tasks.',
      trackingTitle: 'Crews on the move',
      trackingSubtitle: 'Live pings, ETA, route completion, and equipment readiness.',
      capacityTitle: 'Crew capacity',
      jobsTitle: 'Job cards',
      jobsSubtitle:
        'Route, checklist, before/after photos, collections, and one-tap maps.',
      quoteTitle: 'On-site quote builder',
      quoteSubtitle:
        'Capture fast, send the proposal, and collect the deposit from the phone.',
      crmTitle: 'CRM + WhatsApp',
      crmSubtitle:
        'Short-cycle leads, mobile follow-up, and a fast jump into quoting.',
      collectionsTitle: 'Collections and invoice tracking',
      collectionsSubtitle:
        'Today’s receivables, invoice flags, reminders, and mobile closeout.',
      agendaTitle: 'Schedule and calendar',
      agendaSubtitle:
        'Week view, day load, and crew capacity from a phone-sized calendar.',
      quickScheduleTitle: 'Quick booking',
      quickScheduleSubtitle:
        'Book a visit, service, or reschedule without leaving the agenda.',
      daySlotsPrefix: 'Slots for',
      daySlotsSubtitle:
        'Confirmations, rain reschedules, and customer follow-up from the same screen.',
      recurringTitle: 'Recurring plans',
      recurringSubtitle:
        'Control weekly, biweekly, and monthly maintenance plans.',
    },
    demo: {
      title: 'Juan demo flow',
      subtitle:
        'Preloaded walkthrough for quote, schedule, jobs, and WhatsApp follow-up.',
      note:
        'Sample route, quote, and weekly-service details are loaded so Juan can review the app without typing.',
      walkthroughTitle: 'Feature walkthrough',
      walkthroughSubtitle:
        'Jump into each area with preloaded data and review the feature in context.',
      quoteAction: 'Open quote',
      scheduleAction: 'Open calendar',
      jobsAction: 'Open jobs',
      enable: 'Enable demo',
      loaded: 'Demo data loaded',
    },
    today: {
      heroBadge: 'Rain',
      heroTitlePrefix: 'services need a rain plan before',
      heroText:
        'Move open landscaping work and prioritize quick maintenance before rain.',
      moveRoute: 'Move route',
      notifyClients: 'Notify clients',
      scheduledRevenue: 'Scheduled revenue',
      activeServicesSuffix: 'active services today',
      pendingEvidence: 'Evidence pending',
      pendingEvidenceDetail: 'Services missing full photo proof',
      receivables: 'Receivables',
      receivablesDetailSuffix: 'with invoice',
      openPipeline: 'Open pipeline',
      opportunitiesSuffix: 'opportunities',
      startJob: 'Start job',
      startJobDetail: 'Open cards and checklist',
      quoteOnSite: 'Quote on site',
      quoteOnSiteDetail: 'MXN, extras, and deposit',
      followup: 'WhatsApp follow-up',
      followupDetail: 'Fast lead response',
      closePayment: 'Close payment',
      closePaymentDetailSuffix: 'ready to collect',
      online: 'Online',
      delay: 'Delay',
      routeStops: 'stops',
    },
    agenda: {
      bookSlot: 'Book slot',
      headsUp: 'Pre-notify',
      noSlotsTitle: 'No slots for this day',
      noSlotsText: 'Use quick booking to create a visit or service.',
      uniqueService: 'One-time service',
      autoSchedule: 'Auto-schedule',
      manualSchedule: 'Manual',
      confirm: 'Confirm',
      moveNextDay: 'Move +1 day',
      notify: 'Notify',
      slotBookedTitle: 'Slot booked',
      missingClientTitle: 'Missing client',
      missingClientText: 'Enter the customer name before booking a time slot.',
      rainMoveNote: 'Move if the rain forecast holds.',
    },
    jobs: {
      map: 'Map',
      whatsapp: 'WhatsApp',
      startService: 'Start service',
      readyForPayment: 'Ready for payment',
      closeService: 'Close service',
      reopen: 'Reopen',
      mobileChecklist: 'Mobile checklist',
      photoEvidence: 'Photo evidence',
      before: 'Before',
      after: 'After',
      photos: 'photos',
    },
    quote: {
      customerPlaceholder: 'Customer name',
      neighborhoodPlaceholder: 'Neighborhood, district...',
      serviceType: 'Service type',
      areaText: 'Estimated area',
      zoneText: 'Service zone',
      extrasText: 'Extras',
      invoiceTitle: 'Needs invoice',
      invoiceDetail:
        'Collect invoice data and payment method from the first deposit.',
      readyMessage: 'Message ready to send',
      share: 'Share',
      spanishNoteTitle: 'Spanish note for WhatsApp',
      spanishNoteDetail:
        'Type in Spanish or use dictation, then send the Spanish version to WhatsApp.',
      spanishNotePlaceholder: 'Example: Manana puedo pasar despues de las 4 pm.',
      englishNoteTitle: 'English note to copy',
      englishNoteDetail:
        'Write the English version manually when you need a clean paste for English-speaking clients.',
      englishNotePlaceholder: 'Example: I can come by tomorrow after 4 pm.',
      whatsappSpanish: 'WhatsApp ES',
      copySpanish: 'Copy ES',
      copyEnglish: 'Copy EN',
      clearSpanish: 'Clear ES',
      dictateSpanish: 'Dictate ES',
      stopDictation: 'Stop dictation',
      customNotePrefix: 'Note',
    },
    crm: {
      respond: 'Reply',
      buildQuote: 'Quote',
    },
    collections: {
      pendingToCollect: 'Pending to collect',
      invoiceOnly: 'Invoices only',
      remind: 'Remind',
      invoiceChecklist: 'Invoice',
    },
    switches: {
      recurringTitle: 'Create recurring plan',
      recurringDetail: 'Generate future visits from this time slot.',
      futureVisits: 'Generate future visits',
    },
    statuses: {
      job: {
        'en-ruta': 'En route',
        trabajando: 'Working',
        'pendiente-cobro': 'Pending payment',
        cerrado: 'Closed',
      },
      lead: {
        todas: 'All',
        nuevo: 'New',
        visita: 'Visit',
        propuesta: 'Proposal',
        anticipo: 'Deposit',
      },
      schedule: {
        confirmado: 'Confirmed',
        'por-confirmar': 'Needs confirm',
        reprogramar: 'Reschedule',
      },
      risk: {
        alta: 'High',
        media: 'Medium',
        baja: 'Low',
      },
      tracking: {
        normal: 'Online',
        retraso: 'Delayed',
        desvio: 'Off route',
      },
      payment: {
        transferencia: 'Transfer',
        efectivo: 'Cash',
        tarjeta: 'Card',
        codi: 'CoDi',
      },
      frequency: {
        semanal: 'Weekly',
        quincenal: 'Biweekly',
        mensual: 'Monthly',
      },
    },
    alerts: {
      permissionTitle: 'Permission required',
      permissionText:
        'The app needs photo-library access to attach service evidence.',
      whatsappTitle: 'Could not open WhatsApp',
      whatsappText: 'Check that WhatsApp is available on this device.',
      mapsTitle: 'Could not open maps',
      mapsText: 'Check the device mapping configuration.',
      invoiceTitle: 'Invoice checklist',
      invoiceText:
        'Validate invoice data, payment method, and CFDI usage before closeout.',
      noInvoiceText: 'Customer does not need an invoice. Just send payment confirmation.',
      clipboardTitle: 'Copied',
      clipboardSpanishText: 'Spanish text copied. Paste it into WhatsApp.',
      clipboardEnglishText: 'English text copied. Paste it into WhatsApp.',
      speechUnavailableTitle: 'Speech not available',
      speechUnavailableText:
        'Speech recognition is not available on this device or build yet.',
      speechPermissionText:
        'Allow microphone and speech access so dictation can fill the Spanish note.',
      speechErrorTitle: 'Dictation stopped',
    },
  },
  es: {
    app: {
      brandName: 'Gutierrez Verde Ops',
      brandTitle: 'Cesped y operacion con Juan Gutierrez',
      modeLabel: 'Modo cuadrilla',
      demoLabel: 'Modo demo',
      syncLabel: 'Sincronizado 08:12',
      offlineLabel: 'Offline listo',
      nativeOnlyLabel: 'iOS / Android',
      language: 'Idioma',
      english: 'EN',
      spanish: 'ES',
    },
    tabs: {
      demo: 'Demo',
      hoy: 'Hoy',
      agenda: 'Agenda',
      trabajos: 'Trabajos',
      cotizar: 'Cotizar',
      crm: 'CRM',
      cobranza: 'Cobranza',
    },
    labels: {
      location: 'Ubicacion',
      crew: 'Cuadrilla',
      ticket: 'Ticket',
      checklist: 'Checklist',
      note: 'Nota operativa',
      materials: 'Materiales',
      route: 'Ruta',
      nextStop: 'Siguiente parada',
      fuel: 'Combustible',
      tracking: 'Tracking',
      eta: 'ETA',
      speed: 'Velocidad',
      weather: 'Clima',
      visibleShifts: 'Turnos visibles',
      busyCrews: 'Cuadrillas ocupadas',
      recurrence: 'Repeticion',
      invoice: 'CFDI',
      value: 'Valor',
      nextStep: 'Siguiente paso',
      total: 'Total estimado',
      extras: 'Extras',
      baseAndArea: 'Base + superficie',
      frequencyDiscount: 'Descuento frecuencia',
      monthlyPlan: 'Plan mensual sugerido',
      deposit: 'Anticipo sugerido',
      service: 'Servicio',
      client: 'Cliente',
      area: 'Superficie estimada',
      zone: 'Colonia / zona',
      suggestedTime: 'Horario sugerido',
      recurringPlan: 'Crear plan recurrente',
      clientWithInvoice: 'Cliente con CFDI',
      income: 'Ingreso',
      window: 'Ventana',
      frequency: 'Frecuencia',
      due: 'Vence',
      weatherRisk: 'Sensible lluvia',
      planStatus: 'Generar siguientes visitas',
      cdfiChecklist: 'Checklist CFDI',
    },
    sections: {
      todayTitle: 'Operacion movil para hoy',
      todaySubtitleOwner:
        'Vista del operador/dueno: ruta, cobranza, riesgo de lluvia y cuadrillas en movimiento.',
      todaySubtitleCrew:
        'Vista del jefe de cuadrilla: menos administracion, mas evidencia, avance y ejecucion.',
      quickActionsTitle: 'Acciones rapidas',
      quickActionsSubtitle: 'Pensadas para uso con una mano y tareas frecuentes en campo.',
      trackingTitle: 'Cuadrillas en movimiento',
      trackingSubtitle: 'Pings en vivo, ETA, avance de ruta y equipo listo.',
      capacityTitle: 'Capacidad por cuadrilla',
      jobsTitle: 'Tarjetas de trabajo',
      jobsSubtitle:
        'Ruta, checklist, fotos antes/despues, cobranza y acceso a mapas.',
      quoteTitle: 'Cotizador en sitio',
      quoteSubtitle:
        'Captura rapido, manda la propuesta y cobra el anticipo desde el telefono.',
      crmTitle: 'CRM + WhatsApp',
      crmSubtitle:
        'Leads cortos, seguimiento movil y salto rapido a cotizacion.',
      collectionsTitle: 'Cobranza y seguimiento CFDI',
      collectionsSubtitle:
        'Pendientes del dia, facturas, recordatorios y cierre movil.',
      agendaTitle: 'Agenda y calendario',
      agendaSubtitle:
        'Semana visible, carga por dia y capacidad de cuadrillas desde el celular.',
      quickScheduleTitle: 'Agendar rapido',
      quickScheduleSubtitle:
        'Aparta visita, servicio o reprogramacion sin salir de la agenda.',
      daySlotsPrefix: 'Turnos de',
      daySlotsSubtitle:
        'Confirmaciones, reprogramacion por lluvia y seguimiento al cliente en una sola pantalla.',
      recurringTitle: 'Planes recurrentes',
      recurringSubtitle:
        'Control de mantenimientos semanales, quincenales y mensuales.',
    },
    demo: {
      title: 'Recorrido demo para Juan',
      subtitle:
        'Recorrido precargado para cotizacion, agenda, trabajos y seguimiento por WhatsApp.',
      note:
        'Se cargan ruta, cotizacion y detalle semanal de muestra para que Juan revise la app sin capturar datos.',
      walkthroughTitle: 'Recorrido por funciones',
      walkthroughSubtitle:
        'Salta a cada area con datos precargados y revisa la funcion en contexto.',
      quoteAction: 'Abrir cotizacion',
      scheduleAction: 'Abrir agenda',
      jobsAction: 'Abrir trabajos',
      enable: 'Activar demo',
      loaded: 'Datos demo cargados',
    },
    today: {
      heroBadge: 'Lluvia',
      heroTitlePrefix: 'servicios requieren plan por lluvia antes de',
      heroText:
        'Mover paisajismo abierto y dar prioridad a mantenimiento rapido antes de lluvia.',
      moveRoute: 'Mover ruta',
      notifyClients: 'Avisar clientes',
      scheduledRevenue: 'Venta programada',
      activeServicesSuffix: 'servicios activos hoy',
      pendingEvidence: 'Evidencia pendiente',
      pendingEvidenceDetail: 'Servicios sin fotos completas',
      receivables: 'Cobranza por aplicar',
      receivablesDetailSuffix: 'con CFDI',
      openPipeline: 'Pipeline abierto',
      opportunitiesSuffix: 'oportunidades',
      startJob: 'Iniciar trabajo',
      startJobDetail: 'Abrir tarjetas y checklist',
      quoteOnSite: 'Cotizar en sitio',
      quoteOnSiteDetail: 'MXN, extras y anticipo',
      followup: 'Seguimiento WA',
      followupDetail: 'Respuesta rapida a leads',
      closePayment: 'Cerrar cobro',
      closePaymentDetailSuffix: 'listos para cobrar',
      online: 'En linea',
      delay: 'Retraso',
      routeStops: 'paradas',
    },
    agenda: {
      bookSlot: 'Apartar horario',
      headsUp: 'Preavisar',
      noSlotsTitle: 'No hay turnos para este dia',
      noSlotsText: 'Usa el agendador rapido para abrir una visita o servicio.',
      uniqueService: 'Servicio unico',
      autoSchedule: 'Autoagenda',
      manualSchedule: 'Manual',
      confirm: 'Confirmar',
      moveNextDay: 'Mover +1 dia',
      notify: 'Avisar',
      slotBookedTitle: 'Horario apartado',
      missingClientTitle: 'Falta cliente',
      missingClientText: 'Captura el nombre antes de apartar un horario.',
      rainMoveNote: 'Mover si sigue pronostico de lluvia.',
    },
    jobs: {
      map: 'Mapa',
      whatsapp: 'WhatsApp',
      startService: 'Iniciar servicio',
      readyForPayment: 'Listo para cobro',
      closeService: 'Cerrar servicio',
      reopen: 'Reabrir',
      mobileChecklist: 'Checklist movil',
      photoEvidence: 'Evidencia fotografica',
      before: 'Antes',
      after: 'Despues',
      photos: 'fotos',
    },
    quote: {
      customerPlaceholder: 'Nombre del cliente',
      neighborhoodPlaceholder: 'Cumbres, San Jeronimo...',
      serviceType: 'Tipo de servicio',
      areaText: 'Superficie estimada',
      zoneText: 'Zona de servicio',
      extrasText: 'Extras',
      invoiceTitle: 'Requiere CFDI',
      invoiceDetail:
        'Pide datos fiscales y forma de pago desde el primer anticipo.',
      readyMessage: 'Mensaje listo para enviar',
      share: 'Compartir',
      spanishNoteTitle: 'Nota en espanol para WhatsApp',
      spanishNoteDetail:
        'Escribe en espanol o usa dictado y manda esa version por WhatsApp.',
      spanishNotePlaceholder: 'Ejemplo: Manana puedo pasar despues de las 4 pm.',
      englishNoteTitle: 'Nota en ingles para copiar',
      englishNoteDetail:
        'Escribe manualmente la version en ingles cuando necesites pegarla limpia en WhatsApp.',
      englishNotePlaceholder: 'Ejemplo: I can come by tomorrow after 4 pm.',
      whatsappSpanish: 'WhatsApp ES',
      copySpanish: 'Copiar ES',
      copyEnglish: 'Copiar EN',
      clearSpanish: 'Limpiar ES',
      dictateSpanish: 'Dictar ES',
      stopDictation: 'Detener dictado',
      customNotePrefix: 'Nota',
    },
    crm: {
      respond: 'Responder',
      buildQuote: 'Cotizar',
    },
    collections: {
      pendingToCollect: 'Pendiente por cobrar',
      invoiceOnly: 'Solo CFDI',
      remind: 'Recordar',
      invoiceChecklist: 'CFDI',
    },
    switches: {
      recurringTitle: 'Crear plan recurrente',
      recurringDetail: 'Genera visitas automaticas desde este horario.',
      futureVisits: 'Generar siguientes visitas',
    },
    statuses: {
      job: {
        'en-ruta': 'En ruta',
        trabajando: 'Trabajando',
        'pendiente-cobro': 'Pendiente cobro',
        cerrado: 'Cerrado',
      },
      lead: {
        todas: 'Todas',
        nuevo: 'Nuevo',
        visita: 'Visita',
        propuesta: 'Propuesta',
        anticipo: 'Anticipo',
      },
      schedule: {
        confirmado: 'Confirmado',
        'por-confirmar': 'Por confirmar',
        reprogramar: 'Reprogramar',
      },
      risk: {
        alta: 'Alta',
        media: 'Media',
        baja: 'Baja',
      },
      tracking: {
        normal: 'En linea',
        retraso: 'Retraso',
        desvio: 'Desvio',
      },
      payment: {
        transferencia: 'Transferencia',
        efectivo: 'Efectivo',
        tarjeta: 'Tarjeta',
        codi: 'CoDi',
      },
      frequency: {
        semanal: 'Semanal',
        quincenal: 'Quincenal',
        mensual: 'Mensual',
      },
    },
    alerts: {
      permissionTitle: 'Permiso requerido',
      permissionText:
        'La app necesita acceso a fotos para adjuntar evidencia del servicio.',
      whatsappTitle: 'No se pudo abrir WhatsApp',
      whatsappText: 'Revisa que WhatsApp este disponible en este dispositivo.',
      mapsTitle: 'No se pudo abrir mapas',
      mapsText: 'Revisa la configuracion de mapas del dispositivo.',
      invoiceTitle: 'Checklist CFDI',
      invoiceText:
        'Validar datos fiscales, forma de pago y uso CFDI antes del cierre.',
      noInvoiceText:
        'Cliente sin factura. Solo enviar confirmacion de pago.',
      clipboardTitle: 'Copiado',
      clipboardSpanishText: 'Texto en espanol copiado. Pegalo en WhatsApp.',
      clipboardEnglishText: 'Texto en ingles copiado. Pegalo en WhatsApp.',
      speechUnavailableTitle: 'Dictado no disponible',
      speechUnavailableText:
        'El reconocimiento de voz no esta disponible en este dispositivo o build.',
      speechPermissionText:
        'Permite microfono y reconocimiento de voz para llenar la nota en espanol.',
      speechErrorTitle: 'Dictado detenido',
    },
  },
} as const

export function getTranslation(language: Language) {
  return translations[language]
}

export function frequencyLabel(language: Language, frequency: Frequency) {
  return translations[language].statuses.frequency[frequency]
}

export function leadStageLabel(language: Language, stage: LeadStage | 'todas') {
  return translations[language].statuses.lead[stage]
}

export function jobStatusLabel(language: Language, status: JobStatus) {
  return translations[language].statuses.job[status]
}

export function allLabel(language: Language) {
  return translations[language].statuses.lead.todas
}

export function unitLabel(language: Language, unit: 'people' | 'slots' | 'crews') {
  if (unit === 'people') {
    return language === 'es' ? 'personas' : 'people'
  }
  if (unit === 'slots') {
    return language === 'es' ? 'turnos' : 'slots'
  }
  return language === 'es' ? 'cuadrillas' : 'crews'
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

export function buildBookedMessage(
  language: Language,
  client: string,
  dayLabel: string,
  time: string,
) {
  return language === 'es'
    ? `${client} fue agendado para ${dayLabel} a las ${time}.`
    : `${client} was booked for ${dayLabel} at ${time}.`
}

export function buildHeadsUpMessage(
  language: Language,
  client: string,
  dayLabel: string,
  time: string,
) {
  return language === 'es'
    ? `Hola ${client}, te reserve ${dayLabel} a las ${time}. Te confirmo detalles en breve.`
    : `Hi ${client}, I reserved ${dayLabel} at ${time}. I will confirm details shortly.`
}

export function scheduleInvoiceLabel(language: Language, invoice: boolean) {
  if (invoice) {
    return language === 'es' ? 'Requiere factura' : 'Invoice required'
  }
  return language === 'es' ? 'Cobro simple' : 'Simple collection'
}

export function buildScheduleConfirmationMessage(
  language: Language,
  client: string,
  service: string,
  dayLabel: string,
  time: string,
) {
  return language === 'es'
    ? `Hola ${client}, confirmo tu servicio de ${service.toLowerCase()} para ${dayLabel} a las ${time}.`
    : `Hi ${client}, confirming your ${service.toLowerCase()} service for ${dayLabel} at ${time}.`
}

export function buildEnRouteMessage(
  language: Language,
  contact: string,
  service: string,
  neighborhood: string,
) {
  return language === 'es'
    ? `Hola ${contact}, vamos en ruta para ${service.toLowerCase()} en ${neighborhood}.`
    : `Hi ${contact}, we are en route for ${service.toLowerCase()} in ${neighborhood}.`
}

export function buildCrmFollowUpMessage(
  language: Language,
  client: string,
  followUp: string,
) {
  return language === 'es'
    ? `Hola ${client}, gracias por escribirnos. ${followUp}`
    : `Hi ${client}, thanks for reaching out. ${followUp}`
}

export function buildCollectionReminderMessage(
  language: Language,
  client: string,
  reminder: string,
  amount: string,
) {
  return language === 'es'
    ? `Hola ${client}, ${reminder} Importe pendiente: ${amount}.`
    : `Hi ${client}, ${reminder} Outstanding amount: ${amount}.`
}
