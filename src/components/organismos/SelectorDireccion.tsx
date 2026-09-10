import { useEffect, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "../../store/AuthStore";
import {
  useCrearDireccionMutation,
  useDireccionesQuery,
} from "../../tanstack/DireccionesStack";
import { FormularioDireccion } from "./FormularioDireccion";
import { lineaDireccion } from "../../utils/direccion";
import type { DireccionInput } from "../../types/dominio";
import type { EnvioCheckout } from "../../supabaseCrud/crudCheckout";
import { v } from "../../styles/variables";

interface Props {
  /** Se llama con el payload de envío listo, o null si todavía falta. */
  onEnvio: (envio: EnvioCheckout | null) => void;
}

function aInline(input: DireccionInput): EnvioCheckout {
  return {
    destinatario: input.destinatario,
    telefono: input.telefono,
    cp: input.cp,
    estado: input.estado,
    municipio: input.municipio,
    colonia: input.colonia,
    calle: input.calle,
    numeroExterior: input.numeroExterior,
    numeroInterior: input.numeroInterior,
    entreCalles: input.entreCalles,
    referencias: input.referencias,
    lat: input.lat,
    lng: input.lng,
  };
}

export function SelectorDireccion({ onEnvio }: Props) {
  const session = useAuthStore((s) => s.session);
  const { data: direcciones } = useDireccionesQuery(!!session);
  const crear = useCrearDireccionMutation();

  // Selección efectiva = lo que el usuario tocó, o la predeterminada por
  // defecto (o "nueva" si no tiene ninguna guardada).
  const [seleccionManual, setSeleccionManual] = useState<
    number | "nueva" | null
  >(null);
  const [guardarEnLibreta, setGuardarEnLibreta] = useState(false);
  const [nuevaLista, setNuevaLista] = useState(false);

  const seleccionPorDefecto: number | "nueva" | null = !direcciones
    ? null
    : direcciones.length === 0
      ? "nueva"
      : (direcciones.find((d) => d.esPredeterminada) ?? direcciones[0]).id;
  const seleccion = seleccionManual ?? seleccionPorDefecto;

  // Reportar al padre cuando la selección efectiva es una dirección guardada.
  // "nueva" y null los maneja el submit del form / los handlers de radio.
  useEffect(() => {
    if (typeof seleccion === "number") onEnvio({ idDireccion: seleccion });
  }, [seleccion, onEnvio]);

  const elegirGuardada = (id: number) => {
    setSeleccionManual(id);
    setNuevaLista(false);
    onEnvio({ idDireccion: id });
  };

  const usarNueva = (input: DireccionInput) => {
    if (guardarEnLibreta && session) {
      crear.mutate(
        { input, hacerPredeterminada: (direcciones?.length ?? 0) === 0 },
        {
          onSuccess: () => toast.success("Dirección guardada en tu cuenta"),
          onError: (e) => toast.error((e as Error).message),
        }
      );
    }
    setNuevaLista(true);
    onEnvio(aInline(input));
  };

  const hayGuardadas = !!direcciones && direcciones.length > 0;

  return (
    <Caja>
      <h2>Dirección de envío</h2>

      {hayGuardadas &&
        direcciones!.map((d) => (
          <label key={d.id} className="opcion">
            <input
              type="radio"
              name="direccion"
              checked={seleccion === d.id}
              onChange={() => elegirGuardada(d.id)}
            />
            <span>
              <strong>
                {d.etiqueta ? `${d.etiqueta} · ` : ""}
                {d.destinatario}
              </strong>
              <em>{lineaDireccion(d)}</em>
            </span>
          </label>
        ))}

      <label className="opcion">
        <input
          type="radio"
          name="direccion"
          checked={seleccion === "nueva"}
          onChange={() => {
            setSeleccionManual("nueva");
            setNuevaLista(false);
            onEnvio(null);
          }}
        />
        <span>
          <strong>
            {hayGuardadas ? "Enviar a otra dirección" : "Cargar dirección de envío"}
          </strong>
        </span>
      </label>

      {seleccion === "nueva" && (
        <div className="form">
          {session ? (
            <label className="guardar">
              <input
                type="checkbox"
                checked={guardarEnLibreta}
                onChange={(e) => setGuardarEnLibreta(e.target.checked)}
              />
              Guardar esta dirección en mi cuenta
            </label>
          ) : (
            <p className="hint">
              <Link to="/acceso?redirect=/checkout">Iniciá sesión</Link> para
              guardar tus direcciones y ver tus pedidos.
            </p>
          )}

          <FormularioDireccion
            textoBoton={nuevaLista ? "Dirección lista ✓" : "Usar esta dirección"}
            onGuardar={usarNueva}
          />
        </div>
      )}
    </Caja>
  );
}

const Caja = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;

  h2 {
    font-size: 16px;
    margin: 0 0 6px;
  }

  .opcion {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid ${v.borderSutil};
    background: ${v.bgTarjeta};
    border-radius: 10px;
    cursor: pointer;
    font-size: 13.5px;

    input[type="radio"] {
      margin-top: 3px;
      accent-color: ${v.colorPrincipal};
    }
    span {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    em {
      font-style: normal;
      color: ${v.colorTextoSuave2};
      font-size: 12.5px;
    }
  }

  .form {
    padding: 16px;
    border: 1px solid ${v.borderSutil};
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .guardar {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: ${v.colorTextoSuave};
    input {
      accent-color: ${v.colorPrincipal};
    }
  }

  .hint {
    font-size: 12.5px;
    color: ${v.colorTextoSuave2};
    margin: 0;
    a {
      color: ${v.colorPrincipal};
    }
  }
`;
