"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { X, FenceIcon as Function, TrendingUp, Target, Sigma, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { findLagrangeCriticalPoints, calculateDoubleIntegral } from "@/lib/math-parser"
import { useToast } from "@/hooks/use-toast"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  activeTab: "function" | "derivatives" | "optimization" | "integrals"
  onTabChange: (tab: "function" | "derivatives" | "optimization" | "integrals") => void
  currentFunction: string
  onFunctionChange: (func: string) => void
  constraintFunction: string
  onConstraintChange: (func: string) => void
  onCriticalPointsCalculated: (points: Array<{ x: number; y: number; z: number; type: string }>) => void
  onIntegralCalculated: (result: {
    value: number
    volume: number
    bounds: { xMin: number; xMax: number; yMin: number; yMax: number }
  }) => void
  xRange: [number, number]
  yRange: [number, number]
  onXRangeChange: (range: [number, number]) => void
  onYRangeChange: (range: [number, number]) => void
}

const EXAMPLE_FUNCTIONS = [
  { name: "Paraboloide", formula: "x^2 + y^2", description: "Superficie cuadrática básica" },
  { name: "Silla de Montar", formula: "x^2 - y^2", description: "Punto de silla clásico" },
  { name: "Gaussiana", formula: "exp(-(x^2 + y^2))", description: "Distribución normal 2D" },
  { name: "Ondas", formula: "sin(sqrt(x^2 + y^2))", description: "Patrón de ondas radiales" },
  { name: "Cono", formula: "sqrt(x^2 + y^2)", description: "Superficie cónica" },
  { name: "Plano Inclinado", formula: "x + y", description: "Plano simple" },
  { name: "Coseno 2D", formula: "cos(x) * cos(y)", description: "Patrón de ondas" },
  { name: "Función Racional", formula: "1 / (1 + x^2 + y^2)", description: "Pico suave" },
]

