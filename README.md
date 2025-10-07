# Calculadora de Cálculo Multivariable

Una aplicación web interactiva para visualizar y calcular conceptos de cálculo multivariable en 3D.

## Características

- **Visualización 3D Interactiva**: Gráficas rotables y escalables de funciones de dos variables
- **Derivadas Parciales**: Cálculo automático con visualización de vectores gradiente y planos tangentes
- **Optimización con Restricciones**: Método de multiplicadores de Lagrange
- **Integrales Múltiples**: Cálculo numérico de integrales dobles
- **Exportar y Compartir**: Guarda imágenes PNG y comparte funciones mediante URL

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (versión 18.17 o superior)
  - Descarga desde: https://nodejs.org/
  - Verifica la instalación: `node --version`

- **npm** (incluido con Node.js)
  - Verifica la instalación: `npm --version`

## Instalación

### 1. Instalar Dependencias

Abre una terminal en la carpeta del proyecto y ejecuta:

\`\`\`bash
npm install
\`\`\`

Este comando instalará todas las dependencias necesarias. El proceso puede tomar 1-3 minutos dependiendo de tu conexión a internet.

### 2. Iniciar el Servidor de Desarrollo

Una vez instaladas las dependencias, inicia el servidor:

\`\`\`bash
npm run dev
\`\`\`

### 3. Abrir en el Navegador

El servidor se ejecutará en **http://localhost:3000**

Abre tu navegador y visita esa URL para ver la aplicación.

## Uso de la Aplicación

### Funciones Básicas

1. **Ingresar una Función**
   - Usa el panel lateral para escribir funciones como: `x^2 + y^2`, `sin(x) * cos(y)`, `exp(-(x^2 + y^2))`
   - Operadores disponibles: `+`, `-`, `*`, `/`, `^`, `sqrt()`, `sin()`, `cos()`, `exp()`

2. **Controles de Vista 3D**
   - **Arrastrar**: Rotar la visualización
   - **Scroll**: Hacer zoom
   - **Botones flotantes**: Zoom, resetear vista, rotación automática

3. **Derivadas Parciales**
   - Cambia a la pestaña "Derivadas"
   - Haz clic en cualquier punto de la superficie
   - Verás el vector gradiente (morado) y el plano tangente (cyan)

4. **Optimización**
   - Cambia a la pestaña "Optimización"
   - Define una restricción (ej: `x^2 + y^2 - 1`)
   - Haz clic en "Calcular Puntos Críticos"
   - Los puntos óptimos aparecerán marcados en la gráfica

5. **Integrales**
   - Cambia a la pestaña "Integrales"
   - Define los límites de integración
   - Haz clic en "Calcular Integral"
   - El resultado aparecerá en el panel inferior

### Exportar y Compartir

- **Exportar Imagen**: Menú "Exportar" → "Exportar como PNG"
- **Compartir Función**: Menú "Exportar" → "Compartir enlace" (copia URL al portapapeles)
- **Guardar Configuración**: Menú "Exportar" → "Guardar configuración" (descarga JSON)

## Estructura del Proyecto

\`\`\`
├── app/
│   ├── page.tsx              # Página principal
│   ├── layout.tsx            # Layout de la aplicación
│   └── globals.css           # Estilos globales y tema
├── components/
│   ├── sidebar.tsx           # Panel lateral con controles
│   ├── visualization-3d.tsx  # Motor de visualización 3D
│   ├── results-panel.tsx     # Panel de resultados
│   ├── export-menu.tsx       # Menú de exportación
│   └── theme-toggle.tsx      # Cambio de tema claro/oscuro
├── lib/
│   └── math-parser.ts        # Parser y calculadora matemática
└── README.md                 # Este archivo
\`\`\`

## Solución de Problemas

### Error: "Cannot find module"

\`\`\`bash
# Elimina node_modules y reinstala
rm -rf node_modules
npm install
\`\`\`

### Error: "Port 3000 is already in use"

\`\`\`bash
# Usa un puerto diferente
npm run dev -- -p 3001
\`\`\`

### La visualización no se muestra

- Verifica que tu navegador soporte Canvas 2D
- Intenta refrescar la página (F5)
- Revisa la consola del navegador (F12) para errores

### Errores al evaluar funciones

- Verifica la sintaxis de la función
- Usa paréntesis para operaciones complejas: `(x+1)^2` en lugar de `x+1^2`
- Algunas funciones pueden tener dominios restringidos (ej: `sqrt(x)` requiere x ≥ 0)

## Atajos de Teclado

- **Modo Oscuro**: Botón en la esquina superior derecha
- **Ejemplos Precargados**: Haz clic en las tarjetas del panel lateral

## Tecnologías Utilizadas

- **Next.js 15** - Framework de React
- **TypeScript** - Tipado estático
- **Tailwind CSS v4** - Estilos
- **Canvas 2D API** - Renderizado 3D
- **shadcn/ui** - Componentes de UI

## Soporte

Si encuentras problemas o tienes preguntas:

1. Revisa esta documentación
2. Verifica la consola del navegador para errores
3. Asegúrate de tener la versión correcta de Node.js

## Licencia

Este proyecto fue creado con v0 by Vercel.
