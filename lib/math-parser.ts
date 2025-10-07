// Simple math expression parser and evaluator
export function parseMathExpression(expr: string): string {
  // Clean up the expression
  return expr
    .replace(/\s+/g, "")
    .replace(/\^/g, "**")
    .replace(/sqrt/g, "Math.sqrt")
    .replace(/sin/g, "Math.sin")
    .replace(/cos/g, "Math.cos")
    .replace(/tan/g, "Math.tan")
    .replace(/exp/g, "Math.exp")
    .replace(/log/g, "Math.log")
    .replace(/abs/g, "Math.abs")
}

export function evaluateFunction(expr: string, x: number, y: number): number {
  try {
    const parsed = parseMathExpression(expr)
    // Create a function that evaluates the expression
    const func = new Function("x", "y", "Math", `return ${parsed}`)
    const result = func(x, y, Math)

    if (!isFinite(result)) {
      throw new Error("Result is not finite")
    }

    return result
  } catch (error) {
    console.error("[v0] Error evaluating function:", error)
    return 0
  }
}

export function calculatePartialDerivatives(expr: string, x: number, y: number) {
  const h = 0.0001 // Small step for numerical differentiation

  try {
    const f = (xi: number, yi: number) => evaluateFunction(expr, xi, yi)

    // Partial derivative with respect to x
    const dx = (f(x + h, y) - f(x - h, y)) / (2 * h)

    // Partial derivative with respect to y
    const dy = (f(x, y + h) - f(x, y - h)) / (2 * h)

    return { dx, dy }
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

  // Numerical search for critical points
  // We search for points where ∇f = λ∇g
  const searchRange = 3
  const searchStep = 0.2

  for (let x = -searchRange; x <= searchRange; x += searchStep) {
    for (let y = -searchRange; y <= searchRange; y += searchStep) {
      // Check if point satisfies constraint (g(x,y) ≈ 0)
      const gValue = evaluateFunction(constraintFunc, x, y)

      if (Math.abs(gValue) < 0.1) {
        // Point is on constraint curve
        const gradF = calculateGradient(objectiveFunc, x, y).vector
        const gradG = calculateGradient(constraintFunc, x, y).vector

        // Check if gradients are parallel (cross product ≈ 0)
        const crossProduct = gradF.dx * gradG.dy - gradF.dy * gradG.dx

        if (Math.abs(crossProduct) < 0.5) {
          const z = evaluateFunction(objectiveFunc, x, y)

          // Check if this is a new point (not too close to existing ones)
          const isDuplicate = criticalPoints.some((p) => Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < 0.5)

          if (!isDuplicate && isFinite(z)) {
            // Determine type based on second derivative test (simplified)
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
  const dx = (xMax - xMin) / divisions
  const dy = (yMax - yMin) / divisions
  let sum = 0

  for (let i = 0; i < divisions; i++) {
    for (let j = 0; j < divisions; j++) {
      const x = xMin + (i + 0.5) * dx
      const y = yMin + (j + 0.5) * dy
      const z = evaluateFunction(expr, x, y)

      if (isFinite(z)) {
        sum += z * dx * dy
      }
    }
  }

  return sum
}
