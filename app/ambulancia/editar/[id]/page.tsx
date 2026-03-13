"use client"

import {useEffect,useState} from "react"
import {supabase} from "@/lib/supabaseClient"
import {useRouter,useParams} from "next/navigation"

export default function EditarAmbulancia(){

const router = useRouter()
const params = useParams()
const id = params?.id

const [codigo,setCodigo] = useState("")
const [placa,setPlaca] = useState("")
const [tipo,setTipo] = useState("ALFA")
const [estado,setEstado] = useState("operativa")

useEffect(()=>{
cargar()
},[])

async function cargar(){

const {data} = await supabase
.from("ambulancias")
.select("*")
.eq("id",id)
.single()

if(data){

setCodigo(data.codigo_operativo)
setPlaca(data.placa)
setTipo(data.tipo)
setEstado(data.estado)

}

}

async function guardar(){

const {error} = await supabase
.from("ambulancias")
.update({
codigo_operativo:codigo,
placa:placa,
tipo:tipo,
estado:estado
})
.eq("id",id)

if(error){

alert("Error actualizando ambulancia")
return

}

alert("Ambulancia actualizada")

router.push("/dashboard")

}

return(

<div style={{padding:40,fontFamily:"Arial"}}>

<h1>Editar Ambulancia</h1>

<p>Código operativo</p>

<input
value={codigo}
onChange={(e)=>setCodigo(e.target.value)}
/>

<p>Placa</p>

<input
value={placa}
onChange={(e)=>setPlaca(e.target.value)}
/>

<p>Tipo</p>

<select
value={tipo}
onChange={(e)=>setTipo(e.target.value)}
>

<option value="ALFA">ALFA</option>
<option value="BRAVO">BRAVO</option>

</select>

<p>Estado</p>

<select
value={estado}
onChange={(e)=>setEstado(e.target.value)}
>

<option value="operativa">Operativa</option>
<option value="mantenimiento">Mantenimiento</option>
<option value="no operativa">No Operativa</option>

</select>

<br/><br/>

<button onClick={guardar}>
Guardar cambios
</button>

<button
onClick={()=>router.push("/dashboard")}
style={{marginLeft:10}}
>
Cancelar
</button>

</div>

)

}