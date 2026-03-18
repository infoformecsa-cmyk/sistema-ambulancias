import { Suspense } from "react"
import HistorialContent from "./historialcontent"

export const dynamic = "force-dynamic"

export default function Page(){
  return (
    <Suspense fallback={<div>Cargando historial...</div>}>
      <HistorialContent />
    </Suspense>
  )
}