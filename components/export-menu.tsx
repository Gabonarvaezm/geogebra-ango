"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, Share2, ImageIcon, Link2, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ExportMenuProps {
  currentFunction: string
}

export function ExportMenu({ currentFunction }: ExportMenuProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleExportImage = () => {
    const canvas = document.querySelector("canvas")
    if (!canvas) {
      toast({
        title: "Error",
        description: "No se pudo encontrar el canvas para exportar",
        variant: "destructive",
      })
      return
    }

    try {
      canvas.toBlob((blob) => {
        if (!blob) return

        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `calculo-multivariable-${Date.now()}.png`
        link.click()
        URL.revokeObjectURL(url)

        toast({
          title: "Imagen exportada",
          description: "La visualización se ha descargado como PNG",
        })
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar la imagen",
        variant: "destructive",
      })
    }
  }

  const handleShareLink = () => {
    try {
      const encodedFunc = encodeURIComponent(currentFunction)
      const shareUrl = `${window.location.origin}${window.location.pathname}?f=${encodedFunc}`

      navigator.clipboard.writeText(shareUrl)
      setCopied(true)

      toast({
        title: "Enlace copiado",
        description: "El enlace para compartir se ha copiado al portapapeles",
      })

      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      })
    }
  }

  const handleSaveConfig = () => {
    try {
      const config = {
        function: currentFunction,
        timestamp: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `configuracion-${Date.now()}.json`
      link.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Configuración guardada",
        description: "La configuración se ha descargado como JSON",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Share2 className="h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleExportImage}>
          <ImageIcon className="mr-2 h-4 w-4" />
          Exportar como PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareLink}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Link2 className="mr-2 h-4 w-4" />}
          {copied ? "Enlace copiado" : "Compartir enlace"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSaveConfig}>
          <Download className="mr-2 h-4 w-4" />
          Guardar configuración
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
