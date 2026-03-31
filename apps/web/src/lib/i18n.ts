/**
 * Simple i18n system — Spanish/English translations
 */

type Locale = 'es' | 'en'

const translations: Record<Locale, Record<string, string>> = {
  es: {
    // Nav
    'nav.projects': 'Proyectos',
    'nav.iris_connections': 'Conexiones IRIS',
    'nav.audit_log': 'Registro de Auditoría',
    'nav.settings': 'Configuración',
    'nav.admin': 'Administración',
    'nav.logout': 'Cerrar Sesión',

    // Auth
    'auth.login': 'Iniciar Sesión',
    'auth.register': 'Crear Cuenta',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.forgot_password': '¿Olvidaste tu contraseña?',
    'auth.organization': 'Nombre de la organización',
    'auth.welcome_back': 'Bienvenido de vuelta',
    'auth.create_account': 'Crear tu cuenta',
    'auth.already_have_account': '¿Ya tienes cuenta?',
    'auth.no_account': '¿No tienes cuenta?',

    // Projects
    'projects.title': 'Proyectos',
    'projects.new': 'Nuevo Proyecto',
    'projects.no_projects': 'Sin proyectos aún',
    'projects.create_first': 'Crea tu primer proyecto de migración.',
    'projects.source_platforms': 'Plataformas origen',
    'projects.select_all': 'selecciona todas las que apliquen',

    // Pipeline
    'pipeline.upload': 'Subir Archivos',
    'pipeline.analyze': 'Analizar',
    'pipeline.map': 'Mapear',
    'pipeline.generate': 'Generar Código',
    'pipeline.validate': 'Validar',
    'pipeline.deploy': 'Desplegar',
    'pipeline.test': 'Probar',

    // Actions
    'action.save': 'Guardar',
    'action.cancel': 'Cancelar',
    'action.delete': 'Eliminar',
    'action.edit': 'Editar',
    'action.confirm': 'Confirmar',
    'action.generate_all': 'Generar Todo',
    'action.analyze_all': 'Analizar Todo',
    'action.download': 'Descargar',
    'action.back': 'Volver',
    'action.retry': 'Reintentar',

    // Status
    'status.loading': 'Cargando...',
    'status.analyzing': 'Analizando...',
    'status.generating': 'Generando...',
    'status.deploying': 'Desplegando...',
    'status.passed': 'Aprobado',
    'status.failed': 'Fallido',
    'status.pending': 'Pendiente',

    // Plans
    'plan.trial': 'Prueba',
    'plan.starter': 'Inicial',
    'plan.professional': 'Profesional',
    'plan.enterprise': 'Empresarial',
    'plan.expired': 'Período de prueba expirado. Contáctenos para actualizar.',
    'plan.limit_reached': 'Límite alcanzado. Actualice su plan para más.',
  },

  en: {
    'nav.projects': 'Projects',
    'nav.iris_connections': 'IRIS Connections',
    'nav.audit_log': 'Audit Log',
    'nav.settings': 'Settings',
    'nav.admin': 'Admin',
    'nav.logout': 'Logout',
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgot_password': 'Forgot password?',
    'auth.organization': 'Organization name',
    'auth.welcome_back': 'Welcome back',
    'auth.create_account': 'Create your account',
    'auth.already_have_account': 'Already have an account?',
    'auth.no_account': "Don't have an account?",
    'projects.title': 'Projects',
    'projects.new': 'New Project',
    'projects.no_projects': 'No projects yet',
    'projects.create_first': 'Create your first migration project.',
    'projects.source_platforms': 'Source platforms',
    'projects.select_all': 'select all that apply',
    'pipeline.upload': 'Upload Files',
    'pipeline.analyze': 'Analyze',
    'pipeline.map': 'Map',
    'pipeline.generate': 'Generate Code',
    'pipeline.validate': 'Validate',
    'pipeline.deploy': 'Deploy',
    'pipeline.test': 'Test',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.confirm': 'Confirm',
    'action.generate_all': 'Generate All',
    'action.analyze_all': 'Analyze All',
    'action.download': 'Download',
    'action.back': 'Back',
    'action.retry': 'Retry',
    'status.loading': 'Loading...',
    'status.analyzing': 'Analyzing...',
    'status.generating': 'Generating...',
    'status.deploying': 'Deploying...',
    'status.passed': 'Passed',
    'status.failed': 'Failed',
    'status.pending': 'Pending',
    'plan.trial': 'Trial',
    'plan.starter': 'Starter',
    'plan.professional': 'Professional',
    'plan.enterprise': 'Enterprise',
    'plan.expired': 'Trial expired. Contact us to upgrade.',
    'plan.limit_reached': 'Limit reached. Upgrade your plan for more.',
  },
}

let currentLocale: Locale = 'es'

export function setLocale(locale: Locale) {
  currentLocale = locale
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', locale)
  }
}

export function getLocale(): Locale {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('locale') as Locale) || 'es'
  }
  return 'es'
}

export function t(key: string): string {
  const locale = typeof window !== 'undefined' ? getLocale() : currentLocale
  return translations[locale]?.[key] || translations['en']?.[key] || key
}

export function initLocale() {
  if (typeof window !== 'undefined') {
    currentLocale = getLocale()
  }
}
