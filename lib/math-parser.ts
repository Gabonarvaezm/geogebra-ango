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

export function evaluateFunction(expr: string, x: number, y: number): number {
  try {
    // Validar sintaxis primero
    const validation = validateExpression(expr)
    if (!validation.valid) {
      console.error("[v0] Validation error:", validation.error)
      return Number.NaN
    }

    const parsed = parseMathExpression(expr)
    const func = new Function("x", "y", "Math", `"use strict"; return ${parsed}`)
    const result = func(x, y, Math)

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
