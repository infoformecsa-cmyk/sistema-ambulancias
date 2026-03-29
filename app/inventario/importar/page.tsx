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
const sheet = workbook.Sheets[workbook.SheetNames[0]]

const json:any[] = XLSX.utils.sheet_to_json(sheet)

console.log("DATA EXCEL:", json)

/* 🔥 LIMPIEZA Y TRANSFORMACIÓN */
const registros = json
.map((item:any)=>{

const nombre =
item["Descripción"] ||
item["DESCRIPCION"] ||
item["descripcion"] ||
null

if(!nombre) return null // evita filas vacías

return {
nombre: nombre,

codigo:
item["Código"] ||
item["CODIGO"] ||
item["codigo"] ||
null,

stock: Number(
item["Stock"] ||
item["SALDO ACTUAL"] ||
item["saldo"] ||
0
),

lote:
item["Lote"] ||
item["LOTE"] ||
null,

fecha_caducidad:
item["Caducidad"] ||
item["FECHA CADUCIDAD"] ||
item["fecha_caducidad"] ||
null
}

})
.filter(Boolean) // elimina nulls

console.log("REGISTROS LIMPIOS:", registros)

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