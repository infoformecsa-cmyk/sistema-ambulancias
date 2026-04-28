'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {

const router = useRouter()

const [personal, setPersonal] = useState<any[]>([])
const [archivos, setArchivos] = useState<any[]>([])
const [ambulancias, setAmbulancias] = useState<any[]>([])

const [editando, setEditando] = useState<any>(null)
const [nuevo, setNuevo] = useState(false)

const [nuevaAmbulancia, setNuevaAmbulancia] = useState(false)
const [codigoAmbulancia, setCodigoAmbulancia] = useState("")

const [loading, setLoading] = useState(true)

const [formNuevo, setFormNuevo] = useState<any>({
nombre:"",
tipo:"ambulancia",
guardia:"G1",
ambulancia_codigo:""
})

useEffect(()=>{ iniciar() },[])

const iniciar = async ()=>{
await fetchData()
setLoading(false)
}

/* FETCH */
const fetchData = async () => {
try{
const { data: p } = await supabase.from('personal').select('*')

const { data: a } = await supabase
.from('asistencia')
.select(`id,fecha,archivo_url,archivo_nombre,personal(nombre)`)
.order('fecha',{ascending:false})

const archivosAdaptados = (a || []).map((r:any)=>({
id: r.id,
nombre: r.personal?.nombre || 'SIN NOMBRE',
fecha: r.fecha,
archivo_url: r.archivo_url
}))

const { data: amb } = await supabase
.from('ambulancias')
.select('codigo_operativo')
.order('codigo_operativo')

setPersonal(p || [])
setArchivos(archivosAdaptados || [])
setAmbulancias(amb || [])

}catch(e){
alert("Error general")
}
}

/* CRUD */
const eliminar = async (id:number)=>{
if(!confirm("¿Eliminar?")) return
await supabase.from('personal').delete().eq('id',id)
await fetchData()
}

const actualizar = async ()=>{
await supabase.from('personal')
.update({ nombre: editando.nombre })
.eq('id', editando.id)

setEditando(null)
await fetchData()
}

const crearNuevo = async ()=>{
if(!formNuevo.nombre) return alert("Nombre requerido")

await supabase.from('personal').insert([{
...formNuevo,
estado:"Activo"
}])

setNuevo(false)
await fetchData()
}

const crearAmbulancia = async ()=>{
if(!codigoAmbulancia) return alert("Código requerido")

await supabase.from('ambulancias')
.insert([{ codigo_operativo: codigoAmbulancia }])

setNuevaAmbulancia(false)
setCodigoAmbulancia("")
await fetchData()
}

/* UI helpers */
const getAmbulancia = (g:string)=>
personal.filter(p=>p.guardia===g && p.tipo==="ambulancia")

const agruparPorAmbulancia = (data:any[])=>{
const grupos:any={}
data.forEach(p=>{
const key = p.ambulancia_codigo || 'SIN UNIDAD'
if(!grupos[key]) grupos[key]=[]
grupos[key].push(p)
})
return Object.entries(grupos)
}

if (loading) return <div className="text-white">Cargando...</div>

const guardias = ['G1','G2','G3','G4','G5']

return (
<div className="min-h-screen bg-black text-white p-6">

{/* HEADER */}
<div className="flex justify-between mb-6">
<h1 className="text-3xl text-cyan-400">CONTROL OPERATIVO</h1>

<div className="flex gap-2">
<button onClick={fetchData}>Actualizar</button>
<button onClick={()=>setNuevo(true)}>Nuevo</button>
<button onClick={()=>setNuevaAmbulancia(true)}>Ambulancia</button>
</div>
</div>

{/* 🔥 MODAL NUEVO */}
{nuevo && (
<div className="fixed inset-0 bg-black/70 flex items-center justify-center">
<div className="bg-gray-900 p-4">
<input
placeholder="Nombre"
value={formNuevo.nombre}
onChange={(e)=>setFormNuevo({...formNuevo,nombre:e.target.value})}
/>
<button onClick={crearNuevo}>Guardar</button>
<button onClick={()=>setNuevo(false)}>Cerrar</button>
</div>
</div>
)}

{/* 🔥 MODAL AMBULANCIA */}
{nuevaAmbulancia && (
<div className="fixed inset-0 bg-black/70 flex items-center justify-center">
<div className="bg-gray-900 p-4">
<input
placeholder="Código"
value={codigoAmbulancia}
onChange={(e)=>setCodigoAmbulancia(e.target.value)}
/>
<button onClick={crearAmbulancia}>Guardar</button>
<button onClick={()=>setNuevaAmbulancia(false)}>Cerrar</button>
</div>
</div>
)}

{/* CONTENIDO ORIGINAL */}
{guardias.map((g)=>{

const ambulancias = agruparPorAmbulancia(getAmbulancia(g))

return(
<div key={g}>
<h2>{g}</h2>

{ambulancias.map(([amb,personas]:any)=>(
<div key={amb}>
<h3>{amb}</h3>

{personas.map((p:any)=>(
<div key={p.id}>
{p.nombre}
<button onClick={()=>eliminar(p.id)}>X</button>
</div>
))}

</div>
))}

</div>
)
})}

{/* EDITAR */}
{editando && (
<div>
<input
value={editando.nombre}
onChange={(e)=>setEditando({...editando,nombre:e.target.value})}
/>
<button onClick={actualizar}>Guardar</button>
</div>
)}

</div>
)
}