import { useState } from "react";
import styled from "styled-components";
import { toast } from "sonner";
import { useAuthStore } from "../store/AuthStore";
import {
  useCrearDireccionMutation,
  useDireccionesQuery,
  useEditarDireccionMutation,
  useEliminarDireccionMutation,
  useMarcarPredeterminadaMutation,
} from "../tanstack/DireccionesStack";
import { FormularioDireccion } from "../components/organismos/FormularioDireccion";
import { lineaDireccion } from "../utils/direccion";
import type { Direccion, DireccionInput } from "../types/dominio";
import { v } from "../styles/variables";

export function MisDirecciones() {
  const session = useAuthStore((s) => s.session);
  const { data, isLoading, isError, error } = useDireccionesQuery(!!session);

  const crear = useCrearDireccionMutation();
  const editar = useEditarDireccionMutation();
  const eliminar = useEliminarDireccionMutation();
  const predeterminar = useMarcarPredeterminadaMutation();

  const [modo, setModo] = useState<"nuevo" | number | null>(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState<number | null>(null);

  const guardarNueva = (input: DireccionInput) => {
    crear.mutate(
      { input, hacerPredeterminada: (data?.length ?? 0) === 0 },
      {
        onSuccess: () => {
          toast.success("Dirección guardada");
          setModo(null);
        },
        onError: (e) => toast.error((e as Error).message),
      }
    );
  };

  const guardarEdicion = (id: number, input: DireccionInput) => {
    editar.mutate(
      { id, input },
      {
        onSuccess: () => {
          toast.success("Dirección actualizada");
          setModo(null);
        },
        onError: (e) => toast.error((e as Error).message),
      }
    );
  };

  const borrar = (id: number) => {
    eliminar.mutate(id, {
      onSuccess: () => {
        toast.success("Dirección eliminada");
        setConfirmarBorrar(null);
      },
      onError: (e) => toast.error((e as Error).message),
    });
  };

  return (
    <Container>
      <span className="etiqueta">Tu cuenta</span>
      <h1>Mis direcciones</h1>

      {isLoading && <p>Cargando…</p>}
      {isError && (
        <p className="error">No se pudieron cargar: {(error as Error).message}</p>
      )}

      {data && (
        <ul className="lista">
          {data.map((d: Direccion) =>
            modo === d.id ? (
              <li key={d.id} className="editor">
                <FormularioDireccion
                  inicial={d}
                  guardando={editar.isPending}
                  textoBoton="Guardar cambios"
                  onGuardar={(input) => guardarEdicion(d.id, input)}
                  onCancelar={() => setModo(null)}
                />
              </li>
            ) : (
              <li key={d.id}>
                <div className="cabecera">
                  <span className="nombre">
                    {d.etiqueta ? `${d.etiqueta} · ` : ""}
                    {d.destinatario}
                  </span>
                  {d.esPredeterminada && (
                    <span className="badge">Predeterminada</span>
                  )}
                </div>
                <span className="linea">{lineaDireccion(d)}</span>
                <span className="tel">Tel. {d.telefono}</span>
                {d.referencias && (
                  <span className="ref">{d.referencias}</span>
                )}

                <div className="acciones">
                  {!d.esPredeterminada && (
                    <button
                      type="button"
                      onClick={() => predeterminar.mutate(d.id)}
                    >
                      Marcar predeterminada
                    </button>
                  )}
                  <button type="button" onClick={() => setModo(d.id)}>
                    Editar
                  </button>
                  {confirmarBorrar === d.id ? (
                    <>
                      <button
                        type="button"
                        className="peligro"
                        disabled={eliminar.isPending}
                        onClick={() => borrar(d.id)}
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmarBorrar(null)}
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="peligro"
                      onClick={() => setConfirmarBorrar(d.id)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            )
          )}
        </ul>
      )}

      {modo === "nuevo" ? (
        <div className="editor nuevo">
          <h2>Nueva dirección</h2>
          <FormularioDireccion
            guardando={crear.isPending}
            onGuardar={guardarNueva}
            onCancelar={() => setModo(null)}
          />
        </div>
      ) : (
        <button
          type="button"
          className="agregar"
          onClick={() => setModo("nuevo")}
        >
          + Agregar dirección
        </button>
      )}
    </Container>
  );
}

const Container = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 24px 60px;

  .etiqueta {
    color: ${v.colorPrincipal};
    font-weight: 700;
    font-size: 12.5px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  h1 {
    margin: 8px 0 24px;
    font-size: 28px;
  }

  h2 {
    font-size: 16px;
    margin: 0 0 16px;
  }

  .error {
    color: #ff8a80;
  }

  .lista {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;

    li {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px;
      border: 1px solid ${v.borderSutil};
      background: ${v.bgTarjeta};
      border-radius: ${v.borderRadius};
    }
  }

  .cabecera {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 2px;
  }

  .nombre {
    font-weight: 700;
  }

  .badge {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 20px;
    color: ${v.colorPrincipal};
    border: 1px solid ${v.borderDorado};
    background: rgba(243, 210, 12, 0.1);
  }

  .linea {
    font-size: 13.5px;
    color: ${v.colorTextoSuave};
  }

  .tel,
  .ref {
    font-size: 12.5px;
    color: ${v.colorTextoSuave2};
  }

  .acciones {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;

    button {
      padding: 7px 14px;
      border-radius: 20px;
      border: 1px solid ${v.borderSutil};
      background: transparent;
      color: ${v.colorTextoSuave};
      font-size: 12.5px;
      font-family: inherit;
      cursor: pointer;
      transition: 0.2s;
      &:hover:not(:disabled) {
        border-color: ${v.borderDorado};
        color: ${v.colorPrincipal};
      }
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      &.peligro:hover:not(:disabled) {
        border-color: rgba(255, 90, 90, 0.5);
        color: #ff8a80;
      }
    }
  }

  .editor,
  .nuevo {
    padding: 20px;
    border: 1px solid ${v.borderSutil};
    background: ${v.bgTarjeta};
    border-radius: ${v.borderRadius};
  }

  .agregar {
    padding: 12px 20px;
    border-radius: 20px;
    border: 1px dashed ${v.borderDorado};
    background: transparent;
    color: ${v.colorPrincipal};
    font-weight: 600;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    transition: 0.2s;
    &:hover {
      background: rgba(243, 210, 12, 0.08);
    }
  }
`;
