"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabaseClient"

export default function Importar(){

const [file,setFile] = useState<File | null>(null)
const [loading,setLoading] = useState(false)

async function procesar(){

if(!file){
alert("Seleccione archivo")
return
}

setLoading(true)

try{

const data = await file.arrayBuffer()
const workbook = XLSX.read(data)

/* 🔥 USAR PRIMERA HOJA */
const sheet = workbook.Sheets[workbook.SheetNames[0]]

/* 🔥 CONVERTIR A JSON */
const json:any[] = XLSX.utils.sheet_to_json(sheet)

console.log("DATA EXCEL:", json)

/* 🔥 FUNCIÓN FLEXIBLE PARA LEER CAMPOS */
function getValue(item:any, keys:string[]){
for(const k of keys){
if(item[k] !== undefined && item[k] !== "") return item[k]
}
return null
}

/* 🔥 LIMPIEZA INTELIGENTE */
const registros = json
.map((item:any)=>{

const nombre = getValue(item,[
"Descripción del dispositivo médico",
"DESCRIPCIÓN DEL DISPOSITIVO MÉDICO",
"Descripcion del dispositivo medico",
"Descripción",
"DESCRIPCION",
"descripcion"
])

if(!nombre) return null

return {

nombre,

codigo: getValue(item,[
"Código",
"CODIGO",
"codigo",
"ITEM",
"Ítem"
]),

stock: Number(
getValue(item,[
"SALDO ACTUAL",
"Stock",
"stock",
"Saldo"
]) || 0
),

lote: getValue(item,[
"LOTE",
"Lote"
]),

fecha_caducidad: getValue(item,[
"FECHA CADUCIDAD",
"Caducidad",
"fecha_caducidad"
])

}

})
.filter(Boolean)

console.log("REGISTROS LIMPIOS:", registros)

/* 🚨 VALIDACIÓN */
if(registros.length === 0){
alert("No se detectaron datos válidos en el Excel")
setLoading(false)
return
}

/* 🔥 INSERT MASIVO */
const { error } = await supabase
.from("inventario_items")
.insert(registros)

if(error){
console.error("ERROR SUPABASE:", error)
alert("Error al importar")
}else{
alert(`Importación completada 🚑 (${registros.length} registros)`)
}

}catch(err){
console.error("ERROR GENERAL:", err)
alert("Error procesando archivo")
}

setLoading(false)
}

return(
<div style={{padding:40}}>

<h1>📦 Importar Dispositivos</h1>

<input
type="file"
accept=".xlsx,.xls"
onChange={(e)=>setFile(e.target.files?.[0] || null)}
/>

<br/><br/>

<button onClick={procesar}>
{loading ? "Importando..." : "Importar"}
</button>

</div>
)
}