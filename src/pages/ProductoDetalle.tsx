import { useState } from "react";
import styled from "styled-components";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  useImagenesProductoQuery,
  useImagenesVarianteQuery,
  usePiezasDisponiblesQuery,
  useProductoDetalleQuery,
  useVariantesDisponiblesQuery,
} from "../tanstack/CatalogoStack";
import { useCarritoStore } from "../store/CarritoStore";
import { claveCarritoItem } from "../types/dominio";
import { porcentajeDescuento } from "../utils/precio";
import { v } from "../styles/variables";

export function ProductoDetalle() {
  const { id } = useParams<{ id: string }>();
  const idProducto = id ? Number(id) : undefined;
  const [idVarianteElegida, setIdVarianteElegida] = useState<number>();
  const [tallaElegida, setTallaElegida] = useState<string>();
  const [cantidad, setCantidad] = useState(1);

  const { data: producto, isLoading, isError } =
    useProductoDetalleQuery(idProducto);
  const { data: imagenes } = useImagenesProductoQuery(idProducto);
  const { data: imagenesVariante } =
    useImagenesVarianteQuery(idVarianteElegida);
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
  const tallas = varianteElegida?.tallasDisponibles ?? [];
  const piezasVisibles =
    tallaElegida && tallas.length > 0
      ? piezas?.filter((p) => p.talla === tallaElegida)
      : piezas;
  // Al elegir un material, la galería pasa a ser la de esa variante; si la
  // variante no tiene imágenes cargadas se cae a las del producto.
  const galeria =
    imagenesVariante && imagenesVariante.length > 0 ? imagenesVariante : imagenes;
  const imagenPortada = galeria?.[0]?.url ?? null;

  if (isLoading) return <Container>Cargando...</Container>;
  if (isError || !producto)
    return (
      <Container>
        <p>No se encontró el producto.</p>
        <Link to="/catalogo">Volver al catálogo</Link>
      </Container>
    );

  const enOferta = producto.precioOferta !== null;
  const precioEfectivo = producto.precioOferta ?? producto.precioVenta;
  const descuento = porcentajeDescuento(
    producto.precioVenta,
    producto.precioOferta
  );
  const sinStock =
    producto.totalDisponible !== null && producto.totalDisponible <= 0;
  const stockBajo =
    producto.totalDisponible !== null &&
    producto.totalDisponible > 0 &&
    producto.totalDisponible <= 5;

  return (
    <Container>
      <Link className="volver" to="/catalogo">
        ← Volver al catálogo
      </Link>

      <div className="layout">
        <div className="galeria">
          {galeria && galeria.length > 0 ? (
            galeria.map((img) => (
              <img key={img.id} src={img.url} alt={producto.nombre} />
            ))
          ) : (
            <div className="sin-imagen">Sin imágenes</div>
          )}
        </div>

        <div className="info">
          <span className="categoria">
            {producto.categoria}
            {producto.marca ? ` · ${producto.marca}` : ""}
          </span>
          <h1>{producto.nombre}</h1>
          {producto.etiquetas.length > 0 && (
            <span className="etiquetas">
              {producto.etiquetas.map((et) => (
                <span key={et} className="etiqueta">
                  {et}
                </span>
              ))}
            </span>
          )}
          {producto.descripcion && <p>{producto.descripcion}</p>}

          {(producto.medidas || producto.tallas) && (
            <dl className="ficha">
              {producto.medidas && (
                <div>
                  <dt>Medidas</dt>
                  <dd>{producto.medidas}</dd>
                </div>
              )}
              {producto.tallas && (
                <div>
                  <dt>Tallas</dt>
                  <dd>{producto.tallas}</dd>
                </div>
              )}
            </dl>
          )}

          {!producto.esJoyeria && (
            <>
              {producto.precioVenta > 0 ? (
                enOferta ? (
                  <span className="precios">
                    <span className="precio-anterior">
                      $ {producto.precioVenta.toLocaleString()}
                    </span>
                    <span className="precio precio-oferta">
                      $ {precioEfectivo.toLocaleString()}
                    </span>
                    {descuento !== null && (
                      <span className="chip-descuento">-{descuento}%</span>
                    )}
                  </span>
                ) : (
                  <span className="precio">
                    $ {producto.precioVenta.toLocaleString()}
                  </span>
                )
              ) : (
                <span className="precio">Consultar precio</span>
              )}

              {producto.totalDisponible !== null && (
                <span
                  className={sinStock ? "stock stock--agotado" : "stock"}
                >
                  {sinStock
                    ? "Agotado"
                    : stockBajo
                      ? `Últimas ${producto.totalDisponible} unidades`
                      : "Disponible"}
                </span>
              )}

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
                  disabled={producto.precioVenta <= 0 || sinStock}
                  onClick={() => {
                    agregarProducto(
                      {
                        idProducto: producto.id,
                        nombre: producto.nombre,
                        precioVenta: precioEfectivo,
                        imagen: imagenPortada,
                      },
                      cantidad
                    );
                    toast.success("Agregado al carrito");
                  }}
                >
                  {sinStock ? "Sin stock" : "Agregar al carrito"}
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
                    onClick={() => {
                      setIdVarianteElegida(v.idVariante);
                      setTallaElegida(undefined);
                    }}
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

              {idVarianteElegida && tallas.length > 0 && (
                <>
                  <h2>Elegí talla</h2>
                  <div className="lista-variantes">
                    <button
                      type="button"
                      className={!tallaElegida ? "activa" : ""}
                      onClick={() => setTallaElegida(undefined)}
                    >
                      Todas
                    </button>
                    {tallas.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={t === tallaElegida ? "activa" : ""}
                        onClick={() => setTallaElegida(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {idVarianteElegida && (
                <div className="piezas">
                  <h2>Piezas disponibles</h2>
                  {piezasCargando ? (
                    <p>Cargando piezas...</p>
                  ) : piezasVisibles && piezasVisibles.length > 0 ? (
                    <ul>
                      {piezasVisibles.map((p) => {
                        const clave = `pieza:${p.idPieza}`;
                        const yaEnCarrito = items.some(
                          (i) => claveCarritoItem(i) === clave
                        );
                        const precioEfectivoPieza =
                          p.precioOferta ?? p.precioVenta;
                        const descuentoPieza = porcentajeDescuento(
                          p.precioVenta,
                          p.precioOferta
                        );
                        return (
                          <li key={p.idPieza}>
                            <span>
                              SKU {p.sku} — {p.peso} g
                              {p.talla ? ` — talla ${p.talla}` : ""}
                              {p.medidas ? ` — ${p.medidas}` : ""} —{" "}
                              {p.precioOferta !== null ? (
                                <>
                                  <span className="precio-anterior">
                                    ${p.precioVenta.toLocaleString()}
                                  </span>{" "}
                                  <span className="precio-oferta">
                                    ${precioEfectivoPieza.toLocaleString()}
                                  </span>
                                  {descuentoPieza !== null &&
                                    ` (-${descuentoPieza}%)`}
                                </>
                              ) : (
                                `$${p.precioVenta.toLocaleString()}`
                              )}
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
                                  precioVenta: precioEfectivoPieza,
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
                    <p>
                      {tallaElegida
                        ? `No hay piezas disponibles en talla ${tallaElegida}.`
                        : "No hay piezas disponibles en esta variante."}
                    </p>
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

  .etiquetas {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 10px 0 4px;
  }

  .etiqueta {
    font-size: 11.5px;
    padding: 2px 10px;
    border-radius: 20px;
    border: 1px solid ${v.borderSutil};
    color: ${v.colorTextoSuave};
  }

  .ficha {
    margin: 16px 0 0;
    display: flex;
    flex-direction: column;
    gap: 6px;

    div {
      display: flex;
      gap: 8px;
      font-size: 13.5px;
    }
    dt {
      color: ${v.colorTextoSuave2};
      min-width: 72px;
    }
    dd {
      margin: 0;
      color: ${v.colorTexto};
    }
  }

  .precio {
    display: block;
    font-size: 24px;
    font-weight: 700;
    color: ${v.colorPrincipal};
    margin-top: 10px;
  }

  .precios {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
  }

  .precio-anterior {
    font-size: 15px;
    color: ${v.colorTextoSuave2};
    text-decoration: line-through;
  }

  .precios .precio {
    display: inline;
    margin-top: 0;
  }

  .precio-oferta {
    color: ${v.colorExito};
  }

  .chip-descuento {
    align-self: center;
    background: ${v.colorExito};
    color: ${v.colorTexto};
    font-size: 12px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 20px;
  }

  .stock {
    display: inline-block;
    margin-top: 8px;
    font-size: 13px;
    color: ${v.colorTextoSuave};
  }

  .stock--agotado {
    color: ${v.colorTextoSuave2};
    font-weight: 700;
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
