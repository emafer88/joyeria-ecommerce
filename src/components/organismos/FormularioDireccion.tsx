import { useEffect, useState } from "react";
import styled from "styled-components";
import { useForm } from "react-hook-form";
import { useCodigoPostalQuery } from "../../tanstack/DireccionesStack";
import { MapaUbicacion } from "./MapaUbicacion";
import type { Direccion, DireccionInput } from "../../types/dominio";
import { v } from "../../styles/variables";

interface Props {
  inicial?: Direccion | null;
  guardando?: boolean;
  textoBoton?: string;
  onGuardar: (input: DireccionInput) => void;
  onCancelar?: () => void;
}

type Campos = {
  etiqueta: string;
  destinatario: string;
  telefono: string;
  cp: string;
  estado: string;
  municipio: string;
  colonia: string;
  calle: string;
  numeroExterior: string;
  numeroInterior: string;
  entreCalles: string;
  referencias: string;
};

const OTRA = "__otra__";

export function FormularioDireccion({
  inicial,
  guardando = false,
  textoBoton = "Guardar dirección",
  onGuardar,
  onCancelar,
}: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Campos>({
    defaultValues: {
      etiqueta: inicial?.etiqueta ?? "",
      destinatario: inicial?.destinatario ?? "",
      telefono: inicial?.telefono ?? "",
      cp: inicial?.cp ?? "",
      estado: inicial?.estado ?? "",
      municipio: inicial?.municipio ?? "",
      colonia: inicial?.colonia ?? "",
      calle: inicial?.calle ?? "",
      numeroExterior: inicial?.numeroExterior ?? "",
      numeroInterior: inicial?.numeroInterior ?? "",
      entreCalles: inicial?.entreCalles ?? "",
      referencias: inicial?.referencias ?? "",
    },
  });

  // react-hook-form `watch` — el warning de React Compiler no aplica: el
  // compiler no está habilitado en este proyecto (ver README).
  // oxlint-disable-next-line react/incompatible-library
  const cp = watch("cp");
  const calle = watch("calle");
  const numeroExterior = watch("numeroExterior");
  const colonia = watch("colonia");
  const municipio = watch("municipio");
  const estado = watch("estado");

  const { data: lookup, isFetching: buscandoCp } = useCodigoPostalQuery(cp);

  const [coloniaLibre, setColoniaLibre] = useState(false);
  const [lat, setLat] = useState<number | null>(inicial?.lat ?? null);
  const [lng, setLng] = useState<number | null>(inicial?.lng ?? null);

  // CP resuelto -> autocompletar estado/municipio y, si la colonia actual no
  // está en la lista, dejar que el usuario elija.
  useEffect(() => {
    if (!lookup) return;
    setValue("estado", lookup.estado);
    setValue("municipio", lookup.municipio);
    if (colonia && !lookup.colonias.includes(colonia)) {
      setColoniaLibre(true);
    }
  }, [lookup, setValue, colonia]);

  const cpValido = /^\d{5}$/.test(cp);
  const cpSinResultados = cpValido && !buscandoCp && lookup === null;
  const direccionTexto = [
    `${calle} ${numeroExterior}`.trim(),
    colonia,
    municipio,
    `${estado} ${cp}`.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  const enviar = handleSubmit((c) => {
    onGuardar({
      etiqueta: c.etiqueta.trim() || null,
      destinatario: c.destinatario,
      telefono: c.telefono,
      cp: c.cp,
      estado: c.estado,
      municipio: c.municipio,
      colonia: c.colonia,
      calle: c.calle,
      numeroExterior: c.numeroExterior,
      numeroInterior: c.numeroInterior.trim() || null,
      entreCalles: c.entreCalles.trim() || null,
      referencias: c.referencias.trim() || null,
      lat,
      lng,
    });
  });

  return (
    <Form onSubmit={enviar} noValidate>
      <div className="grid">
        <label className="campo">
          <span>Destinatario</span>
          <input
            {...register("destinatario", { required: "Requerido" })}
            placeholder="Nombre de quien recibe"
          />
          {errors.destinatario && <em>{errors.destinatario.message}</em>}
        </label>

        <label className="campo">
          <span>Teléfono</span>
          <input
            {...register("telefono", { required: "Requerido" })}
            placeholder="10 dígitos"
            inputMode="tel"
          />
          {errors.telefono && <em>{errors.telefono.message}</em>}
        </label>

        <label className="campo">
          <span>Código postal</span>
          <input
            {...register("cp", {
              required: "Requerido",
              pattern: { value: /^\d{5}$/, message: "5 dígitos" },
            })}
            placeholder="00000"
            inputMode="numeric"
            maxLength={5}
          />
          {errors.cp && <em>{errors.cp.message}</em>}
          {buscandoCp && <em className="info">Buscando…</em>}
          {cpSinResultados && (
            <em className="info">
              CP no encontrado: completá estado, municipio y colonia a mano.
            </em>
          )}
        </label>

        <label className="campo">
          <span>Estado</span>
          <input
            {...register("estado", { required: "Requerido" })}
            readOnly={!!lookup}
          />
          {errors.estado && <em>{errors.estado.message}</em>}
        </label>

        <label className="campo">
          <span>Municipio / Alcaldía</span>
          <input
            {...register("municipio", { required: "Requerido" })}
            readOnly={!!lookup}
          />
          {errors.municipio && <em>{errors.municipio.message}</em>}
        </label>

        <label className="campo">
          <span>Colonia</span>
          {lookup && !coloniaLibre ? (
            <select
              {...register("colonia", { required: "Requerido" })}
              onChange={(e) => {
                if (e.target.value === OTRA) {
                  setColoniaLibre(true);
                  setValue("colonia", "");
                } else {
                  setValue("colonia", e.target.value);
                }
              }}
            >
              <option value="">Elegí una colonia</option>
              {lookup.colonias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={OTRA}>Otra (escribir)</option>
            </select>
          ) : (
            <input
              {...register("colonia", { required: "Requerido" })}
              placeholder="Nombre de la colonia"
            />
          )}
          {errors.colonia && <em>{errors.colonia.message}</em>}
        </label>

        <label className="campo campo--ancho">
          <span>Calle</span>
          <input
            {...register("calle", { required: "Requerido" })}
            placeholder="Nombre de la calle"
          />
          {errors.calle && <em>{errors.calle.message}</em>}
        </label>

        <label className="campo">
          <span>Número exterior</span>
          <input
            {...register("numeroExterior", { required: "Requerido" })}
            placeholder="123 o SN"
          />
          {errors.numeroExterior && <em>{errors.numeroExterior.message}</em>}
        </label>

        <label className="campo">
          <span>Número interior</span>
          <input {...register("numeroInterior")} placeholder="Depto, piso… (opcional)" />
        </label>

        <label className="campo campo--ancho">
          <span>Entre calles</span>
          <input {...register("entreCalles")} placeholder="Entre calle X y calle Y (opcional)" />
        </label>

        <label className="campo campo--ancho">
          <span>Referencias para la entrega</span>
          <textarea
            {...register("referencias")}
            rows={2}
            placeholder="Color de la fachada, portón, comercio cercano… (opcional)"
          />
        </label>

        <label className="campo campo--ancho">
          <span>Etiqueta</span>
          <input {...register("etiqueta")} placeholder="Casa, Trabajo… (opcional)" />
        </label>
      </div>

      <div className="mapa-wrap">
        <MapaUbicacion
          lat={lat}
          lng={lng}
          direccionTexto={direccionTexto}
          onCambio={(la, ln) => {
            setLat(la);
            setLng(ln);
          }}
        />
      </div>

      <div className="acciones">
        {onCancelar && (
          <button type="button" className="cancelar" onClick={onCancelar}>
            Cancelar
          </button>
        )}
        <button type="submit" className="guardar" disabled={guardando}>
          {guardando ? "Guardando…" : textoBoton}
        </button>
      </div>
    </Form>
  );
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  }

  .campo {
    display: flex;
    flex-direction: column;
    gap: 5px;
    &--ancho {
      grid-column: 1 / -1;
    }
    span {
      font-size: 12px;
      font-weight: 600;
      color: ${v.colorTextoSuave};
    }
    input,
    select,
    textarea {
      padding: 9px 11px;
      border-radius: 8px;
      border: 1px solid ${v.borderSutil};
      background: rgba(255, 255, 255, 0.03);
      color: ${v.colorTexto};
      font-size: 14px;
      font-family: inherit;
      &::placeholder {
        color: ${v.colorTextoSuave2};
      }
      &:focus {
        outline: none;
        border-color: ${v.borderDorado};
      }
      &:read-only {
        opacity: 0.7;
      }
    }
    select option {
      background: #16151f;
      color: ${v.colorTexto};
    }
    em {
      font-style: normal;
      font-size: 11.5px;
      color: #ff8a80;
    }
    em.info {
      color: ${v.colorTextoSuave2};
    }
  }

  .acciones {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  button {
    padding: 11px 20px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    transition: 0.2s;
    border: 1px solid ${v.borderSutil};
    background: ${v.bgTarjeta};
    color: ${v.colorTexto};
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .guardar {
    border-color: ${v.borderDorado};
    background: ${v.colorPrincipal};
    color: #1a1206;
    &:hover:not(:disabled) {
      filter: brightness(1.08);
    }
  }

  .cancelar:hover {
    border-color: ${v.borderDorado};
    color: ${v.colorPrincipal};
  }
`;
