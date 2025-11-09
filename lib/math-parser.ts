// Simple math expression parser and evaluator
export function parseMathExpression(expr: string): string {
  return (
    expr
      .replace(/\s+/g, "")
      // Potencias
      .replace(/\^/g, "**")
      // Funciones matemáticas
      .replace(/sqrt\(/g, "Math.sqrt(")
      .replace(/sin\(/g, "Math.sin(")
      .replace(/cos\(/g, "Math.cos(")
      .replace(/tan\(/g, "Math.tan(")
      .replace(/exp\(/g, "Math.exp(")
      .replace(/log\(/g, "Math.log(")
      .replace(/ln\(/g, "Math.log(")
      .replace(/abs\(/g, "Math.abs(")
      .replace(/asin\(/g, "Math.asin(")
      .replace(/acos\(/g, "Math.acos(")
      .replace(/atan\(/g, "Math.atan(")
      // Constantes
      .replace(/\bpi\b/g, "Math.PI")
      .replace(/\be\b/g, "Math.E")
      // Multiplicación implícita: 2x -> 2*x, xy -> x*y
      .replace(/(\d)([xy])/g, "$1*$2")
      .replace(/([xy])([xy])/g, "$1*$2")
      .replace(/\)(\d|[xy])/g, ")*$1")
      .replace(/(\d|[xy])\(/g, "$1*(")
  )
}

function validateExpression(expr: string): { valid: boolean; error?: string } {
  // Verificar paréntesis balanceados
  let parenthesesCount = 0
  for (const char of expr) {
    if (char === "(") parenthesesCount++
    if (char === ")") parenthesesCount--
    if (parenthesesCount < 0) {
      return { valid: false, error: "Paréntesis no balanceados" }
    }
  }
  if (parenthesesCount !== 0) {
    return { valid: false, error: "Paréntesis no balanceados" }
  }

  // Verificar caracteres válidos
  const validChars = /^[0-9xy+\-*/().\s^a-z]*$/i
  if (!validChars.test(expr)) {
    return { valid: false, error: "Caracteres inválidos en la expresión" }
  }

  return { valid: true }
}

const compiledCache = new Map<string, Function>()

export function evaluateFunction(expr: string, x: number, y: number): number {
  try {
    // Usar compilación y validación en caché para acelerar evaluaciones repetidas
    let func = compiledCache.get(expr)
    if (!func) {
      const validation = validateExpression(expr)
      if (!validation.valid) {
        console.error("[v0] Validation error:", validation.error)
        return Number.NaN
      }
      const parsed = parseMathExpression(expr)
      func = new Function("x", "y", "Math", `"use strict"; return ${parsed}`)
      compiledCache.set(expr, func)
    }

    const result = (func as Function)(x, y, Math)

    // Verificar si el resultado es válido
    if (!isFinite(result)) {
      return Number.NaN
    }

    const Z_MAX = 20
    const Z_MIN = -20

    if (result > Z_MAX) return Z_MAX
    if (result < Z_MIN) return Z_MIN

    return result
  } catch (error) {
    console.error("[v0] Error evaluating function:", error)
    return Number.NaN
  }
}

export function calculatePartialDerivatives(expr: string, x: number, y: number) {
  const h = 0.0001

  try {
    const f = (xi: number, yi: number) => {
      const result = evaluateFunction(expr, xi, yi)
      return isNaN(result) ? 0 : result
    }

    const fx_plus = f(x + h, y)
    const fx_minus = f(x - h, y)
    const fy_plus = f(x, y + h)
    const fy_minus = f(x, y - h)

    const dx = (fx_plus - fx_minus) / (2 * h)
    const dy = (fy_plus - fy_minus) / (2 * h)

    // Verificar que las derivadas sean finitas
    return {
      dx: isFinite(dx) ? dx : 0,
      dy: isFinite(dy) ? dy : 0,
    }
  } catch (error) {
    console.error("[v0] Error calculating derivatives:", error)
    return { dx: 0, dy: 0 }
  }
}

export function calculateGradient(expr: string, x: number, y: number) {
  const { dx, dy } = calculatePartialDerivatives(expr, x, y)
  const magnitude = Math.sqrt(dx * dx + dy * dy)

  return {
    vector: { dx, dy },
    magnitude,
    direction: magnitude > 0 ? { dx: dx / magnitude, dy: dy / magnitude } : { dx: 0, dy: 0 },
  }
}

export function findLagrangeCriticalPoints(
  objectiveFunc: string,
  constraintFunc: string,
): Array<{ x: number; y: number; z: number; type: string }> {
  const criticalPoints: Array<{ x: number; y: number; z: number; type: string }> = []

  const objValidation = validateExpression(objectiveFunc)
  const constValidation = validateExpression(constraintFunc)

  if (!objValidation.valid || !constValidation.valid) {
    console.error("[v0] Invalid functions for Lagrange multipliers")
    return []
  }

  const searchRange = 3
  const searchStep = 0.2

  for (let x = -searchRange; x <= searchRange; x += searchStep) {
    for (let y = -searchRange; y <= searchRange; y += searchStep) {
      const gValue = evaluateFunction(constraintFunc, x, y)

      if (isNaN(gValue)) continue

      if (Math.abs(gValue) < 0.1) {
        const gradF = calculateGradient(objectiveFunc, x, y).vector
        const gradG = calculateGradient(constraintFunc, x, y).vector

        const crossProduct = gradF.dx * gradG.dy - gradF.dy * gradG.dx

        if (Math.abs(crossProduct) < 0.5) {
          const z = evaluateFunction(objectiveFunc, x, y)

          if (isNaN(z)) continue

          const isDuplicate = criticalPoints.some((p) => Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < 0.5)

          if (!isDuplicate && isFinite(z)) {
            const type = z > 0 ? "máximo" : z < 0 ? "mínimo" : "punto de silla"
            criticalPoints.push({ x, y, z, type })
          }
        }
      }
    }
  }

  return criticalPoints
}

export function calculateDoubleIntegral(
  expr: string,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  divisions = 50,
): number {
  const validation = validateExpression(expr)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const dx = (xMax - xMin) / divisions
  const dy = (yMax - yMin) / divisions
  let sum = 0

  for (let i = 0; i < divisions; i++) {
    for (let j = 0; j < divisions; j++) {
      const x = xMin + (i + 0.5) * dx
      const y = yMin + (j + 0.5) * dy
      const z = evaluateFunction(expr, x, y)

      if (!isNaN(z) && isFinite(z)) {
        sum += z * dx * dy
      }
    }
  }

  return sum
}

// Cálculo de volumen: integral doble del valor absoluto
// Volumen ≈ ∬ |f(x,y)| dA en la región [xMin,xMax]×[yMin,yMax]
export function calculateDoubleIntegralAbs(
  expr: string,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  divisions = 50,
): number {
  const validation = validateExpression(expr)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const dx = (xMax - xMin) / divisions
  const dy = (yMax - yMin) / divisions
  let sum = 0

  for (let i = 0; i < divisions; i++) {
    for (let j = 0; j < divisions; j++) {
      const x = xMin + (i + 0.5) * dx
      const y = yMin + (j + 0.5) * dy
      const z = evaluateFunction(expr, x, y)

      if (!isNaN(z) && isFinite(z)) {
        sum += Math.abs(z) * dx * dy
      }
    }
  }

  return sum
}

export function calculateDomainAndRange(
  expr: string,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
): {
  domain: string
  range: { min: number; max: number }
  hasRestrictions: boolean
  restrictions: string[]
} {
  const restrictions: string[] = []
  let hasRestrictions = false

  // Detectar restricciones comunes
  if (expr.includes("sqrt")) {
    restrictions.push("Argumento de √ debe ser ≥ 0")
    hasRestrictions = true
  }
  if (expr.includes("log") || expr.includes("ln")) {
    restrictions.push("Argumento de log debe ser > 0")
    hasRestrictions = true
  }
  if (expr.includes("/")) {
    restrictions.push("Denominador debe ser ≠ 0")
    hasRestrictions = true
  }

  // Calcular rango evaluando en una malla
  let minZ = Number.POSITIVE_INFINITY
  let maxZ = Number.NEGATIVE_INFINITY
  const samples = 30

  for (let i = 0; i <= samples; i++) {
    for (let j = 0; j <= samples; j++) {
      const x = xMin + (i / samples) * (xMax - xMin)
      const y = yMin + (j / samples) * (yMax - yMin)
      const z = evaluateFunction(expr, x, y)

      if (isFinite(z) && !isNaN(z)) {
        minZ = Math.min(minZ, z)
        maxZ = Math.max(maxZ, z)
      }
    }
  }

  const domain = hasRestrictions ? "ℝ² con restricciones" : "ℝ²"

  return {
    domain,
    range: { min: minZ, max: maxZ },
    hasRestrictions,
    restrictions,
  }
}

export function calculateLimit(
  expr: string,
  x0: number,
  y0: number,
  direction: "all" | "x" | "y" | "diagonal",
): {
  exists: boolean
  value: number | null
  leftLimit?: number
  rightLimit?: number
  message: string
} {
  const h = 0.001
  const tolerance = 0.01

  try {
    if (direction === "all") {
      // Calcular límite desde varias direcciones
      const centerValue = evaluateFunction(expr, x0, y0)
      const fromRight = evaluateFunction(expr, x0 + h, y0)
      const fromLeft = evaluateFunction(expr, x0 - h, y0)
      const fromTop = evaluateFunction(expr, x0, y0 + h)
      const fromBottom = evaluateFunction(expr, x0, y0 - h)
      const fromDiag1 = evaluateFunction(expr, x0 + h, y0 + h)
      const fromDiag2 = evaluateFunction(expr, x0 - h, y0 - h)

      const values = [fromRight, fromLeft, fromTop, fromBottom, fromDiag1, fromDiag2].filter(
        (v) => isFinite(v) && !isNaN(v),
      )

      if (values.length === 0) {
        return {
          exists: false,
          value: null,
          message: "El límite no existe (función no definida cerca del punto)",
        }
      }

      const avg = values.reduce((a, b) => a + b, 0) / values.length
      const allClose = values.every((v) => Math.abs(v - avg) < tolerance)

      if (allClose) {
        return {
          exists: true,
          value: avg,
          message: `lim(x,y)→(${x0},${y0}) f(x,y) = ${avg.toFixed(4)}`,
        }
      } else {
        return {
          exists: false,
          value: null,
          message: "El límite no existe (diferentes valores desde distintas direcciones)",
        }
      }
    } else if (direction === "x") {
      const leftLimit = evaluateFunction(expr, x0 - h, y0)
      const rightLimit = evaluateFunction(expr, x0 + h, y0)

      if (Math.abs(leftLimit - rightLimit) < tolerance) {
        return {
          exists: true,
          value: (leftLimit + rightLimit) / 2,
          leftLimit,
          rightLimit,
          message: `Límite en dirección x = ${((leftLimit + rightLimit) / 2).toFixed(4)}`,
        }
      } else {
        return {
          exists: false,
          value: null,
          leftLimit,
          rightLimit,
          message: "Límites laterales diferentes",
        }
      }
    }

    return {
      exists: false,
      value: null,
      message: "Dirección no implementada",
    }
  } catch (error) {
    return {
      exists: false,
      value: null,
      message: "Error al calcular el límite",
    }
  }
}

export function calculateCenterOfMass(
  densityFunc: string,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  divisions = 50,
): {
  mass: number
  centerX: number
  centerY: number
  momentX: number
  momentY: number
} {
  const dx = (xMax - xMin) / divisions
  const dy = (yMax - yMin) / divisions
  let mass = 0
  let momentX = 0 // Momento respecto al eje X (integral de y*ρ)
  let momentY = 0 // Momento respecto al eje Y (integral de x*ρ)

  for (let i = 0; i < divisions; i++) {
    for (let j = 0; j < divisions; j++) {
      const x = xMin + (i + 0.5) * dx
      const y = yMin + (j + 0.5) * dy
      const density = evaluateFunction(densityFunc, x, y)

      if (!isNaN(density) && isFinite(density) && density > 0) {
        const dA = dx * dy
        mass += density * dA
        momentX += y * density * dA
        momentY += x * density * dA
      }
    }
  }

  return {
    mass,
    centerX: mass > 0 ? momentY / mass : 0,
    centerY: mass > 0 ? momentX / mass : 0,
    momentX,
    momentY,
  }
}

export function calculateTripleIntegral(
  expr: string,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  zMin: number,
  zMax: number,
  divisions = 20,
): number {
  const validation = validateExpression(expr)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const dx = (xMax - xMin) / divisions
  const dy = (yMax - yMin) / divisions
  const dz = (zMax - zMin) / divisions
  let sum = 0

  for (let i = 0; i < divisions; i++) {
    for (let j = 0; j < divisions; j++) {
      for (let k = 0; k < divisions; k++) {
        const x = xMin + (i + 0.5) * dx
        const y = yMin + (j + 0.5) * dy
        const z = zMin + (k + 0.5) * dz

        // Para integral triple, evaluamos la función en 3D
        // Asumimos que la expresión puede contener x, y, z
        const exprWithZ = expr.replace(/\bz\b/g, z.toString())
        const value = evaluateFunction(exprWithZ, x, y)

        if (!isNaN(value) && isFinite(value)) {
          sum += value * dx * dy * dz
        }
      }
    }
  }

  return sum
}
