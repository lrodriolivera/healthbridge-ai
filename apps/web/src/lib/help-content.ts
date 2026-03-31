/**
 * Help content for each page — Spanish and English
 */

export const helpContent = {
  projects: {
    es: {
      title: '¿Cómo usar Proyectos?',
      steps: [
        'Haz clic en "Nuevo Proyecto" para crear un proyecto de migración.',
        'Selecciona las plataformas origen (Mirth, Oracle SOA, etc.) de donde vienen tus integraciones.',
        'Dale un nombre descriptivo al proyecto (ej: "Migración ADT UC CHRISTUS").',
        'Una vez creado, haz clic en el proyecto para comenzar a subir archivos.',
        'Cada proyecto representa una migración completa: desde el análisis hasta el deploy en IRIS.',
      ],
    },
    en: {
      title: 'How to use Projects?',
      steps: [
        'Click "New Project" to create a migration project.',
        'Select the source platforms (Mirth, Oracle SOA, etc.) where your integrations come from.',
        'Give it a descriptive name (e.g., "ADT Migration UC CHRISTUS").',
        'Once created, click on the project to start uploading files.',
        'Each project represents a complete migration: from analysis to IRIS deployment.',
      ],
    },
  },

  projectDetail: {
    es: {
      title: '¿Qué puedo hacer aquí?',
      steps: [
        'Esta es la vista general de tu proyecto de migración.',
        'Ve a "Archivos" para subir JARs, XMLs u otros archivos fuente.',
        'Ve a "Componentes" para ver los resultados del análisis con IA.',
        'Ve a "Mapeos" para ver y editar los mapeos origen → IRIS.',
        'Ve a "Código Generado" para ver las clases ObjectScript generadas.',
        'Ve a "Deploy" para desplegar el código a tu servidor IRIS.',
        'Ve a "Tests" para ejecutar pruebas de integración.',
      ],
    },
    en: {
      title: 'What can I do here?',
      steps: [
        'This is the overview of your migration project.',
        'Go to "Files" to upload JARs, XMLs or other source files.',
        'Go to "Components" to see AI analysis results.',
        'Go to "Mappings" to view and edit source → IRIS mappings.',
        'Go to "Generated Code" to view generated ObjectScript classes.',
        'Go to "Deploy" to deploy code to your IRIS server.',
        'Go to "Tests" to execute integration tests.',
      ],
    },
  },

  uploads: {
    es: {
      title: '¿Cómo subir y analizar archivos?',
      steps: [
        'Arrastra y suelta tus archivos en la zona de upload, o haz clic para buscar.',
        'Formatos soportados: .jar (Oracle SOA), .xml (Mirth Connect), .zip, imágenes.',
        'Cada archivo aparecerá en la lista con su tipo y tamaño.',
        'Haz clic en "Analyze" junto a un archivo para analizarlo individualmente.',
        'O haz clic en "Analyze All" para analizar todos los archivos a la vez.',
        'El análisis usa Claude Opus 4.6 y toma 30-120 segundos por archivo.',
        'Cuando termine, ve a "Componentes" para ver los resultados.',
      ],
    },
    en: {
      title: 'How to upload and analyze files?',
      steps: [
        'Drag and drop your files to the upload zone, or click to browse.',
        'Supported formats: .jar (Oracle SOA), .xml (Mirth Connect), .zip, images.',
        'Each file will appear in the list with its type and size.',
        'Click "Analyze" next to a file to analyze it individually.',
        'Or click "Analyze All" to analyze all files at once.',
        'Analysis uses Claude Opus 4.6 and takes 30-120 seconds per file.',
        'When done, go to "Components" to see the results.',
      ],
    },
  },

  components: {
    es: {
      title: '¿Qué son los Componentes?',
      steps: [
        'Los componentes son las integraciones descubiertas por el análisis de IA.',
        'Cada componente muestra: nombre, tipo (Mirth channel, SOA composite), complejidad.',
        'La complejidad indica cuán difícil será la migración: low, medium, high, very_high.',
        'Haz clic en un componente para ver el análisis detallado.',
        'El detalle muestra: servicios expuestos, referencias externas, mensajes HL7.',
        'También muestra la propuesta de mapeo a clases IRIS (BS, BP, BO, DTL, MSG).',
      ],
    },
    en: {
      title: 'What are Components?',
      steps: [
        'Components are integrations discovered by the AI analysis.',
        'Each component shows: name, type (Mirth channel, SOA composite), complexity.',
        'Complexity indicates migration difficulty: low, medium, high, very_high.',
        'Click on a component to see the detailed analysis.',
        'Detail shows: exposed services, external references, HL7 messages.',
        'It also shows the proposed IRIS class mapping (BS, BP, BO, DTL, MSG).',
      ],
    },
  },

  mappings: {
    es: {
      title: '¿Cómo funcionan los Mapeos?',
      steps: [
        'Los mapeos definen qué clase IRIS se generará para cada componente origen.',
        'Haz clic en "Auto-Generate Mappings" para crear mapeos automáticamente desde el análisis.',
        'Los mapeos se crean y confirman automáticamente.',
        'Puedes editar cada mapeo: cambiar el nombre de clase, tipo, o capa IRIS.',
        'El diagrama de flujo muestra: Origen → Transformaciones → Clases IRIS.',
        'Los segmentos HL7 resaltados en teal son los que participan en transformaciones.',
        'Cuando estés listo, haz clic en "Generate All Code" para generar ObjectScript.',
      ],
    },
    en: {
      title: 'How do Mappings work?',
      steps: [
        'Mappings define which IRIS class will be generated for each source component.',
        'Click "Auto-Generate Mappings" to create mappings automatically from analysis.',
        'Mappings are created and confirmed automatically.',
        'You can edit each mapping: change class name, type, or IRIS layer.',
        'The flow diagram shows: Source → Transformations → IRIS Classes.',
        'HL7 segments highlighted in teal participate in transformations.',
        'When ready, click "Generate All Code" to generate ObjectScript.',
      ],
    },
  },

  generated: {
    es: {
      title: '¿Cómo funciona el Código Generado?',
      steps: [
        'Aquí ves todas las clases ObjectScript generadas por Claude AI.',
        'Cada clase muestra su estado de validación: verde (aprobado) o rojo (falló).',
        'La barra de progreso muestra el avance cuando la generación está en proceso.',
        'Haz clic en una clase para ver el código en el editor Monaco.',
        'Puedes descargar una clase individual o todas en un ZIP.',
        'Si una clase falló validación, puedes "Regenerar" con feedback específico.',
        'Las clases aprobadas están listas para desplegar a IRIS.',
      ],
    },
    en: {
      title: 'How does Generated Code work?',
      steps: [
        'Here you see all ObjectScript classes generated by Claude AI.',
        'Each class shows validation status: green (passed) or red (failed).',
        'The progress bar shows progress when generation is running.',
        'Click a class to view the code in the Monaco editor.',
        'You can download an individual class or all as a ZIP.',
        'If a class failed validation, you can "Regenerate" with specific feedback.',
        'Passed classes are ready to deploy to IRIS.',
      ],
    },
  },

  deploy: {
    es: {
      title: '¿Cómo desplegar a IRIS?',
      steps: [
        'Primero, asegúrate de tener una conexión IRIS configurada en "Conexiones IRIS".',
        'Paso 1: Selecciona la conexión IRIS destino y prueba la conectividad.',
        'Paso 2: Revisa las clases que se desplegarán y su orden de compilación.',
        'Paso 3: Opcional — marca "Generate Production.cls" para crear la clase de producción.',
        'Paso 4: Haz clic en "Deploy" para iniciar el despliegue.',
        'El sistema despliega en orden: MSG → BO → BP → BS → DTL → Production.',
        'Paso 5: Revisa los resultados — cada clase muestra si se desplegó correctamente.',
      ],
    },
    en: {
      title: 'How to deploy to IRIS?',
      steps: [
        'First, make sure you have an IRIS connection configured in "IRIS Connections".',
        'Step 1: Select the target IRIS connection and test connectivity.',
        'Step 2: Review the classes to be deployed and their compilation order.',
        'Step 3: Optional — check "Generate Production.cls" to create the production class.',
        'Step 4: Click "Deploy" to start the deployment.',
        'The system deploys in order: MSG → BO → BP → BS → DTL → Production.',
        'Step 5: Review results — each class shows whether it deployed successfully.',
      ],
    },
  },

  tests: {
    es: {
      title: '¿Cómo ejecutar pruebas?',
      steps: [
        'Crea casos de prueba con mensajes HL7 o requests HTTP/SOAP.',
        'Para MLLP: ingresa el host, puerto, y mensaje HL7 (ej: ADT^A01).',
        'Puedes importar mensajes HL7 en lote usando "Import HL7".',
        'Define la respuesta esperada (ej: "AA" para ACK positivo).',
        'Selecciona la conexión IRIS y haz clic en "Run All Tests".',
        'Los resultados muestran: estado (pass/fail), ACK code, tiempo de respuesta.',
        'Expande cada resultado para ver la respuesta HL7 completa con segmentos coloreados.',
      ],
    },
    en: {
      title: 'How to run tests?',
      steps: [
        'Create test cases with HL7 messages or HTTP/SOAP requests.',
        'For MLLP: enter host, port, and HL7 message (e.g., ADT^A01).',
        'You can bulk-import HL7 messages using "Import HL7".',
        'Define the expected response (e.g., "AA" for positive ACK).',
        'Select the IRIS connection and click "Run All Tests".',
        'Results show: status (pass/fail), ACK code, response time.',
        'Expand each result to see the full HL7 response with colored segments.',
      ],
    },
  },

  irisConnections: {
    es: {
      title: '¿Cómo configurar conexiones IRIS?',
      steps: [
        'Haz clic en "Add Connection" para agregar un servidor IRIS.',
        'Ingresa: nombre, URL del servidor (ej: http://iris:57772), namespace, usuario y contraseña.',
        'Selecciona el ambiente: dev, test, o production.',
        'Las credenciales se almacenan cifradas en la base de datos.',
        'Usa el botón "Test" para verificar la conectividad.',
        'Si la prueba es exitosa, podrás usar esta conexión para deploy y testing.',
      ],
    },
    en: {
      title: 'How to configure IRIS connections?',
      steps: [
        'Click "Add Connection" to add an IRIS server.',
        'Enter: name, server URL (e.g., http://iris:57772), namespace, username and password.',
        'Select the environment: dev, test, or production.',
        'Credentials are stored encrypted in the database.',
        'Use the "Test" button to verify connectivity.',
        'If the test succeeds, you can use this connection for deploy and testing.',
      ],
    },
  },

  settings: {
    es: {
      title: '¿Qué puedo configurar?',
      steps: [
        'Organización: nombre, namespace IRIS por defecto, retención de datos.',
        'Modelos IA: elige qué modelo Claude usar para análisis, generación, y validación.',
        'Notificaciones: configura un webhook URL para recibir eventos (análisis, deploy, tests).',
        'Perfil: cambia tu email o contraseña.',
      ],
    },
    en: {
      title: 'What can I configure?',
      steps: [
        'Organization: name, default IRIS namespace, data retention.',
        'AI Models: choose which Claude model for analysis, generation, and validation.',
        'Notifications: configure a webhook URL to receive events (analysis, deploy, tests).',
        'Profile: change your email or password.',
      ],
    },
  },

  admin: {
    es: {
      title: '¿Cómo administrar la plataforma?',
      steps: [
        'Solo el administrador de la plataforma puede acceder a esta sección.',
        'Tenants: ve la lista de organizaciones, sus planes, y estado.',
        'Crear Tenant: registra una nueva organización con su administrador y plan.',
        'Crear Usuario: agrega usuarios a una organización existente.',
        'Planes: revisa los límites de cada plan (trial, starter, professional, enterprise).',
        'Puedes cambiar el plan de un tenant o desactivarlo desde la tabla.',
      ],
    },
    en: {
      title: 'How to manage the platform?',
      steps: [
        'Only the platform administrator can access this section.',
        'Tenants: see the list of organizations, their plans, and status.',
        'Create Tenant: register a new organization with its admin and plan.',
        'Create User: add users to an existing organization.',
        'Plans: review the limits of each plan (trial, starter, professional, enterprise).',
        'You can change a tenant plan or deactivate it from the table.',
      ],
    },
  },

  auditLog: {
    es: {
      title: '¿Qué es el Registro de Auditoría?',
      steps: [
        'Aquí se registran todas las acciones realizadas en la plataforma.',
        'Cada entrada muestra: acción, recurso, usuario, IP, fecha.',
        'Puedes filtrar por tipo de recurso (project, mapping, deploy, etc.).',
        'Puedes filtrar por acción (create, update, delete).',
        'Este registro es requerido para cumplimiento HIPAA.',
      ],
    },
    en: {
      title: 'What is the Audit Log?',
      steps: [
        'All actions performed on the platform are recorded here.',
        'Each entry shows: action, resource, user, IP, date.',
        'You can filter by resource type (project, mapping, deploy, etc.).',
        'You can filter by action (create, update, delete).',
        'This log is required for HIPAA compliance.',
      ],
    },
  },

  export: {
    es: {
      title: '¿Cómo exportar documentación?',
      steps: [
        'Descarga la documentación de tu proyecto en Markdown o PDF.',
        'El documento incluye: resumen, componentes, mapeos, clases generadas, y resultados de tests.',
        'Usa "Download Documentation" para el formato Markdown.',
        'Usa "Download PDF" para un documento formal con tablas y formato profesional.',
        'El resumen muestra estadísticas del proyecto y progreso del pipeline.',
      ],
    },
    en: {
      title: 'How to export documentation?',
      steps: [
        'Download your project documentation in Markdown or PDF.',
        'The document includes: summary, components, mappings, generated classes, and test results.',
        'Use "Download Documentation" for Markdown format.',
        'Use "Download PDF" for a formal document with tables and professional layout.',
        'The summary shows project statistics and pipeline progress.',
      ],
    },
  },
}
