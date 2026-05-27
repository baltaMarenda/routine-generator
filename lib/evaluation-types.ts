export interface GoniometryRow {
  movement: string
  active: string
  passive: string
  normalValue: string
  pain: string
}

export interface GoniometrySection {
  name: string
  rows: GoniometryRow[]
}

export interface EvaluationData {
  // Header
  date: string
  
  // Patient Data
  patientData: {
    nombreApellido: string
    dni: string
    fechaNacimiento: string
    edad: string
    telefono: string
    email: string
    direccion: string
    ocupacion: string
    actividadFisica: string
    alimentacion: string
    sueno: string
    medicoDerivante: string
    diagnosticoMedico: string
  }

  // Consultation Reason
  motivoConsulta: string

  // Goniometry (Range of Movement)
  goniometry: {
    hombro: GoniometryRow[]
    codo: GoniometryRow[]
    muneca: GoniometryRow[]
    rodilla: GoniometryRow[]
    tobillo: GoniometryRow[]
    columnaCervical: GoniometryRow[]
    columnaLumbar: GoniometryRow[]
  }

  // Relevant Background
  antecedentes: {
    personales: string
    quirurgicosTraumaticos: string
    medicacionActual: string
    lesionesMusculoesqueleticas: string
  }

  // Clinical Evaluation
  evaluacionClinica: {
    eva: {
      reposo: string
      movimiento: string
      nocturno: string
    }
    fuerzaMuscular: {
      grupo: string
      derecho: string
      izquierdo: string
    }[]
  }

  // Postural Inspection
  inspeccionPostural: {
    vistaAnterior: boolean
    vistaAnteriorObs: string
    vistaLateral: boolean
    vistaLateralObs: string
    vistaPosterior: boolean
    vistaPosteriorObs: string
    observaciones: string
  }

  // Palpation
  palpacion: {
    hipertonia: boolean
    triggerPoints: boolean
    restriccionFascial: boolean
    dolorPalpacion: boolean
    edema: boolean
    observaciones: string
  }

  // Special Tests
  pruebasEspeciales: string

  // Diagnosis
  diagnosticoKinesiologico: string

  // Therapeutic Objectives
  objetivos: {
    cortoPlazo: string
    medianoPlazo: string
    largoPlazo: string
  }

  // Treatment Plan
  planTratamiento: {
    terapiaManual: boolean
    ejercicioTerapeutico: boolean
    liberacionMiofascial: boolean
    electroterapia: boolean
    ultrasonido: boolean
    puncionSeca: boolean
    vendajeFuncional: boolean
    reeducacionPostural: boolean
    frecuenciaSemanal: string
    duracionEstimada: string
  }

  // Evolution
  evolucion: {
    fecha: string
    eva: string
    cambiosRom: string
    observaciones: string
  }[]

  // Informed Consent
  consentimiento: {
    firmaPaciente: string
    firmaProfesional: string
    fecha: string
  }
}

