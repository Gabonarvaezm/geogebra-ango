"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"
import { calculatePartialDerivatives } from "@/lib/math-parser"

interface ResultsPanelProps {
  currentFunction: string
  selectedPoint: { x: number; y: number; z: number } | null
  activeTab: "function" | "derivatives" | "optimization" | "integrals"
  constraintFunction: string
  criticalPoints: Array<{ x: number; y: number; z: number; type: string }>
  integralResult: {
    value: number
    volume: number
    bounds: { xMin: number; xMax: number; yMin: number; yMax: number }
  } | null
}

export function ResultsPanel({
  currentFunction,
  selectedPoint,
  activeTab,
  constraintFunction,
  criticalPoints,
  integralResult,
}: ResultsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const renderFunctionInfo = () => {
    try {
      return (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Función actual</p>
            <p className="font-mono text-lg">f(x, y) = {currentFunction}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Dominio</p>
              <p className="text-sm">ℝ²</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rango</p>
              <p className="text-sm">ℝ</p>
            </div>
          </div>
        </div>
      )
    } catch (error) {
      return <p className="text-sm text-destructive">Error al analizar la función</p>
    }
  }

  const renderDerivativesInfo = () => {
    if (!selectedPoint) {
      return (
        <p className="text-sm text-muted-foreground">
          Haz clic en la superficie para calcular derivadas parciales en ese punto
        </p>
      )
    }

    try {
      const { dx, dy } = calculatePartialDerivatives(currentFunction, selectedPoint.x, selectedPoint.y)
      const gradientMagnitude = Math.sqrt(dx * dx + dy * dy)

      return (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Punto seleccionado</p>
            <p className="font-mono text-sm">
              ({selectedPoint.x.toFixed(2)}, {selectedPoint.y.toFixed(2)}, {selectedPoint.z.toFixed(2)})
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">∂f/∂x</p>
              <p className="font-mono text-lg text-primary">{dx.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">∂f/∂y</p>
              <p className="font-mono text-lg text-secondary">{dy.toFixed(4)}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Magnitud del gradiente</p>
            <p className="font-mono text-lg">||∇f|| = {gradientMagnitude.toFixed(4)}</p>
          </div>
        </div>
      )
    } catch (error) {
      return <p className="text-sm text-destructive">Error al calcular derivadas</p>
    }
  }

  const renderOptimizationInfo = () => {
    if (criticalPoints.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          Configura una restricción y haz clic en "Calcular Puntos Críticos"
        </p>
      )
    }

    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Restricción</p>
          <p className="font-mono text-sm">g(x, y) = {constraintFunction} = 0</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Puntos críticos encontrados</p>
          <div className="mt-2 space-y-2">
            {criticalPoints.map((point, index) => (
              <div key={index} className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="font-mono text-sm">
                  P{index + 1}: ({point.x.toFixed(3)}, {point.y.toFixed(3)})
                </p>
                <p className="text-sm text-muted-foreground">
                  f(P{index + 1}) = {point.z.toFixed(4)} • {point.type}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderIntegralsInfo = () => {
    if (!integralResult) {
      return <p className="text-sm text-muted-foreground">Define los límites y haz clic en "Calcular Integral"</p>
    }

    const { value, volume, bounds } = integralResult
    const area = (bounds.xMax - bounds.xMin) * (bounds.yMax - bounds.yMin)

    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Región de integración</p>
          <p className="font-mono text-sm">
            R = [{bounds.xMin}, {bounds.xMax}] × [{bounds.yMin}, {bounds.yMax}]
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Área de la región</p>
            <p className="font-mono text-lg">{area.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Volumen</p>
            <p className="font-mono text-lg text-primary">{volume.toFixed(4)}</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Valor de la integral</p>
          <p className="font-mono text-xl">∫∫ f(x,y) dA = {value.toFixed(6)}</p>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case "function":
        return renderFunctionInfo()
      case "derivatives":
        return renderDerivativesInfo()
      case "optimization":
        return renderOptimizationInfo()
      case "integrals":
        return renderIntegralsInfo()
      default:
        return null
    }
  }

  return (
    <div className="border-t border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <h3 className="font-semibold">Resultados y Cálculos</h3>
        <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>
      {isExpanded && (
        <div className="p-6">
          <Card className="p-4">{renderContent()}</Card>
        </div>
      )}
    </div>
  )
}
