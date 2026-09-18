import { useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "sonner";
import { useAuthStore, nombreVisible } from "../store/AuthStore";
import {
  useActualizarTelefonoMutation,
  useMiPerfilQuery,
} from "../tanstack/PerfilStack";
import { v } from "../styles/variables";

export function MiPerfil() {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useMiPerfilQuery(!!session);
  const actualizar = useActualizarTelefonoMutation();

  const [telefono, setTelefono] = useState("");

  useEffect(() => {
    setTelefono(data?.telefono ?? "");
  }, [data?.telefono]);

  const guardar = () => {
    actualizar.mutate(telefono.trim(), {
      onSuccess: () => toast.success("Teléfono actualizado"),
      onError: (e) => toast.error((e as Error).message),
    });
  };

  return (
    <Container>
      <span className="etiqueta">Tu cuenta</span>
      <h1>Mi perfil</h1>

      {isLoading ? (
        <p>Cargando…</p>
      ) : (
        <div className="tarjeta">
          <div className="campo">
            <label>Nombre</label>
            <span className="valor">{nombreVisible(user)}</span>
          </div>
          <div className="campo">
            <label>Email</label>
            <span className="valor">{user?.email ?? "-"}</span>
          </div>
          <div className="campo">
            <label htmlFor="telefono">Teléfono</label>
            <input
              id="telefono"
              type="tel"
              placeholder="Tu teléfono de contacto"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={actualizar.isPending}
            onClick={guardar}
          >
            {actualizar.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
          <p className="nota">
            El nombre y el email vienen de tu cuenta de Google y no se
            pueden editar acá.
          </p>
        </div>
      )}
    </Container>
  );
}

const Container = styled.div`
  max-width: 480px;
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

  .tarjeta {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
    border: 1px solid ${v.borderSutil};
    background: ${v.bgTarjeta};
    border-radius: ${v.borderRadius};
  }

  .campo {
    display: flex;
    flex-direction: column;
    gap: 6px;
    label {
      font-size: 12px;
      font-weight: 600;
      color: ${v.colorTextoSuave};
    }
    .valor {
      font-size: 14.5px;
      color: ${v.colorTexto};
    }
    input {
      padding: 9px 11px;
      border-radius: 8px;
      border: 1px solid ${v.borderSutil};
      background: rgba(255, 255, 255, 0.03);
      color: ${v.colorTexto};
      font-size: 14px;
      font-family: inherit;
      &:focus {
        outline: none;
        border-color: ${v.borderDorado};
      }
    }
  }

  button {
    align-self: flex-start;
    padding: 10px 22px;
    border-radius: 20px;
    border: 1px solid ${v.borderDorado};
    background: rgba(243, 210, 12, 0.1);
    color: ${v.colorPrincipal};
    font-weight: 600;
    font-size: 13.5px;
    font-family: inherit;
    cursor: pointer;
    transition: 0.2s;
    &:hover:not(:disabled) {
      background: rgba(243, 210, 12, 0.18);
    }
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .nota {
    margin: 0;
    font-size: 12px;
    color: ${v.colorTextoSuave2};
  }
`;