export function Sidebar({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  currentFunction,
  onFunctionChange,
  constraintFunction,
  onConstraintChange,
  onCriticalPointsCalculated,
  onIntegralCalculated,
  xRange,
  yRange,
  onXRangeChange,
  onYRangeChange,
}: SidebarProps) {
  const [inputValue, setInputValue] = useState(currentFunction)
  const [xMin, setXMin] = useState(-2)
  const [xMax, setXMax] = useState(2)
  const [yMin, setYMin] = useState(-2)
  const [yMax, setYMax] = useState(2)
  const { toast } = useToast()

  const handleApply = () => {
    if (!inputValue.trim()) {
      toast({
        title: "Error",
        description: "La función no puede estar vacía",
        variant: "destructive",
      })
      return
    }
    onFunctionChange(inputValue)
    toast({
      title: "Función actualizada",
      description: "La visualización se ha actualizado",
    })
  }

  const handleCalculateCriticalPoints = () => {
    if (!constraintFunction.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar una restricción g(x,y) = 0",
        variant: "destructive",
      })
      return
    }

    try {
      const points = findLagrangeCriticalPoints(currentFunction, constraintFunction)
      onCriticalPointsCalculated(points)

      if (points.length === 0) {
        toast({
          title: "Sin resultados",
          description: "No se encontraron puntos críticos en el rango de búsqueda",
        })
      } else {
        toast({
          title: "Puntos críticos calculados",
          description: `Se encontraron ${points.length} punto(s) crítico(s)`,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron calcular los puntos críticos. Verifica las funciones.",
        variant: "destructive",
      })
    }
  }

  const handleCalculateIntegral = () => {
    try {
      const value = calculateDoubleIntegral(currentFunction, xMin, xMax, yMin, yMax)
      const area = (xMax - xMin) * (yMax - yMin)
      const volume = Math.abs(value)

      onIntegralCalculated({
        value,
        volume,
        bounds: { xMin, xMax, yMin, yMax },
      })

      toast({
        title: "Integral calculada",
        description: `Resultado: ${value.toFixed(6)}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo calcular la integral",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 transform border-r border-border bg-card transition-transform duration-300 lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="text-lg font-semibold">Herramientas</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="border-b border-border p-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={activeTab === "function" ? "default" : "ghost"}
                size="sm"
                onClick={() => onTabChange("function")}
                className="justify-start gap-2"
              >
                <Function className="h-4 w-4" />
                Función
              </Button>
              <Button
                variant={activeTab === "derivatives" ? "default" : "ghost"}
                size="sm"
                onClick={() => onTabChange("derivatives")}
                className="justify-start gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Derivadas
              </Button>
              <Button
                variant={activeTab === "optimization" ? "default" : "ghost"}
                size="sm"
                onClick={() => onTabChange("optimization")}
                className="justify-start gap-2"
              >
                <Target className="h-4 w-4" />
                Optimización
              </Button>
              <Button
                variant={activeTab === "integrals" ? "default" : "ghost"}
                size="sm"
                onClick={() => onTabChange("integrals")}
                className="justify-start gap-2"
              >
                <Sigma className="h-4 w-4" />
                Integrales
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            {activeTab === "function" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="function-input">Función f(x, y)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="function-input"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Ej: x^2 + y^2"
                      className="font-mono"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleApply()
                        }
                      }}
                    />
                    <Button onClick={handleApply} size="icon">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Operadores: +, -, *, /, ^ (potencia)</p>
                  <p className="text-xs text-muted-foreground">Funciones: sin, cos, tan, exp, log, sqrt, abs</p>
                  <p className="text-xs text-muted-foreground">Constantes: pi, e</p>
                  <p className="text-xs text-muted-foreground">Ejemplos: x^2+y^2, sin(x)*cos(y), exp(-x^2-y^2)</p>
                </div>

                <div className="space-y-3">
                  <Label>Rango de Visualización</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="x-range-min" className="text-xs">
                        X mín
                      </Label>
                      <Input
                        id="x-range-min"
                        type="number"
                        value={xRange[0]}
                        onChange={(e) => onXRangeChange([Number(e.target.value), xRange[1]])}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="x-range-max" className="text-xs">
                        X máx
                      </Label>
                      <Input
                        id="x-range-max"
                        type="number"
                        value={xRange[1]}
                        onChange={(e) => onXRangeChange([xRange[0], Number(e.target.value)])}
                        className="h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="y-range-min" className="text-xs">
                        Y mín
                      </Label>
                      <Input
                        id="y-range-min"
                        type="number"
                        value={yRange[0]}
                        onChange={(e) => onYRangeChange([Number(e.target.value), yRange[1]])}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="y-range-max" className="text-xs">
                        Y máx
                      </Label>
                      <Input
                        id="y-range-max"
                        type="number"
                        value={yRange[1]}
                        onChange={(e) => onYRangeChange([yRange[0], Number(e.target.value)])}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ajusta los límites de los ejes X e Y para la visualización
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Ejemplos Precargados</Label>
                  <div className="space-y-2">
                    {EXAMPLE_FUNCTIONS.map((example) => (
                      <Card
                        key={example.name}
                        className="cursor-pointer p-3 transition-colors hover:bg-accent"
                        onClick={() => {
                          setInputValue(example.formula)
                          onFunctionChange(example.formula)
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{example.name}</p>
                            <p className="font-mono text-xs text-muted-foreground">{example.formula}</p>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{example.description}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "derivatives" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Derivadas Parciales</h3>
                  <p className="text-sm text-muted-foreground">
                    Haz clic en la superficie para calcular derivadas parciales y ver el plano tangente en ese punto.
                  </p>
                </div>

                <Card className="p-4">
                  <h4 className="mb-3 font-medium text-sm">Opciones de Visualización</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="show-gradient" className="text-sm font-medium">
                        Mostrar vector gradiente
                      </label>
                      <Switch id="show-gradient" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="show-tangent" className="text-sm font-medium">
                        Mostrar plano tangente
                      </label>
                      <Switch id="show-tangent" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="animate-gradient" className="text-sm font-medium">
                        Animar gradiente
                      </label>
                      <Switch id="animate-gradient" />
                    </div>
                  </div>
                </Card>

                <Card className="border-primary/20 bg-primary/5 p-4">
                  <h4 className="mb-2 font-medium text-sm">Información</h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>• El vector gradiente apunta en la dirección de máximo crecimiento</li>
                    <li>• El plano tangente aproxima la superficie localmente</li>
                    <li>• La magnitud del gradiente indica la tasa de cambio</li>
                  </ul>
                </Card>
              </div>
            )}

            {activeTab === "optimization" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Multiplicadores de Lagrange</h3>
                  <p className="text-sm text-muted-foreground">
                    Optimiza funciones con restricciones usando el método de Lagrange.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="constraint">Restricción g(x, y) = 0</Label>
                  <Input
                    id="constraint"
                    value={constraintFunction}
                    onChange={(e) => onConstraintChange(e.target.value)}
                    placeholder="Ej: x^2 + y^2 - 1"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Define la curva de restricción</p>
                </div>

                <Button className="w-full" onClick={handleCalculateCriticalPoints}>
                  Calcular Puntos Críticos
                </Button>

                <Card className="border-secondary/20 bg-secondary/5 p-4">
                  <h4 className="mb-2 font-medium text-sm">Método</h4>
                  <p className="text-xs text-muted-foreground">
                    Se buscan puntos donde ∇f = λ∇g, es decir, donde los gradientes son paralelos.
                  </p>
                </Card>
              </div>
            )}

            {activeTab === "integrals" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Integrales Múltiples</h3>
                  <p className="text-sm text-muted-foreground">
                    Calcula integrales dobles sobre regiones rectangulares.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="x-min" className="text-xs">
                        x mín
                      </Label>
                      <Input
                        id="x-min"
                        type="number"
                        value={xMin}
                        onChange={(e) => setXMin(Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="x-max" className="text-xs">
                        x máx
                      </Label>
                      <Input
                        id="x-max"
                        type="number"
                        value={xMax}
                        onChange={(e) => setXMax(Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="y-min" className="text-xs">
                        y mín
                      </Label>
                      <Input
                        id="y-min"
                        type="number"
                        value={yMin}
                        onChange={(e) => setYMin(Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="y-max" className="text-xs">
                        y máx
                      </Label>
                      <Input
                        id="y-max"
                        type="number"
                        value={yMax}
                        onChange={(e) => setYMax(Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>

                <Button className="w-full" onClick={handleCalculateIntegral}>
                  Calcular Integral
                </Button>

                <Card className="border-primary/20 bg-primary/5 p-4">
                  <h4 className="mb-2 font-medium text-sm">Método</h4>
                  <p className="text-xs text-muted-foreground">
                    Se usa integración numérica de Riemann con 50×50 subdivisiones para aproximar el valor de la
                    integral doble.
                  </p>
                </Card>
              </div>
            )}
          </ScrollArea>
        </div>
      </aside>
    </>
  )
}
 