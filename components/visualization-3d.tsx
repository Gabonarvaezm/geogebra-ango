"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { RotateCcw, ZoomIn, ZoomOut, Play, Pause, Grid3x3, Box } from "lucide-react"
import { evaluateFunction, calculateGradient } from "@/lib/math-parser"

interface Visualization3DProps {
  functionStr: string
  selectedPoint: { x: number; y: number; z: number } | null
  onPointSelect: (point: { x: number; y: number; z: number } | null) => void
  activeTab: "function" | "derivatives" | "optimization" | "integrals"
  constraintFunction: string
  criticalPoints: Array<{ x: number; y: number; z: number; type: string }>
  integralBounds: { xMin: number; xMax: number; yMin: number; yMax: number } | null
  xRange: [number, number]
  yRange: [number, number]
}

export function Visualization3D({
  functionStr,
  selectedPoint,
  onPointSelect,
  activeTab,
  constraintFunction,
  criticalPoints,
  integralBounds,
  xRange,
  yRange,
}: Visualization3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rotation, setRotation] = useState({ x: 0.6, y: 0.8 })
  const [zoom, setZoom] = useState(1.2)
  const [isAnimating, setIsAnimating] = useState(false)
  const [viewMode, setViewMode] = useState<"surface" | "wireframe">("surface")
  const [showGradient, setShowGradient] = useState(true)
  const [showTangentPlane, setShowTangentPlane] = useState(true)
  const [hasInfiniteValues, setHasInfiniteValues] = useState(false)
  const animationRef = useRef<number>()
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  const generateSurfaceData = () => {
    const resolution = 60 // Aumentado de 50 a 60 para más detalle
    const [xMin, xMax] = xRange
    const [yMin, yMax] = yRange
    const xStep = (xMax - xMin) / resolution
    const yStep = (yMax - yMin) / resolution
    const points: { x: number; y: number; z: number }[] = []
    let infiniteCount = 0
    let minZ = Number.POSITIVE_INFINITY
    let maxZ = Number.NEGATIVE_INFINITY

    try {
      for (let i = 0; i <= resolution; i++) {
        for (let j = 0; j <= resolution; j++) {
          const x = xMin + i * xStep
          const y = yMin + j * yStep
          let z = evaluateFunction(functionStr, x, y)

          if (isNaN(z)) {
            infiniteCount++
            continue
          }

          if (!isFinite(z)) {
            infiniteCount++
            z = z > 0 ? 20 : -20 // Limitar a ±20
          } else {
            z = Math.max(-20, Math.min(20, z)) // Asegurar que esté dentro de límites
          }

          minZ = Math.min(minZ, z)
          maxZ = Math.max(maxZ, z)
          points.push({ x, y, z })
        }
      }

      setHasInfiniteValues(infiniteCount > resolution * resolution * 0.1)
    } catch (error) {
      console.error("[v0] Error generating surface:", error)
    }

    return { points, minZ, maxZ }
  }

  const project3D = (x: number, y: number, z: number, width: number, height: number) => {
    const scale = 30 * zoom
    const cosX = Math.cos(rotation.x)
    const sinX = Math.sin(rotation.x)
    const cosY = Math.cos(rotation.y)
    const sinY = Math.sin(rotation.y)

    const x1 = x * cosY - z * sinY
    const z1 = x * sinY + z * cosY

    const y1 = y * cosX - z1 * sinX
    const z2 = y * sinX + z1 * cosX

    const screenX = width / 2 + x1 * scale
    const screenY = height / 2 - y1 * scale

    return { x: screenX, y: screenY, depth: z2 }
  }

  const drawBackgroundPlanes = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const [xMin, xMax] = xRange
    const [yMin, yMax] = yRange
    const zMin = -20
    const zMax = 20

    // Plano XY (fondo)
    ctx.fillStyle = "rgba(240, 240, 245, 0.15)"
    ctx.strokeStyle = "rgba(150, 150, 160, 0.4)"
    ctx.lineWidth = 1

    // Dibujar cuadrícula en plano XY
    const gridSteps = 10
    for (let i = 0; i <= gridSteps; i++) {
      const x = xMin + (i / gridSteps) * (xMax - xMin)
      const start = project3D(x, yMin, zMin, width, height)
      const end = project3D(x, yMax, zMin, width, height)
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
    }

    for (let i = 0; i <= gridSteps; i++) {
      const y = yMin + (i / gridSteps) * (yMax - yMin)
      const start = project3D(xMin, y, zMin, width, height)
      const end = project3D(xMax, y, zMin, width, height)
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
    }

    // Plano YZ (lateral izquierdo)
    ctx.fillStyle = "rgba(240, 240, 245, 0.08)"
    for (let i = 0; i <= gridSteps; i++) {
      const y = yMin + (i / gridSteps) * (yMax - yMin)
      const start = project3D(xMin, y, zMin, width, height)
      const end = project3D(xMin, y, zMax, width, height)
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
    }

    for (let i = 0; i <= gridSteps; i++) {
      const z = zMin + (i / gridSteps) * (zMax - zMin)
      const start = project3D(xMin, yMin, z, width, height)
      const end = project3D(xMin, yMax, z, width, height)
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
    }

    // Plano XZ (lateral derecho)
    for (let i = 0; i <= gridSteps; i++) {
      const x = xMin + (i / gridSteps) * (xMax - xMin)
      const start = project3D(x, yMin, zMin, width, height)
      const end = project3D(x, yMin, zMax, width, height)
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
    }
  }

  const drawAxesWithLabels = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const [xMin, xMax] = xRange
    const [yMin, yMax] = yRange
    const origin = project3D(0, 0, 0, width, height)

    // Eje X (rojo)
    const xEnd = project3D(xMax, 0, 0, width, height)
    ctx.strokeStyle = "rgba(220, 38, 38, 0.9)"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(origin.x, origin.y)
    ctx.lineTo(xEnd.x, xEnd.y)
    ctx.stroke()

    ctx.fillStyle = "rgba(220, 38, 38, 1)"
    ctx.font = "bold 18px sans-serif"
    ctx.fillText("X", xEnd.x + 15, xEnd.y + 5)

    // Números en eje X
    ctx.font = "13px sans-serif"
    const xSteps = 5
    for (let i = 0; i <= xSteps; i++) {
      const x = xMin + (i / xSteps) * (xMax - xMin)
      const pos = project3D(x, 0, 0, width, height)
      ctx.fillText(x.toFixed(1), pos.x, pos.y + 20)
    }

    // Eje Y (verde)
    const yEnd = project3D(0, yMax, 0, width, height)
    ctx.strokeStyle = "rgba(34, 197, 94, 0.9)"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(origin.x, origin.y)
    ctx.lineTo(yEnd.x, yEnd.y)
    ctx.stroke()

    ctx.fillStyle = "rgba(34, 197, 94, 1)"
    ctx.font = "bold 18px sans-serif"
    ctx.fillText("Y", yEnd.x - 25, yEnd.y + 5)

    // Números en eje Y
    ctx.font = "13px sans-serif"
    const ySteps = 5
    for (let i = 0; i <= ySteps; i++) {
      const y = yMin + (i / ySteps) * (yMax - yMin)
      const pos = project3D(0, y, 0, width, height)
      ctx.fillText(y.toFixed(1), pos.x - 30, pos.y + 5)
    }

    // Eje Z (azul)
    const zEnd = project3D(0, 0, 20, width, height)
    ctx.strokeStyle = "rgba(59, 130, 246, 0.9)"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(origin.x, origin.y)
    ctx.lineTo(zEnd.x, zEnd.y)
    ctx.stroke()

    ctx.fillStyle = "rgba(59, 130, 246, 1)"
    ctx.font = "bold 18px sans-serif"
    ctx.fillText("Z", zEnd.x - 10, zEnd.y - 15)

    // Números en eje Z
    ctx.font = "13px sans-serif"
    const zSteps = 5
    for (let i = 0; i <= zSteps; i++) {
      const z = -20 + (i / zSteps) * 40
      const pos = project3D(0, 0, z, width, height)
      ctx.fillText(z.toFixed(0), pos.x + 15, pos.y)
    }
  }

  const drawIntegrationRegion = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!integralBounds || activeTab !== "integrals") return

    const { xMin, xMax, yMin, yMax } = integralBounds

    const corners = [
      { x: xMin, y: yMin, z: 0 },
      { x: xMax, y: yMin, z: 0 },
      { x: xMax, y: yMax, z: 0 },
      { x: xMin, y: yMax, z: 0 },
    ]

    const projectedCorners = corners.map((c) => project3D(c.x, c.y, c.z, width, height))

    ctx.strokeStyle = "oklch(0.7 0.19 195)"
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(projectedCorners[0].x, projectedCorners[0].y)
    for (let i = 1; i < projectedCorners.length; i++) {
      ctx.lineTo(projectedCorners[i].x, projectedCorners[i].y)
    }
    ctx.closePath()
    ctx.stroke()
    ctx.setLineDash([])

    corners.forEach((corner) => {
      const z = evaluateFunction(functionStr, corner.x, corner.y)
      if (isFinite(z)) {
        const bottom = project3D(corner.x, corner.y, 0, width, height)
        const top = project3D(corner.x, corner.y, z, width, height)

        ctx.strokeStyle = "oklch(0.6 0.22 285)"
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(bottom.x, bottom.y)
        ctx.lineTo(top.x, top.y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    })
  }

  const drawTangentPlane = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!selectedPoint || !showTangentPlane || activeTab !== "derivatives") return

    try {
      const { dx, dy } = calculateGradient(functionStr, selectedPoint.x, selectedPoint.y).vector
      const { x: x0, y: y0, z: z0 } = selectedPoint

      const planeSize = 2
      const corners = [
        { x: x0 - planeSize, y: y0 - planeSize },
        { x: x0 + planeSize, y: y0 - planeSize },
        { x: x0 + planeSize, y: y0 + planeSize },
        { x: x0 - planeSize, y: y0 + planeSize },
      ]

      const projectedCorners = corners.map((corner) => {
        const z = z0 + dx * (corner.x - x0) + dy * (corner.y - y0)
        return project3D(corner.x, corner.y, z, width, height)
      })

      ctx.fillStyle = "rgba(6, 182, 212, 0.2)"
      ctx.strokeStyle = "rgba(6, 182, 212, 0.6)"
      ctx.lineWidth = 2

      ctx.beginPath()
      ctx.moveTo(projectedCorners[0].x, projectedCorners[0].y)
      for (let i = 1; i < projectedCorners.length; i++) {
        ctx.lineTo(projectedCorners[i].x, projectedCorners[i].y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } catch (error) {
      console.error("[v0] Error drawing tangent plane:", error)
    }
  }

  const drawGradientVector = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!selectedPoint || !showGradient || activeTab !== "derivatives") return

    try {
      const gradient = calculateGradient(functionStr, selectedPoint.x, selectedPoint.y)
      const { dx, dy } = gradient.vector
      const scale = 0.5

      const start = project3D(selectedPoint.x, selectedPoint.y, selectedPoint.z, width, height)

      const endX = selectedPoint.x + dx * scale
      const endY = selectedPoint.y + dy * scale
      const endZ = selectedPoint.z + gradient.magnitude * scale
      const end = project3D(endX, endY, endZ, width, height)

      ctx.strokeStyle = "oklch(0.6 0.22 285)"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()

      const angle = Math.atan2(end.y - start.y, end.x - start.x)
      const arrowLength = 10
      ctx.fillStyle = "oklch(0.6 0.22 285)"
      ctx.beginPath()
      ctx.moveTo(end.x, end.y)
      ctx.lineTo(
        end.x - arrowLength * Math.cos(angle - Math.PI / 6),
        end.y - arrowLength * Math.sin(angle - Math.PI / 6),
      )
      ctx.lineTo(
        end.x - arrowLength * Math.cos(angle + Math.PI / 6),
        end.y - arrowLength * Math.sin(angle + Math.PI / 6),
      )
      ctx.closePath()
      ctx.fill()
    } catch (error) {
      console.error("[v0] Error drawing gradient vector:", error)
    }
  }

  const drawConstraintCurve = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (activeTab !== "optimization" || !constraintFunction) return

    const resolution = 100
    const [xMin, xMax] = xRange
    const [yMin, yMax] = yRange
    const xStep = (xMax - xMin) / resolution
    const yStep = (yMax - yMin) / resolution

    ctx.strokeStyle = "oklch(0.7 0.19 195)"
    ctx.lineWidth = 3

    let isDrawing = false

    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const x = xMin + i * xStep
        const y = yMin + j * yStep
        const g = evaluateFunction(constraintFunction, x, y)

        if (isNaN(g)) continue

        if (Math.abs(g) < 0.1) {
          const z = evaluateFunction(functionStr, x, y)
          if (!isNaN(z) && isFinite(z)) {
            const proj = project3D(x, y, z, width, height)

            if (!isDrawing) {
              ctx.beginPath()
              ctx.moveTo(proj.x, proj.y)
              isDrawing = true
            } else {
              ctx.lineTo(proj.x, proj.y)
            }
          }
        }
      }
    }

    if (isDrawing) {
      ctx.stroke()
    }
  }

  const drawCriticalPoints = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (activeTab !== "optimization") return

    criticalPoints.forEach((point) => {
      const proj = project3D(point.x, point.y, point.z, width, height)

      ctx.fillStyle = point.type === "máximo" ? "oklch(0.65 0.20 140)" : "oklch(0.60 0.25 30)"
      ctx.beginPath()
      ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = "oklch(0.99 0.005 240)"
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = "oklch(0.15 0.02 240)"
      ctx.font = "12px sans-serif"
      ctx.fillText(point.type, proj.x + 12, proj.y - 12)
    })
  }

  const render = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--color-background") || "#ffffff"
    ctx.fillRect(0, 0, width, height)

    const { points, minZ, maxZ } = generateSurfaceData()

    if (points.length === 0) {
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--color-muted-foreground") || "#666666"
      ctx.font = "16px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("Error: Función inválida o sin valores finitos", width / 2, height / 2)
      return
    }

    drawBackgroundPlanes(ctx, width, height)

    const projectedPoints = points.map((p) => ({
      ...p,
      projected: project3D(p.x, p.y, p.z, width, height),
    }))

    projectedPoints.sort((a, b) => a.projected.depth - b.projected.depth)

    const resolution = Math.sqrt(points.length)

    for (let i = 0; i < resolution - 1; i++) {
      for (let j = 0; j < resolution - 1; j++) {
        const idx = i * resolution + j
        const p1 = projectedPoints[idx]
        const p2 = projectedPoints[idx + 1]
        const p3 = projectedPoints[idx + resolution]
        const p4 = projectedPoints[idx + resolution + 1]

        if (!p1 || !p2 || !p3 || !p4) continue

        const avgZ = (p1.z + p2.z + p3.z + p4.z) / 4
        const normalizedZ = (avgZ - minZ) / (maxZ - minZ || 1)

        // Gradiente de colores: azul → cyan → verde → amarillo → rojo
        let hue, saturation, lightness
        if (normalizedZ < 0.25) {
          // Azul a Cyan
          const t = normalizedZ / 0.25
          hue = 240 - t * 45 // 240 (azul) a 195 (cyan)
          saturation = 0.7 + t * 0.1
          lightness = 0.45 + t * 0.1
        } else if (normalizedZ < 0.5) {
          // Cyan a Verde
          const t = (normalizedZ - 0.25) / 0.25
          hue = 195 - t * 55 // 195 (cyan) a 140 (verde)
          saturation = 0.8
          lightness = 0.55 + t * 0.05
        } else if (normalizedZ < 0.75) {
          // Verde a Amarillo
          const t = (normalizedZ - 0.5) / 0.25
          hue = 140 - t * 80 // 140 (verde) a 60 (amarillo)
          saturation = 0.8 - t * 0.1
          lightness = 0.6 + t * 0.05
        } else {
          // Amarillo a Rojo
          const t = (normalizedZ - 0.75) / 0.25
          hue = 60 - t * 60 // 60 (amarillo) a 0 (rojo)
          saturation = 0.7 + t * 0.2
          lightness = 0.65 - t * 0.1
        }

        // Dibujar cara con relleno
        if (viewMode === "surface") {
          ctx.fillStyle = `oklch(${lightness} ${saturation} ${hue})`
          ctx.beginPath()
          ctx.moveTo(p1.projected.x, p1.projected.y)
          ctx.lineTo(p2.projected.x, p2.projected.y)
          ctx.lineTo(p4.projected.x, p4.projected.y)
          ctx.lineTo(p3.projected.x, p3.projected.y)
          ctx.closePath()
          ctx.fill()
        }

        // Dibujar líneas de la malla
        ctx.strokeStyle = `oklch(${lightness * 0.8} ${saturation * 0.9} ${hue})`
        ctx.lineWidth = viewMode === "wireframe" ? 0.8 : 0.5

        ctx.beginPath()
        ctx.moveTo(p1.projected.x, p1.projected.y)
        ctx.lineTo(p2.projected.x, p2.projected.y)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(p1.projected.x, p1.projected.y)
        ctx.lineTo(p3.projected.x, p3.projected.y)
        ctx.stroke()
      }
    }

    drawAxesWithLabels(ctx, width, height)
    drawIntegrationRegion(ctx, width, height)
    drawConstraintCurve(ctx, width, height)
    drawTangentPlane(ctx, width, height)
    drawGradientVector(ctx, width, height)
    drawCriticalPoints(ctx, width, height)

    if (selectedPoint) {
      const proj = project3D(selectedPoint.x, selectedPoint.y, selectedPoint.z, width, height)
      ctx.fillStyle = "oklch(0.70 0.19 195)"
      ctx.beginPath()
      ctx.arc(proj.x, proj.y, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "oklch(0.99 0.005 240)"
      ctx.lineWidth = 2
      ctx.stroke()
    }

    if (hasInfiniteValues) {
      ctx.fillStyle = "oklch(0.60 0.25 30)"
      ctx.font = "12px sans-serif"
      ctx.textAlign = "left"
      ctx.fillText("⚠ Algunos valores tienden a infinito (limitados a ±20)", 10, height - 10)
    }
  }

  useEffect(() => {
    if (isAnimating) {
      const animate = () => {
        setRotation((prev) => ({ ...prev, y: prev.y + 0.005 })) // Rotación más lenta
        animationRef.current = requestAnimationFrame(animate)
      }
      animationRef.current = requestAnimationFrame(animate)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isAnimating])

  useEffect(() => {
    render()
  }, [
    functionStr,
    rotation,
    zoom,
    viewMode,
    selectedPoint,
    showGradient,
    showTangentPlane,
    constraintFunction,
    criticalPoints,
    integralBounds,
    xRange,
    yRange,
  ])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (container) {
        canvas.width = container.clientWidth
        canvas.height = container.clientHeight
        render()
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return

    const deltaX = e.clientX - lastMouse.current.x
    const deltaY = e.clientY - lastMouse.current.y

    setRotation((prev) => ({
      x: prev.x + deltaY * 0.01,
      y: prev.y + deltaX * 0.01,
    }))

    lastMouse.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((prev) => Math.max(0.5, Math.min(3, prev * delta)))
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTab !== "derivatives") return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const { points } = generateSurfaceData()
    let closestPoint = null
    let minDistance = Number.POSITIVE_INFINITY

    for (const point of points) {
      const projected = project3D(point.x, point.y, point.z, canvas.width, canvas.height)
      const distance = Math.sqrt((projected.x - clickX) ** 2 + (projected.y - clickY) ** 2)

      if (distance < minDistance) {
        minDistance = distance
        closestPoint = point
      }
    }

    if (closestPoint && minDistance < 30) {
      onPointSelect(closestPoint)
    }
  }

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
      />

      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <div className="glass-card rounded-lg p-2">
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((prev) => Math.min(3, prev * 1.2))}
              title="Acercar"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((prev) => Math.max(0.5, prev * 0.8))}
              title="Alejar"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setRotation({ x: 0.6, y: 0.8 })
                setZoom(1.2)
              }}
              title="Resetear vista"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAnimating(!isAnimating)}
              title={isAnimating ? "Pausar rotación" : "Rotar automáticamente"}
            >
              {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="glass-card rounded-lg p-2">
          <div className="flex flex-col gap-1">
            <Button
              variant={viewMode === "surface" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("surface")}
              title="Vista sólida con malla"
            >
              <Box className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "wireframe" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("wireframe")}
              title="Solo malla"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 glass-card rounded-lg p-3 text-sm">
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Arrastrar:</span> Rotar vista
          {" • "}
          <span className="font-medium text-foreground">Scroll:</span> Zoom
          {activeTab === "derivatives" && (
            <>
              {" • "}
              <span className="font-medium text-foreground">Click:</span> Seleccionar punto
            </>
          )}
        </p>
      </div>
    </div>
  )
}
