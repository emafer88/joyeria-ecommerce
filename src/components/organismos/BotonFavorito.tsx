import type { MouseEvent } from "react";
import styled from "styled-components";
import { toast } from "sonner";
import { useAuthStore } from "../../store/AuthStore";
import {
  useMisIdsFavoritosQuery,
  useToggleFavoritoMutation,
} from "../../tanstack/FavoritosStack";
import { v } from "../../styles/variables";

interface Props {
  idProducto: number;
  className?: string;
}

export function BotonFavorito({ idProducto, className }: Props) {
  const session = useAuthStore((s) => s.session);
  const { data: ids } = useMisIdsFavoritosQuery(!!session);
  const toggle = useToggleFavoritoMutation();
  const marcado = !!ids?.includes(idProducto);

  const click = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      toast.info("Iniciá sesión para guardar favoritos");
      return;
    }
    toggle.mutate({ idProducto, marcado });
  };

  return (
    <Boton
      type="button"
      className={className}
      $marcado={marcado}
      onClick={click}
      aria-label={marcado ? "Quitar de favoritos" : "Agregar a favoritos"}
      disabled={toggle.isPending}
    >
      {marcado ? "♥" : "♡"}
    </Boton>
  );
}

const Boton = styled.button<{ $marcado: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${v.borderSutil};
  background: rgba(10, 9, 15, 0.6);
  backdrop-filter: blur(4px);
  color: ${(p) => (p.$marcado ? "#ff5a7a" : v.colorTexto)};
  font-size: 16px;
  cursor: pointer;
  transition: 0.2s;
  &:hover:not(:disabled) {
    border-color: #ff5a7a;
    color: #ff5a7a;
  }
  &:disabled {
    opacity: 0.7;
    cursor: default;
  }
`;
