"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Falla = {
  id: number;
  descripcion: string;
  criticidad: string;
  fecha: string;
};

export default function AmbulanciaPage({ params }: { params: { id: string } }) {

  const [fallas, setFallas] = useState<Falla[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const [criticidad, setCriticidad] = useState("Media");

  const cargarFallas = async () => {

    const { data, error } = await supabase
      .from("fallas")
      .select("*")
      .eq("ambulancia_id", params.id)
      .order("fecha", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setFallas(data);
    }
  };

  useEffect(() => {
    cargarFallas();
  }, []);

  const registrarFalla = async () => {

    const { error } = await supabase
      .from("fallas")
      .insert([
        {
          ambulancia_id: params.id,
          descripcion,
          criticidad
        }
      ]);

    if (error) {
      alert("Error registrando falla");
      return;
    }

    setDescripcion("");
    cargarFallas();
  };

  return (
    <div style={{ padding: 40 }}>

      <h1>Ficha Ambulancia {params.id}</h1>

      <h2>Reportar falla mecánica</h2>

      <textarea
        placeholder="Describa la falla"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        style={{ width: "100%", height: 100 }}
      />

      <br /><br />

      <select
        value={criticidad}
        onChange={(e) => setCriticidad(e.target.value)}
      >
        <option>Alta</option>
        <option>Media</option>
        <option>Baja</option>
      </select>

      <br /><br />

      <button onClick={registrarFalla}>
        Registrar falla
      </button>

      <hr style={{ marginTop: 40 }} />

      <h3>Historial de fallas</h3>

      <table border={1} cellPadding={10}>

        <thead>
          <tr>
            <th>Fecha</th>
            <th>Descripción</th>
            <th>Criticidad</th>
          </tr>
        </thead>

        <tbody>

          {fallas.map((falla) => (

            <tr key={falla.id}>
              <td>{falla.fecha}</td>
              <td>{falla.descripcion}</td>
              <td>{falla.criticidad}</td>
            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}