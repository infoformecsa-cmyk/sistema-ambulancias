'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Historial(){

const router = useRouter()

const [data,setData] = useState<any[]>([])
const [loading,setLoading] = useState(true)
const [fecha,setFecha] = useState("")

useEffect(()=>{
cargar()
},[])

const cargar = async ()=>{

let query = supabase
.from('asistencia')
.select(`
id,
fecha,
estado,
observacion,
turno,
archivo_url,
archivo_nombre,
personal:personal_id (nombre)
`)
.order('fecha',{ascending:false})

if(fecha){
query = query.eq('fecha',fecha)
}

const { data } = await query

setData(data || [])
setLoading(false)
}

if(loading){
return (
<div className="min-h-screen bg-black text-white flex items-center justify-center">
Cargando historial...
</div>
)
}

return(
<div className="min-h-screen bg-black text-white p-6">

{/* HEADER */}
<div className="flex justify-between items-center mb-6">
<h1 className="text-3xl text-cyan-400 font-bold">
📊 Historial de Asistencia
</h1>

<button 
onClick={()=>router.back()} 
className="bg-blue-600 px-4 py-2 rounded"
>
⬅ Volver
</button>
</div>

{/* FILTRO */}
<div className="mb-6 flex gap-3">
<input
type="date"
value={fecha}
onChange={(e)=>setFecha(e.target.value)}
className="bg-gray-800 p-2 rounded"
/>

<button
onClick={cargar}
className="bg-green-600 px-4 py-2 rounded"
>
Filtrar
</button>
</div>

{/* TABLA */}
<div className="bg-gray-900 rounded-xl p-4">

{data.length === 0 && (
<p className="text-gray-400">No hay registros</p>
)}

{data.map((r:any)=>(
<div key={r.id} className="border-b py-3 flex justify-between items-center">

<div>
<p className="font-semibold">{r.personal?.nombre}</p>
<p className="text-xs text-gray-400">
{new Date(r.fecha).toLocaleDateString('es-EC')} | {r.turno}
</p>
<p className="text-xs">{r.estado}</p>
<p className="text-xs text-gray-500">{r.observacion}</p>
</div>

<div className="flex items-center gap-3">

{r.archivo_url && (
<a 
href={r.archivo_url} 
target="_blank"
className="bg-cyan-600 px-3 py-1 rounded text-xs"
>
📎 Ver
</a>
)}

</div>

</div>
))}

</div>

</div>
)
}