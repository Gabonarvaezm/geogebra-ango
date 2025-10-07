"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Visualization3D } from "@/components/visualization-3d"
import { ResultsPanel } from "@/components/results-panel"
import { ThemeToggle } from "@/components/theme-toggle"
import { ExportMenu } from "@/components/export-menu"
import { Calculator, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentFunction, setCurrentFunction] = useState("x^2 + y^2")
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number; z: number } | null>(null)
  const [activeTab, setActiveTab] = useState<"function" | "derivatives" | "optimization" | "integrals">("function")
  const [constraintFunction, setConstraintFunction] = useState("x^2 + y^2 - 1")
  const [criticalPoints, setCriticalPoints] = useState<Array<{ x: number; y: number; z: number; type: string }>>([])
  const [integralResult, setIntegralResult] = useState<{
    value: number
    volume: number
    bounds: { xMin: number; xMax: number; yMin: number; yMax: number }
  } | null>(null)
  const [xRange, setXRange] = useState<[number, number]>([-5, 5])
  const [yRange, setYRange] = useState<[number, number]>([-5, 5])
  const { toast } = useToast()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const funcParam = params.get("f")
    if (funcParam) {
      try {
        const decodedFunc = decodeURIComponent(funcParam)
        setCurrentFunction(decodedFunc)
        toast({
          title: "Función cargada",
          description: `Se cargó la función desde el enlace compartido`,
        })
      } catch (error) {
        console.error("[v0] Error loading function from URL:", error)
      }
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentFunction={currentFunction}
        onFunctionChange={setCurrentFunction}
        constraintFunction={constraintFunction}
        onConstraintChange={setConstraintFunction}
        onCriticalPointsCalculated={setCriticalPoints}
        onIntegralCalculated={setIntegralResult}
        xRange={xRange}
        yRange={yRange}
        onXRangeChange={setXRange}
        onYRangeChange={setYRange}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-balance">Cálculo Multivariable</h1>
                <p className="text-sm text-muted-foreground">Visualización Interactiva 3D</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu currentFunction={currentFunction} />
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <Visualization3D
            functionStr={currentFunction}
            selectedPoint={selectedPoint}
            onPointSelect={setSelectedPoint}
            activeTab={activeTab}
            constraintFunction={constraintFunction}
            criticalPoints={criticalPoints}
            integralBounds={integralResult?.bounds || null}
            xRange={xRange}
            yRange={yRange}
          />
        </div>

        <ResultsPanel
          currentFunction={currentFunction}
          selectedPoint={selectedPoint}
          activeTab={activeTab}
          constraintFunction={constraintFunction}
          criticalPoints={criticalPoints}
          integralResult={integralResult}
        />
      </div>
    </div>
  )
}
