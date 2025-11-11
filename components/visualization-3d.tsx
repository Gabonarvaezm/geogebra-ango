"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { RotateCcw, ZoomIn, ZoomOut, Play, Pause, ArrowUpRight, Layers, MoveVertical } from "lucide-react"
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
  // Orientación invertida por defecto: rotar Y 90° para que el pico apunte hacia arriba
  const [rotation, setRotation] = useState({ x: 0, y: Math.PI / 2 })
  const [zoom, setZoom] = useState(1.2)
  const [isAnimating, setIsAnimating] = useState(false)
  // Eliminado modo de superficie/malla: solo contornos
  const [showGradient, setShowGradient] = useState(false)
  const [showTangentPlane, setShowTangentPlane] = useState(false)
  // Estilo GeoGebra: plano XY gris y ejes coloreados
  const [geoStyle, setGeoStyle] = useState(true)
  // Mostrar contornos (por defecto desactivado para vista lisa)
  const [showContours, setShowContours] = useState(false)
  // Nueva opción: superficie lisa rellena
  const [showSmoothSurface, setShowSmoothSurface] = useState(true)
  // Overlay de malla eliminado
  const [hasInfiniteValues, setHasInfiniteValues] = useState(false)
  const animationRef = useRef<number | null>(null)
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  const generateSurfaceData = () => {
    // resolución adaptativa según zoom y animación
    const baseRes = 90
    const resFactor = Math.max(0.8, Math.min(1.4, zoom))
    const resolution = Math.max(40, Math.min(100, Math.round(baseRes * (isAnimating ? 0.7 : 1) * resFactor)))
    const [xMin, xMax] = xRange
    const [yMin, yMax] = yRange
    const xStep = (xMax - xMin) / resolution
    const yStep = (yMax - yMin) / resolution
    const grid: number[][] = Array.from({ length: resolution + 1 }, () => new Array(resolution + 1).fill(NaN))
    let infiniteCount = 0
    let minZ = Number.POSITIVE_INFINITY
    let maxZ = Number.NEGATIVE_INFINITY

    try {
      // Primer pase: evaluar sin recorte para obtener min/max reales
      for (let i = 0; i <= resolution; i++) {
        for (let j = 0; j <= resolution; j++) {
          const x = xMin + i * xStep
          const y = yMin + j * yStep
          const z = evaluateFunction(functionStr, x, y)
          grid[i][j] = z

          if (!isFinite(z) || isNaN(z)) {
            infiniteCount++
            continue
          }

          minZ = Math.min(minZ, z)
          maxZ = Math.max(maxZ, z)
        }
      }

      // Añadir margen para evitar cortes bruscos
      const span = isFinite(maxZ - minZ) && maxZ > minZ ? maxZ - minZ : 1
      const pad = span * 0.05
      const zLo = minZ - pad
      const zHi = maxZ + pad

      // Segundo pase: construir puntos, recortando al rango dinámico
      const points: { x: number; y: number; z: number }[] = []
      for (let i = 0; i <= resolution; i++) {
        for (let j = 0; j <= resolution; j++) {
          const x = xMin + i * xStep
          const y = yMin + j * yStep
          const zRaw = grid[i][j]
          let z: number

          if (!isFinite(zRaw) || isNaN(zRaw)) {
            // Para valores no finitos, ubicarlos en el borde más cercano
            z = zRaw > 0 ? zHi : zLo
          } else {
            // Recorte suave al rango dinámico derivado de la función
            z = Math.max(zLo, Math.min(zHi, zRaw))
          }

          points.push({ x, y, z })
        }
      }

      setHasInfiniteValues(infiniteCount > resolution * resolution * 0.1)

      return { points, minZ: zLo, maxZ: zHi }
    } catch (error) {
      console.error("[v0] Error generating surface:", error)
      return { points: [], minZ: -20, maxZ: 20 }
    }
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

  // Proyección con zoom local para cálculo de autoajuste (no usa estado de zoom)
  const project3DWithZoom = (
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    zoomLocal: number,
  ) => {
    const scale = 30 * zoomLocal
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

    return { x: screenX, y: screenY, depth: z2, x1, y1 }
  }

  const drawBackgroundPlanes = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const [xMin, xMax] = xRange
    const [yMin, yMax] = yRange
    const zMin = -20
    const zMax = 20

    ctx.fillStyle = "rgba(240, 240, 245, 0.08)"
    ctx.strokeStyle = "rgba(150, 150, 160, 0.18)"
    ctx.lineWidth = 0.75

    const gridSteps = 6
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

    ctx.fillStyle = "rgba(240, 240, 245, 0.06)"
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

  // Plano XY estilo vintage (tono pergamino)
  const drawGeoPlane = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const [xMin, xMax] = xRange
    const [yMin, yMax] = yRange
    const padX = (xMax - xMin) * 0.4
    const padY = (yMax - yMin) * 0.4
    const corners = [
      { x: xMin - padX, y: yMin - padY, z: 0 },
      { x: xMax + padX, y: yMin - padY, z: 0 },
      { x: xMax + padX, y: yMax + padY, z: 0 },
      { x: xMin - padX, y: yMax + padY, z: 0 },
    ]
    const p = corners.map((c) => project3D(c.x, c.y, c.z, width, height))
    ctx.fillStyle = "rgba(228, 214, 196, 0.65)"
    ctx.beginPath()
    ctx.moveTo(p[0].x, p[0].y)
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y)
    ctx.closePath()
    ctx.fill()
    // Borde sutil
    ctx.strokeStyle = "rgba(120, 95, 75, 0.25)"
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Ejes con estilo vintage y etiquetas en fuente con serif
  const drawGeoAxes = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const [xMin, xMax] = xRange
    const [yMin, yMax] = yRange
    const origin = project3D(0, 0, 0, width, height)

    // X
    const xEnd = project3D(xMax, 0, 0, width, height)
    ctx.strokeStyle = "rgba(75, 46, 43, 0.95)"
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(project3D(xMin, 0, 0, width, height).x, project3D(xMin, 0, 0, width, height).y)
    ctx.lineTo(xEnd.x, xEnd.y)
    ctx.stroke()
    // flecha X
    const angX = Math.atan2(xEnd.y - origin.y, xEnd.x - origin.x)
    ctx.beginPath()
    ctx.moveTo(xEnd.x, xEnd.y)
    ctx.lineTo(xEnd.x - 12 * Math.cos(angX - Math.PI / 6), xEnd.y - 12 * Math.sin(angX - Math.PI / 6))
    ctx.lineTo(xEnd.x - 12 * Math.cos(angX + Math.PI / 6), xEnd.y - 12 * Math.sin(angX + Math.PI / 6))
    ctx.closePath()
    ctx.fillStyle = "rgba(75, 46, 43, 0.95)"
    ctx.fill()

    // Y
    const yEnd = project3D(0, yMax, 0, width, height)
    ctx.strokeStyle = "rgba(75, 46, 43, 0.95)"
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(project3D(0, yMin, 0, width, height).x, project3D(0, yMin, 0, width, height).y)
    ctx.lineTo(yEnd.x, yEnd.y)
    ctx.stroke()
    const angY = Math.atan2(yEnd.y - origin.y, yEnd.x - origin.x)
    ctx.beginPath()
    ctx.moveTo(yEnd.x, yEnd.y)
    ctx.lineTo(yEnd.x - 12 * Math.cos(angY - Math.PI / 6), yEnd.y - 12 * Math.sin(angY - Math.PI / 6))
    ctx.lineTo(yEnd.x - 12 * Math.cos(angY + Math.PI / 6), yEnd.y - 12 * Math.sin(angY + Math.PI / 6))
    ctx.closePath()
    ctx.fillStyle = "rgba(75, 46, 43, 0.95)"
    ctx.fill()

    // Z
    const zEnd = project3D(0, 0, Math.max(20, (yMax - yMin + xMax - xMin) / 2), width, height)
    ctx.strokeStyle = "rgba(75, 46, 43, 0.95)"
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(origin.x, origin.y)
    ctx.lineTo(zEnd.x, zEnd.y)
    ctx.stroke()
    const angZ = Math.atan2(zEnd.y - origin.y, zEnd.x - origin.x)
    ctx.beginPath()
    ctx.moveTo(zEnd.x, zEnd.y)
    ctx.lineTo(zEnd.x - 12 * Math.cos(angZ - Math.PI / 6), zEnd.y - 12 * Math.sin(angZ - Math.PI / 6))
    ctx.lineTo(zEnd.x - 12 * Math.cos(angZ + Math.PI / 6), zEnd.y - 12 * Math.sin(angZ + Math.PI / 6))
    ctx.closePath()
    ctx.fillStyle = "rgba(75, 46, 43, 0.95)"
    ctx.fill()

    // Ticks numéricos (cada 10 unidades aprox.)
    const ticks = 12
    ctx.font = "12px Georgia, serif"
    ctx.fillStyle = "#2b1f1d"
    for (let i = 0; i <= ticks; i++) {
      const xv = xMin + (i / ticks) * (xMax - xMin)
      const xp = project3D(xv, 0, 0, width, height)
      const ax = Math.atan2(xEnd.y - origin.y, xEnd.x - origin.x)
      const dx = 6 * Math.sin(ax)
      const dy = -6 * Math.cos(ax)
      ctx.beginPath()
      ctx.moveTo(xp.x - dx, xp.y - dy)
      ctx.lineTo(xp.x + dx, xp.y + dy)
      ctx.strokeStyle = "rgba(75, 46, 43, 0.8)"
      ctx.lineWidth = 1.25
      ctx.stroke()
      ctx.fillText(xv.toFixed(0), xp.x + 4, xp.y + 14)
    }
    for (let i = 0; i <= ticks; i++) {
      const yv = yMin + (i / ticks) * (yMax - yMin)
      const yp = project3D(0, yv, 0, width, height)
      const ay = Math.atan2(yEnd.y - origin.y, yEnd.x - origin.x)
      const dx = 6 * Math.sin(ay)
      const dy = -6 * Math.cos(ay)
      ctx.beginPath()
      ctx.moveTo(yp.x - dx, yp.y - dy)
      ctx.lineTo(yp.x + dx, yp.y + dy)
      ctx.strokeStyle = "rgba(75, 46, 43, 0.75)"
      ctx.lineWidth = 1.1
      ctx.stroke()
      ctx.fillText(yv.toFixed(0), yp.x - 24, yp.y + 4)
    }
  }

  // Contornos en el plano XY usando un marching squares sencillo
  const drawLevelContours = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    minZ: number,
    maxZ: number,
  ) => {
    try {
      const levelsCount = 6
      const levels: number[] = []
      for (let i = 1; i <= levelsCount; i++) {
        levels.push(minZ + (i / (levelsCount + 1)) * (maxZ - minZ))
      }

      const nx = 28
      const ny = 28
      const [xMin, xMax] = xRange
      const [yMin, yMax] = yRange
      const xVals = Array.from({ length: nx + 1 }, (_, i) => xMin + (i / nx) * (xMax - xMin))
      const yVals = Array.from({ length: ny + 1 }, (_, j) => yMin + (j / ny) * (yMax - yMin))

      const values: number[][] = Array.from({ length: nx + 1 }, () => new Array(ny + 1).fill(0))
      for (let i = 0; i <= nx; i++) {
        for (let j = 0; j <= ny; j++) {
          values[i][j] = evaluateFunction(functionStr, xVals[i], yVals[j])
        }
      }

      const intersect = (
        ax: number,
        ay: number,
        av: number,
        bx: number,
        by: number,
        bv: number,
        L: number,
      ): { x: number; y: number } | null => {
        if ((L - av) * (L - bv) > 0 || av === bv) return null
        const t = (L - av) / (bv - av)
        return { x: ax + t * (bx - ax), y: ay + t * (by - ay) }
      }

      // Estilo de contornos vintage (sepia, líneas finas y discontinuas)
      ctx.strokeStyle = "rgba(70, 50, 40, 0.6)"
      ctx.lineWidth = 1
      ctx.setLineDash([4, 3])

      for (const L of levels) {
        for (let i = 0; i < nx; i++) {
          for (let j = 0; j < ny; j++) {
            const x0 = xVals[i]
            const x1 = xVals[i + 1]
            const y0 = yVals[j]
            const y1 = yVals[j + 1]

            const v00 = values[i][j]
            const v10 = values[i + 1][j]
            const v01 = values[i][j + 1]
            const v11 = values[i + 1][j + 1]

            const pts: { x: number; y: number }[] = []
            const p1 = intersect(x0, y0, v00, x1, y0, v10, L)
            const p2 = intersect(x1, y0, v10, x1, y1, v11, L)
            const p3 = intersect(x1, y1, v11, x0, y1, v01, L)
            const p4 = intersect(x0, y1, v01, x0, y0, v00, L)
            if (p1) pts.push(p1)
            if (p2) pts.push(p2)
            if (p3) pts.push(p3)
            if (p4) pts.push(p4)

            if (pts.length >= 2) {
              for (let k = 0; k + 1 < pts.length; k += 2) {
                const a = project3D(pts[k].x, pts[k].y, 0, width, height)
                const b = project3D(pts[k + 1].x, pts[k + 1].y, 0, width, height)
                ctx.beginPath()
                ctx.moveTo(a.x, a.y)
                ctx.lineTo(b.x, b.y)
                ctx.stroke()
              }
            }
          }
        }
      }
      ctx.setLineDash([])
    } catch (err) {
      console.warn("[v0] contours error", err)
    }
  }

  const drawAxesWithLabels = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const [xMin, xMax] = xRange
    const [yMin, yMax] = yRange
    const origin = project3D(0, 0, 0, width, height)

    const xEnd = project3D(xMax, 0, 0, width, height)
    ctx.strokeStyle = "rgba(30, 30, 35, 0.85)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(origin.x, origin.y)
    ctx.lineTo(xEnd.x, xEnd.y)
    ctx.stroke()

    // flecha del eje X
    const angleX = Math.atan2(xEnd.y - origin.y, xEnd.x - origin.x)
    ctx.beginPath()
    ctx.moveTo(xEnd.x, xEnd.y)
    ctx.lineTo(xEnd.x - 12 * Math.cos(angleX - Math.PI / 6), xEnd.y - 12 * Math.sin(angleX - Math.PI / 6))
    ctx.lineTo(xEnd.x - 12 * Math.cos(angleX + Math.PI / 6), xEnd.y - 12 * Math.sin(angleX + Math.PI / 6))
    ctx.closePath()
    ctx.fillStyle = "rgba(30, 30, 35, 0.85)"
    ctx.fill()
    ctx.font = "bold 15px sans-serif"
    ctx.fillText("X", xEnd.x + 15, xEnd.y + 5)

    ctx.font = "12px sans-serif"
    const xSteps = 4
    for (let i = 0; i <= xSteps; i++) {
      const x = xMin + (i / xSteps) * (xMax - xMin)
      const pos = project3D(x, 0, 0, width, height)
      ctx.fillText(x.toFixed(1), pos.x, pos.y + 20)
    }

    const yEnd = project3D(0, yMax, 0, width, height)
    ctx.strokeStyle = "rgba(30, 30, 35, 0.85)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(origin.x, origin.y)
    ctx.lineTo(yEnd.x, yEnd.y)
    ctx.stroke()

    // flecha del eje Y
    const angleY = Math.atan2(yEnd.y - origin.y, yEnd.x - origin.x)
    ctx.beginPath()
    ctx.moveTo(yEnd.x, yEnd.y)
    ctx.lineTo(yEnd.x - 12 * Math.cos(angleY - Math.PI / 6), yEnd.y - 12 * Math.sin(angleY - Math.PI / 6))
    ctx.lineTo(yEnd.x - 12 * Math.cos(angleY + Math.PI / 6), yEnd.y - 12 * Math.sin(angleY + Math.PI / 6))
    ctx.closePath()
    ctx.fillStyle = "rgba(30, 30, 35, 0.85)"
    ctx.fill()
    ctx.font = "bold 15px sans-serif"
    ctx.fillText("Y", yEnd.x - 25, yEnd.y + 5)

    ctx.font = "12px sans-serif"
    const ySteps = 4
    for (let i = 0; i <= ySteps; i++) {
      const y = yMin + (i / ySteps) * (yMax - yMin)
      const pos = project3D(0, y, 0, width, height)
      ctx.fillText(y.toFixed(1), pos.x - 30, pos.y + 5)
    }

    const zEnd = project3D(0, 0, 20, width, height)
    ctx.strokeStyle = "rgba(30, 30, 35, 0.85)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(origin.x, origin.y)
    ctx.lineTo(zEnd.x, zEnd.y)
    ctx.stroke()

    // flecha del eje Z
    const angleZ = Math.atan2(zEnd.y - origin.y, zEnd.x - origin.x)
    ctx.beginPath()
    ctx.moveTo(zEnd.x, zEnd.y)
    ctx.lineTo(zEnd.x - 12 * Math.cos(angleZ - Math.PI / 6), zEnd.y - 12 * Math.sin(angleZ - Math.PI / 6))
    ctx.lineTo(zEnd.x - 12 * Math.cos(angleZ + Math.PI / 6), zEnd.y - 12 * Math.sin(angleZ + Math.PI / 6))
    ctx.closePath()
    ctx.fillStyle = "rgba(30, 30, 35, 0.85)"
    ctx.fill()
    ctx.font = "bold 15px sans-serif"
    ctx.fillText("Z", zEnd.x - 10, zEnd.y - 15)

    ctx.font = "12px sans-serif"
    const zSteps = 4
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
    if (!selectedPoint || !showGradient) return

    try {
      const gradient = calculateGradient(functionStr, selectedPoint.x, selectedPoint.y)
      const { dx, dy } = gradient.vector
      const m = Math.atan(gradient.magnitude) / (Math.PI / 2)
      // Paleta vintage por magnitud: marrón (baja) → rojo (alta)
      const hue = 50 - 25 * m
      const chroma = 0.08 + 0.14 * m
      const lightness = 0.72 - 0.25 * m
      const color = `oklch(${lightness} ${chroma} ${hue})`
      // Flecha 3D más pequeña
      const scale = 0.65

      const start = project3D(selectedPoint.x, selectedPoint.y, selectedPoint.z, width, height)

      const endX = selectedPoint.x + dx * scale
      const endY = selectedPoint.y + dy * scale
      const endZ = selectedPoint.z + gradient.magnitude * scale * 0.5
      const end = project3D(endX, endY, endZ, width, height)

      ctx.shadowColor = "rgba(0,0,0,0.12)"
      ctx.shadowBlur = 4
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()

      const angle = Math.atan2(end.y - start.y, end.x - start.x)
      const arrowLength = 9
      ctx.fillStyle = color
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
      ctx.shadowColor = "transparent"
      ctx.shadowBlur = 0
    } catch (error) {
      console.error("[v0] Error drawing gradient vector:", error)
    }
  }

  const drawGradientVectorField = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Mostrar el campo sólo cuando el usuario lo activa y selecciona un punto
    if (!showGradient || !selectedPoint) return

    // Región local alrededor del punto seleccionado
    const [xMin, xMax] = xRange
    const [yMin, yMax] = yRange
    const spanX = xMax - xMin
    const spanY = yMax - yMin
    const radiusX = spanX * 0.15
    const radiusY = spanY * 0.15

    const gridSize = isAnimating ? 8 : 10
    const xStart = Math.max(xMin, selectedPoint.x - radiusX)
    const xEnd = Math.min(xMax, selectedPoint.x + radiusX)
    const yStart = Math.max(yMin, selectedPoint.y - radiusY)
    const yEnd = Math.min(yMax, selectedPoint.y + radiusY)
    const xStep = (xEnd - xStart) / gridSize
    const yStep = (yEnd - yStart) / gridSize

    try {
      for (let i = 1; i < gridSize; i++) {
        for (let j = 1; j < gridSize; j++) {
          const x = xStart + i * xStep
          const y = yStart + j * yStep
          const gradient = calculateGradient(functionStr, x, y)
          const { dx, dy } = gradient.vector
          if (!isFinite(dx) || !isFinite(dy) || !isFinite(gradient.magnitude)) continue
          const m = Math.atan(gradient.magnitude) / (Math.PI / 2)
          // Paleta vintage por magnitud: marrón (baja) → rojo (alta)
          const hue = 50 - 25 * m
          const chroma = 0.08 + 0.14 * m
          const lightness = 0.72 - 0.25 * m
          const color = `oklch(${lightness} ${chroma} ${hue})`

          // Flecha 3D pequeña sobre la superficie: z = f(x,y)
          const zLocal = evaluateFunction(functionStr, x, y)
          if (!isFinite(zLocal)) continue
          const scale = 0.08 + 0.15 * m
          const start = project3D(x, y, zLocal, width, height)
          const endX = x + dx * scale
          const endY = y + dy * scale
          const endZ = zLocal + gradient.magnitude * scale * 0.5
          const end = project3D(endX, endY, endZ, width, height)

          ctx.strokeStyle = color
          ctx.lineWidth = 0.7 + 0.6 * m
          ctx.beginPath()
          ctx.moveTo(start.x, start.y)
          ctx.lineTo(end.x, end.y)
          ctx.stroke()

          const angle = Math.atan2(end.y - start.y, end.x - start.x)
          const arrowLength = 3 + 3 * m
          ctx.fillStyle = color
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
        }
      }
    } catch (error) {
      console.error("[v0] Error drawing gradient field:", error)
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
    // Asegurar tipo no nulo para TypeScript en el resto del render
    const g: CanvasRenderingContext2D = ctx

    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = "high"

    const width = canvas.width
    const height = canvas.height

    // Fondo vintage tipo pergamino
    g.fillStyle = "#f9f4e8"
    g.fillRect(0, 0, width, height)

    // Generamos datos si se requieren (contornos o superficie lisa)
    const needSurfaceData = showContours || showSmoothSurface
    const surfaceData = needSurfaceData ? generateSurfaceData() : null
    const minZ = surfaceData?.minZ ?? -20
    const maxZ = surfaceData?.maxZ ?? 20

    // Estilo único vintage: plano y ejes siempre visibles
    drawGeoPlane(g, width, height)
    drawGeoAxes(g, width, height)
      // Si el usuario desea ver la función: contornos sobre el plano
      if (showContours && surfaceData) {
        try {
          drawLevelContours(g, width, height, minZ, maxZ)
        } catch (error) {
          console.error("[v0] Error drawing contours:", error)
        }
      }
      // Superficie lisa sombreada por altura
      if (showSmoothSurface && surfaceData?.points?.length) {
        const points = surfaceData.points
        const resolution = Math.sqrt(points.length)
        type Tri = {
          a: { x: number; y: number; depth: number }
          b: { x: number; y: number; depth: number }
          c: { x: number; y: number; depth: number }
          shade: string
          depthAvg: number
        }
        const tris: Tri[] = []
        const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v))
        for (let i = 0; i < resolution - 1; i++) {
          for (let j = 0; j < resolution - 1; j++) {
            const idx = i * resolution + j
            const p1 = points[idx]
            const p2 = points[idx + 1]
            const p3 = points[idx + resolution]
            const p4 = points[idx + resolution + 1]
            if (!p1 || !p2 || !p3 || !p4) continue
            // Omitir triángulos si alguna altura no es finita
            if (!isFinite(p1.z) || !isFinite(p2.z) || !isFinite(p3.z) || !isFinite(p4.z)) {
              continue
            }
            const proj1 = project3D(p1.x, p1.y, p1.z, width, height)
            const proj2 = project3D(p2.x, p2.y, p2.z, width, height)
            const proj3 = project3D(p3.x, p3.y, p3.z, width, height)
            const proj4 = project3D(p4.x, p4.y, p4.z, width, height)
            const avgZ13 = (p1.z + p2.z + p3.z) / 3
            const avgZ24 = (p2.z + p4.z + p3.z) / 3
            const t1 = clamp((avgZ13 - minZ) / (maxZ - minZ || 1))
            const t2 = clamp((avgZ24 - minZ) / (maxZ - minZ || 1))
            // Gradiente más marcado: claro arriba → oscuro abajo en paleta vintage
            const H1 = 45 - 25 * t1
            const H2 = 45 - 25 * t2
            const L1 = 0.90 - 0.60 * t1
            const L2 = 0.90 - 0.60 * t2
            const C1 = 0.06 + 0.18 * t1
            const C2 = 0.06 + 0.18 * t2
            tris.push({
              a: proj1,
              b: proj2,
              c: proj3,
              shade: `oklch(${L1} ${C1} ${H1})`,
              depthAvg: (proj1.depth + proj2.depth + proj3.depth) / 3,
            })
            tris.push({
              a: proj2,
              b: proj4,
              c: proj3,
              shade: `oklch(${L2} ${C2} ${H2})`,
              depthAvg: (proj2.depth + proj4.depth + proj3.depth) / 3,
            })
          }
        }
        tris.sort((u, v) => u.depthAvg - v.depthAvg)
        g.globalAlpha = 0.92
        for (const t of tris) {
          g.fillStyle = t.shade
          g.beginPath()
          g.moveTo(t.a.x, t.a.y)
          g.lineTo(t.b.x, t.b.y)
          g.lineTo(t.c.x, t.c.y)
          g.closePath()
          g.fill()
        }
        g.globalAlpha = 1
      }
      // Overlays que no dependen de la malla de superficie
      drawIntegrationRegion(g, width, height)
      drawCriticalPoints(g, width, height)
      if (showGradient) {
        drawGradientVector(g, width, height)
        drawGradientVectorField(g, width, height)
      }
      return

    // resetear sombra para elementos posteriores
    g.shadowColor = "transparent"
    g.shadowBlur = 0
    g.shadowOffsetY = 0

    drawAxesWithLabels(g, width, height)
    drawIntegrationRegion(g, width, height)
    drawConstraintCurve(g, width, height)
    drawTangentPlane(g, width, height)

    // Dibujar gradiente si el usuario lo activó (independiente de la pestaña)
    drawGradientVectorField(g, width, height)
    drawGradientVector(g, width, height)

    drawCriticalPoints(g, width, height)

    if (selectedPoint) {
      const sp = selectedPoint!
      const proj = project3D(sp.x, sp.y, sp.z, width, height)
      g.fillStyle = "rgba(236, 72, 153, 0.9)"
      g.beginPath()
      g.arc(proj.x, proj.y, 7, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = "rgba(255, 255, 255, 0.9)"
      g.lineWidth = 2
      g.stroke()
    }

    if (hasInfiniteValues) {
      g.fillStyle = "oklch(0.60 0.25 30)"
      g.font = "12px sans-serif"
      g.textAlign = "left"
      g.fillText("⚠ Algunos valores tienden a infinito (limitados a ±20)", 10, height - 10)
    }
  }

  // Autoajustar zoom para que la vista no se vea amontonada según el rango
  const autoFitDoneRef = useRef(false)
  useEffect(() => {
    autoFitDoneRef.current = false
  }, [functionStr, xRange, yRange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || autoFitDoneRef.current) return
    const width = canvas.width
    const height = canvas.height

    const [xMin, xMax] = xRange
    const [yMin, yMax] = yRange

    // Usar las esquinas del plano XY para estimar el encuadre
    const corners = [
      { x: xMin, y: yMin, z: 0 },
      { x: xMax, y: yMin, z: 0 },
      { x: xMax, y: yMax, z: 0 },
      { x: xMin, y: yMax, z: 0 },
    ]

    // Proyectar con zoom = 1 para medir extents en espacio rotado
    const projected = corners.map((c) => project3DWithZoom(c.x, c.y, c.z, width, height, 1))
    const maxAbsX1 = Math.max(...projected.map((p) => Math.abs(p.x1))) || 1
    const maxAbsY1 = Math.max(...projected.map((p) => Math.abs(p.y1))) || 1

    const targetZoomX = (width * 0.45) / (30 * maxAbsX1)
    const targetZoomY = (height * 0.45) / (30 * maxAbsY1)
    let targetZoom = Math.min(targetZoomX, targetZoomY)
    // Limitar a un rango razonable para no exagerar
    targetZoom = Math.max(0.6, Math.min(2.2, targetZoom))

    // Aplicar solo si difiere lo suficiente
    if (Math.abs(targetZoom - zoom) > 0.08) {
      setZoom(targetZoom)
    }
    autoFitDoneRef.current = true
  }, [rotation, xRange, yRange])

  useEffect(() => {
    if (isAnimating) {
      const animate = () => {
        setRotation((prev) => ({ ...prev, y: prev.y + 0.005 }))
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
    selectedPoint,
    showGradient,
    showTangentPlane,
    constraintFunction,
    criticalPoints,
    integralBounds,
    xRange,
    yRange,
    activeTab,
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
    // Listener de wheel con passive:false para permitir preventDefault (evitar scroll de página)
    const wheelListener = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setZoom((prev) => Math.max(0.5, Math.min(3, prev * delta)))
    }
    canvas.addEventListener("wheel", wheelListener, { passive: false })

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      canvas.removeEventListener("wheel", wheelListener)
    }
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
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((prev) => Math.max(0.5, Math.min(3, prev * delta)))
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Solo permitir selección de punto cuando el usuario quiere ver gradiente
    if (!showGradient) return

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
                // Vista vertical invertida: eje X pasa a Z
                setRotation({ x: 0, y: Math.PI / 2 })
                setZoom(1.2)
              }}
              title="Vista vertical invertida"
            >
              <MoveVertical className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // Reset más claro: ligera inclinación con Y en vertical
                setRotation({ x: 0.35, y: Math.PI / 2 })
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

        {/* Eliminados controles de superficie/malla: sólo contornos */}

        <div className="glass-card rounded-lg p-2">
          <div className="flex flex-col gap-1">
            <Button
              variant={showGradient ? "default" : "ghost"}
              size="icon"
              onClick={() => setShowGradient((v) => !v)}
              title={showGradient ? "Ocultar campo gradiente" : "Mostrar campo gradiente"}
            >
              <ArrowUpRight className="h-4 w-4" />
            </Button>
            <Button
              variant={showTangentPlane ? "default" : "ghost"}
              size="icon"
              onClick={() => setShowTangentPlane((v) => !v)}
              title={showTangentPlane ? "Ocultar plano tangente" : "Mostrar plano tangente"}
            >
              <Layers className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Control de superficie lisa y contornos */}
        <div className="glass-card rounded-lg p-2">
          <div className="flex flex-col gap-1">
            <Button
              variant={showSmoothSurface ? "default" : "ghost"}
              size="icon"
              onClick={() => setShowSmoothSurface((v) => !v)}
              title={showSmoothSurface ? "Ocultar superficie lisa" : "Mostrar superficie lisa"}
            >
              <MoveVertical className="h-4 w-4" />
            </Button>
            <Button
              variant={showContours ? "default" : "ghost"}
              size="icon"
              onClick={() => setShowContours((v) => !v)}
              title={showContours ? "Ocultar contornos" : "Mostrar contornos"}
            >
              <Layers className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 glass-card rounded-lg p-3 text-sm">
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Arrastrar:</span> Rotar vista
          {" • "}
          <span className="font-medium text-foreground">Scroll:</span> Zoom
          {showGradient && (
            <>
              {" • "}
              <span className="font-medium text-foreground">Click:</span> Seleccionar punto para gradiente
            </>
          )}
        </p>
      </div>
    </div>
  )
}
