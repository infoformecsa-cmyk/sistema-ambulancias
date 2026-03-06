"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AmbulanciasPage() {

  const [ambulancias, setAmbulancias] = useState<any[]>([]);

  useEffect(() => {
    cargarAmbulancias();
  }, []);

  async function cargarAmbulancias() {

    const { data, error } = await supabase
      .from("ambulancias")
      .select("*")
      .order("codigo_operativo");

    if (error) {
      console.log(error);
    } else {
      setAmbulancias(data || []);
    }
  }

  return (
    <div style={{padding:40}}>

      <h1>Listado de Ambulancias</h1>

      <table border={1} cellPadding={10}>

        <thead>
          <tr>
            <th>Código</th>
            <th>Placa</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>

        <tbody>

        {ambulancias.map((a) => (

          <tr key={a.id}>

            <td>{a.codigo_operativo}</td>

            <td>{a.placa}</td>

            <td>
              {a.estado_operativo ? "Operativa" : "Inoperativa"}
            </td>

            <td>

              <Link href={`/kilometraje?id=${a.id}`}>
                Registrar KM
              </Link>

            </td>

          </tr>

        ))}

        </tbody>

      </table>

    </div>
  );
}
