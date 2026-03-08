"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Alertas(){

const [alertas,setAlertas] = useState<any[]>([])

/* ================================
CARGAR ALERTAS
================================ */

useEffect(()=>{
generarAlertas()
},[])

const generarAlertas = async ()=>{

let lista:any[] = []

/* ================================
OBTENER AMBULANCIAS
================================ */

const {data:ambulancias} = await supabase
.from("ambulancias")
.select("*")

if(!ambulancias) return

/* ================================
OBTENER MANTENIMIENTOS
================================ */

const {data:mantenimientos} = await supabase
.from("mantenimientos")
.select("*")

ambulancias.forEach((a:any)=>{

/* ================================
FILTRAR HISTORIAL
================================ */

const historial = mantenimientos?.filter(
(m:any)=>m.ambulancia_id === a.id
)

/* ================================
ULTIMO MANTENIMIENTO
================================ */

let ultimo = historial?.sort((a:any,b:any)=>{

return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()

})[0]

/* ================================
ALERTA POR MANTENIMIENTO
================================ */

if(!ultimo){

lista.push({
codigo:a.codigo_operativo,
mensaje:"Sin mantenimiento registrado"
})

}

if(ultimo){

let dias = Math.floor(
(Date.now() - new Date(ultimo.fecha).getTime()) / (1000*60*60*24)
)

if(dias > 60){

lista.push({
codigo:a.codigo_operativo,
mensaje:"Mantenimiento vencido ("+dias+" días)"
})

}

}

/* ================================
ALERTA ESTADO
================================ */

if(a.estado === "no operativa"){

lista.push({
codigo:a.codigo_operativo,
mensaje:"Ambulancia no operativa"
})

}

})

setAlertas(lista)

}

/* ================================
INTERFAZ
================================ */

return(

<div style={{padding:"40px"}}>

<h1>SSM Guayas – APH</h1>

<h2>Alertas mecánicas</h2>

<hr style={{margin:"20px 0"}}/>

{alertas.length === 0 && (
<p>No hay alertas activas</p>
)}

{alertas.map((a:any,i:number)=>(

<div
key={i}
style={{
border:"1px solid red",
padding:"10px",
marginBottom:"10px"
}}
>

<b>{a.codigo}</b>

<div>{a.mensaje}</div>

</div>

))}

</div>

)

}