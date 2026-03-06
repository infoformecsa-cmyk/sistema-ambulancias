"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function KilometrajePage() {

  const [ambulancia, setAmbulancia] = useState("");
  const [kilometraje, setKilometraje] = useState("");

  const registrarKilometraje = async () => {

    if (!ambulancia || !kilometraje) {
      alert("Complete todos los campos");
      return;
    }

    const { error } = await supabase
      .from("kilometraje")
      .insert([
        {
          ambulancia_id: ambulancia,
          kilometraje: Number(kilometraje)
        }
      ]);

    if (error) {
      alert("Error registrando kilometraje");
      console.error(error);
      return;
    }

    alert("Kilometraje registrado correctamente");

    setAmbulancia("");
    setKilometraje("");
  };

  return (
    <div style={{ padding: 40 }}>

      <h1>Registro de Kilometraje</h1>

      <div style={{ marginTop: 20 }}>

        <input
          placeholder="Código ambulancia (ALFA-01)"
          value={ambulancia}
          onChange={(e) => setAmbulancia(e.target.value)}
          style={{ display: "block", marginBottom: 10, padding: 8 }}
        />

        <input
          placeholder="Kilometraje"
          type="number"
          value={kilometraje}
          onChange={(e) => setKilometraje(e.target.value)}
          style={{ display: "block", marginBottom: 10, padding: 8 }}
        />

        <button
          onClick={registrarKilometraje}
          style={{ padding: 10 }}
        >
          Registrar
        </button>

      </div>

    </div>
  );
}