import { useState } from "react";
import styled from "styled-components";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  useImagenesProductoQuery,
  usePiezasDisponiblesQuery,
  useProductoDetalleQuery,
  useVariantesDisponiblesQuery,
} from "../tanstack/CatalogoStack";
import { useCarritoStore } from "../store/CarritoStore";
import { claveCarritoItem } from "../types/dominio";
import { v } from "../styles/variables";

export function ProductoDetalle() {
  const { id } = useParams<{ id: string }>();
  const idProducto = id ? Number(id) : undefined;
  const [idVarianteElegida, setIdVarianteElegida] = useState<number>();
  const [cantidad, setCantidad] = useState(1);

  const { data: producto, isLoading, isError } =
    useProductoDetalleQuery(idProducto);
  const { data: imagenes } = useImagenesProductoQuery(idProducto);
  const { data: variantes } = useVariantesDisponiblesQuery(
    producto?.esJoyeria ? idProducto : undefined
  );
  const { data: piezas, isLoading: piezasCargando } =
    usePiezasDisponiblesQuery(idVarianteElegida);

  const items = useCarritoStore((s) => s.items);
  const agregarPieza = useCarritoStore((s) => s.agregarPieza);
  const agregarProducto = useCarritoStore((s) => s.agregarProducto);

  const varianteElegida = variantes?.find(
    (v) => v.idVariante === idVarianteElegida
  );
  const imagenPortada = imagenes?.[0]?.url ?? null;

  if (isLoading) return <Container>Cargando...</Container>;
  if (isError || !producto)
    return (
      <Container>
        <p>No se encontró el producto.</p>
        <Link to="/">Volver al catálogo</Link>
      </Container>
    );

  return (
    <Container>
      <Link className="volver" to="/">
        ← Volver al catálogo
      </Link>

      <div className="layout">
        <div className="galeria">
          {imagenes && imagenes.length > 0 ? (
            imagenes.map((img) => (
              <img key={img.id} src={img.url} alt={producto.nombre} />
            ))
          ) : (
            <div className="sin-imagen">Sin imágenes</div>
          )}
        </div>

        <div className="info">
          <span className="categoria">{producto.categoria}</span>
          <h1>{producto.nombre}</h1>
          {producto.descripcion && <p>{producto.descripcion}</p>}

          {!producto.esJoyeria && (
            <>
              <span className="precio">
                {producto.precioVenta > 0
                  ? `$ ${producto.precioVenta.toLocaleString()}`
                  : "Consultar precio"}
              </span>
              <div className="acciones-compra">
                <input
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={(e) =>
                    setCantidad(Math.max(1, Number(e.target.value) || 1))
                  }
                />
                <button
                  type="button"
                  disabled={producto.precioVenta <= 0}
                  onClick={() => {
                    agregarProducto(
                      {
                        idProducto: producto.id,
                        nombre: producto.nombre,
                        precioVenta: producto.precioVenta,
                        imagen: imagenPortada,
                      },
                      cantidad
                    );
                    toast.success("Agregado al carrito");
                  }}
                >
                  Agregar al carrito
                </button>
              </div>
            </>
          )}

          {producto.esJoyeria && (
            <div className="variantes">
              <h2>Elegí material</h2>
              <div className="lista-variantes">
                {variantes?.map((v) => (
                  <button
                    key={v.idVariante}
                    type="button"
                    className={
                      v.idVariante === idVarianteElegida ? "activa" : ""
                    }
                    disabled={v.piezasDisponibles === 0}
                    onClick={() => setIdVarianteElegida(v.idVariante)}
                  >
                    {v.material}
                    {v.pureza ? ` (${v.pureza})` : ""}
                    {v.piezasDisponibles === 0 && " — agotado"}
                  </button>
                ))}
                {variantes && variantes.length === 0 && (
                  <p>Este diseño todavía no tiene variantes cargadas.</p>
                )}
              </div>

              {idVarianteElegida && (
                <div className="piezas">
                  <h2>Piezas disponibles</h2>
                  {piezasCargando ? (
                    <p>Cargando piezas...</p>
                  ) : piezas && piezas.length > 0 ? (
                    <ul>
                      {piezas.map((p) => {
                        const clave = `pieza:${p.idPieza}`;
                        const yaEnCarrito = items.some(
                          (i) => claveCarritoItem(i) === clave
                        );
                        return (
                          <li key={p.idPieza}>
                            <span>
                              SKU {p.sku} — {p.peso} g — $
                              {p.precioVenta.toLocaleString()}
                            </span>
                            <button
                              type="button"
                              disabled={yaEnCarrito || !varianteElegida}
                              onClick={() => {
                                if (!varianteElegida) return;
                                agregarPieza({
                                  idPieza: p.idPieza,
                                  idProducto: producto.id,
                                  idVariante: varianteElegida.idVariante,
                                  nombre: producto.nombre,
                                  material: varianteElegida.material,
                                  pureza: varianteElegida.pureza,
                                  precioVenta: p.precioVenta,
                                  imagen: imagenPortada,
                                });
                                toast.success("Agregado al carrito");
                              }}
                            >
                              {yaEnCarrito ? "En el carrito" : "Agregar"}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p>No hay piezas disponibles en esta variante.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

const Container = styled.div`
  max-width: 1040px;
  margin: 0 auto;
  padding: 28px 24px 60px;

  .volver {
    display: inline-block;
    margin-bottom: 20px;
    text-decoration: none;
    color: ${v.colorTextoSuave};
    font-size: 14px;
    transition: 0.2s;
    &:hover {
      color: ${v.colorPrincipal};
    }
  }

  .layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 32px;
    @media (min-width: 768px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  .galeria {
    display: flex;
    flex-direction: column;
    gap: 10px;
    img {
      width: 100%;
      border-radius: ${v.borderRadius};
      object-fit: cover;
      border: 1px solid ${v.borderSutil};
    }
    .sin-imagen {
      aspect-ratio: 1 / 1;
      background: ${v.bgTarjeta};
      border: 1px solid ${v.borderSutil};
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${v.colorTextoSuave2};
      border-radius: ${v.borderRadius};
    }
  }

  .categoria {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${v.colorPrincipal};
    font-weight: 700;
  }

  h1 {
    margin: 8px 0 12px;
    font-size: 26px;
  }

  p {
    color: ${v.colorTextoSuave};
    line-height: 1.5;
  }

  .precio {
    display: block;
    font-size: 24px;
    font-weight: 700;
    color: ${v.colorPrincipal};
    margin-top: 10px;
  }

  h2 {
    font-size: 15px;
    margin: 22px 0 10px;
    color: ${v.colorTexto};
  }

  /* Pills neutras: selector de variante y estado "en el carrito". */
  .lista-variantes button,
  .piezas li button {
    padding: 8px 16px;
    border-radius: 20px;
    border: 1px solid ${v.borderSutil};
    background: ${v.bgTarjeta};
    color: ${v.colorTexto};
    cursor: pointer;
    font-size: 13.5px;
    font-family: inherit;
    transition: 0.2s;
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .lista-variantes button.activa {
    border-color: ${v.borderDorado};
    color: ${v.colorPrincipal};
    font-weight: 700;
    background: rgba(243, 210, 12, 0.1);
  }

  .lista-variantes button:disabled {
    text-decoration: line-through;
  }

  .piezas ul {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border: 1px solid ${v.borderSutil};
      background: ${v.bgTarjeta};
      border-radius: 10px;
      font-size: 13.5px;
      color: ${v.colorTextoSuave};
    }
  }

  /* Botón principal: "Agregar al carrito" y "Agregar" (pieza puntual). */
  .acciones-compra,
  .piezas li {
    button {
      padding: 9px 18px;
      border-radius: 20px;
      border: 1px solid ${v.borderDorado};
      background: ${v.colorPrincipal};
      color: #1a1206;
      font-weight: 700;
      cursor: pointer;
      transition: 0.2s;
      &:hover:not(:disabled) {
        filter: brightness(1.08);
      }
      &:disabled {
        background: ${v.bgTarjeta};
        color: ${v.colorTextoSuave2};
        border-color: ${v.borderSutil};
        opacity: 1;
      }
    }
  }

  .acciones-compra {
    display: flex;
    gap: 10px;
    margin-top: 14px;
    input {
      width: 70px;
      padding: 9px;
      border-radius: 8px;
      border: 1px solid ${v.borderSutil};
      background: rgba(255, 255, 255, 0.03);
      color: ${v.colorTexto};
      font-family: inherit;
    }
  }
`;
