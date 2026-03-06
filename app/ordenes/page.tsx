"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Orden = {
  id: number;
  ambulancia_id: string;
  descripcion: string;
  estado: string;
  fecha: string;
};

export default function OrdenesPage() {

  const [ordenes, setOrdenes] = useState<Orden[]>([]);

  useEffect(() => {
    cargarOrdenes();
  }, []);

  const cargarOrdenes = async () => {

    const { data, error } = await supabase
      .from("ordenes_trabajo")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setOrdenes(data);
    }
  };

  return (
    <div style={{ padding: 40 }}>

      <h1>Órdenes de Trabajo</h1>

      {ordenes.length === 0 && (
        <p>No existen órdenes registradas.</p>
      )}

      <table border={1} cellPadding={10} style={{ marginTop: 20 }}>

        <thead>
          <tr>
            <th>Ambulancia</th>
            <th>Descripción</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
        </thead>

        <tbody>

          {ordenes.map((orden) => (

            <tr key={orden.id}>
              <td>{orden.ambulancia_id}</td>
              <td>{orden.descripcion}</td>
              <td>{orden.estado}</td>
              <td>{orden.fecha}</td>
            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}