export function createEmptyEvaluation(): EvaluationData {
  const today = new Date().toLocaleDateString('es-AR')
  
  return {
    date: today,
    patientData: {
      nombreApellido: '',
      dni: '',
      fechaNacimiento: '',
      edad: '',
      telefono: '',
      email: '',
      direccion: '',
      ocupacion: '',
      actividadFisica: '',
      alimentacion: '',
      sueno: '',
      medicoDerivante: '',
      diagnosticoMedico: ''
    },
    motivoConsulta: '',
    goniometry: {
      hombro: [
        { movement: 'Flexión', active: '', passive: '', normalValue: '0-180°', pain: '' },
        { movement: 'Extensión', active: '', passive: '', normalValue: '0-60°', pain: '' },
        { movement: 'Abducción', active: '', passive: '', normalValue: '0-180°', pain: '' },
        { movement: 'Aducción', active: '', passive: '', normalValue: '0-45°', pain: '' },
        { movement: 'Rotación Interna', active: '', passive: '', normalValue: '0-70°', pain: '' },
        { movement: 'Rotación Externa', active: '', passive: '', normalValue: '0-90°', pain: '' }
      ],
      codo: [
        { movement: 'Flexión', active: '', passive: '', normalValue: '0-150°', pain: '' },
        { movement: 'Extensión', active: '', passive: '', normalValue: '0°', pain: '' },
        { movement: 'Pronación', active: '', passive: '', normalValue: '0-80°', pain: '' },
        { movement: 'Supinación', active: '', passive: '', normalValue: '0-80°', pain: '' }
      ],
      muneca: [
        { movement: 'Flexión', active: '', passive: '', normalValue: '0-80°', pain: '' },
        { movement: 'Extensión', active: '', passive: '', normalValue: '0-70°', pain: '' },
        { movement: 'Desviación radial', active: '', passive: '', normalValue: '0-20°', pain: '' },
        { movement: 'Desviación cubital', active: '', passive: '', normalValue: '0-30°', pain: '' }
      ],
      rodilla: [
        { movement: 'Flexión', active: '', passive: '', normalValue: '0-135°', pain: '' },
        { movement: 'Extensión', active: '', passive: '', normalValue: '0°', pain: '' }
      ],
      tobillo: [
        { movement: 'Dorsiflexión', active: '', passive: '', normalValue: '0-20°', pain: '' },
        { movement: 'Flexión plantar', active: '', passive: '', normalValue: '0-50°', pain: '' },
        { movement: 'Inversión', active: '', passive: '', normalValue: '0-35°', pain: '' },
        { movement: 'Eversión', active: '', passive: '', normalValue: '0-15°', pain: '' }
      ],
      columnaCervical: [
        { movement: 'Flexión', active: '', passive: '', normalValue: '0-45°', pain: '' },
        { movement: 'Extensión', active: '', passive: '', normalValue: '0-45°', pain: '' },
        { movement: 'Inclinación lateral', active: '', passive: '', normalValue: '0-45°', pain: '' },
        { movement: 'Rotación', active: '', passive: '', normalValue: '0-60°', pain: '' }
      ],
      columnaLumbar: [
        { movement: 'Flexión', active: '', passive: '', normalValue: '0-60°', pain: '' },
        { movement: 'Extensión', active: '', passive: '', normalValue: '0-25°', pain: '' },
        { movement: 'Inclinación lateral', active: '', passive: '', normalValue: '0-25°', pain: '' },
        { movement: 'Rotación', active: '', passive: '', normalValue: '0-30°', pain: '' }
      ]
    },
    antecedentes: {
      personales: '',
      quirurgicosTraumaticos: '',
      medicacionActual: '',
      lesionesMusculoesqueleticas: ''
    },
    evaluacionClinica: {
      eva: {
        reposo: '',
        movimiento: '',
        nocturno: ''
      },
      fuerzaMuscular: [
        { grupo: '', derecho: '', izquierdo: '' }
      ]
    },
    inspeccionPostural: {
      vistaAnterior: false,
      vistaAnteriorObs: '',
      vistaLateral: false,
      vistaLateralObs: '',
      vistaPosterior: false,
      vistaPosteriorObs: '',
      observaciones: ''
    },
    palpacion: {
      hipertonia: false,
      triggerPoints: false,
      restriccionFascial: false,
      dolorPalpacion: false,
      edema: false,
      observaciones: ''
    },
    pruebasEspeciales: '',
    diagnosticoKinesiologico: '',
    objetivos: {
      cortoPlazo: '',
      medianoPlazo: '',
      largoPlazo: ''
    },
    planTratamiento: {
      terapiaManual: false,
      ejercicioTerapeutico: false,
      liberacionMiofascial: false,
      electroterapia: false,
      ultrasonido: false,
      puncionSeca: false,
      vendajeFuncional: false,
      reeducacionPostural: false,
      frecuenciaSemanal: '',
      duracionEstimada: ''
    },
    evolucion: [
      { fecha: '', eva: '', cambiosRom: '', observaciones: '' }
    ],
    consentimiento: {
      firmaPaciente: '',
      firmaProfesional: '',
      fecha: ''
    }
  }
}
