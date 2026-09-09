import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { v } from "../../styles/variables";

// Leaflet arma la URL del icono a partir del CSS (ruta relativa que el bundler
// rompe). En vez de parchear L.Icon.Default, se crea un icono explícito con
// los assets que Vite resuelve como URL y se pasa a cada <Marker>.
const asUrl = (m: string | { default: string }) =>
  typeof m === "string" ? m : m.default;

const ICONO_PIN = L.icon({
  iconRetinaUrl: asUrl(iconRetinaUrl),
  iconUrl: asUrl(iconUrl),
  shadowUrl: asUrl(shadowUrl),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const API_KEY = import.meta.env.VITE_MAPTILER_API_KEY;
const CENTRO_MX: [number, number] = [23.6345, -102.5528];
const TILES = `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${API_KEY}`;
const ATRIBUCION =
  '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

interface Props {
  lat: number | null;
  lng: number | null;
  /** Dirección tipeada en el form; se geocodifica para plantar el pin. */
  direccionTexto: string;
  onCambio: (lat: number, lng: number) => void;
}

interface Sugerencia {
  nombre: string;
  lat: number;
  lng: number;
}

interface FeatureMapTiler {
  place_name?: string;
  text?: string;
  center: [number, number];
}

async function geocodificar(
  texto: string,
  signal?: AbortSignal
): Promise<Sugerencia[]> {
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
    texto
  )}.json?key=${API_KEY}&country=mx&language=es&autocomplete=true&limit=5`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: FeatureMapTiler[] };
  return (data.features ?? []).map((f) => ({
    nombre: f.place_name ?? f.text ?? "",
    lat: f.center[1],
    lng: f.center[0],
  }));
}

/** Sin API key no hay mapa: el form sigue andando sin lat/lng. */
export function MapaUbicacion(props: Props) {
  if (!API_KEY) return null;
  return <MapaInterno {...props} />;
}

function MapaInterno({ lat, lng, direccionTexto, onCambio }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [abierto, setAbierto] = useState(false);
  const ultimoAuto = useRef("");

  const tienePin = lat != null && lng != null;
  const centro = useMemo<[number, number]>(
    () => (tienePin ? [lat as number, lng as number] : CENTRO_MX),
    [tienePin, lat, lng]
  );

  // Autocomplete del buscador (debounce + cancelación). Con < 3 caracteres
  // no buscamos; el dropdown se oculta por `mostrarSugerencias`, sin limpiar
  // estado dentro del efecto.
  const consulta = busqueda.trim();
  useEffect(() => {
    if (consulta.length < 3) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      geocodificar(consulta, ctrl.signal)
        .then(setSugerencias)
        .catch(() => {});
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [consulta]);

  const mostrarSugerencias =
    abierto && consulta.length >= 3 && sugerencias.length > 0;

  // Mientras no haya pin, geocodificamos la dirección tipeada en el form.
  useEffect(() => {
    if (tienePin) return;
    const texto = direccionTexto.trim();
    if (texto.length < 10 || texto === ultimoAuto.current) return;
    const t = setTimeout(() => {
      ultimoAuto.current = texto;
      geocodificar(`${texto}, México`)
        .then((r) => {
          if (r[0]) onCambio(r[0].lat, r[0].lng);
        })
        .catch(() => {});
    }, 900);
    return () => clearTimeout(t);
  }, [tienePin, direccionTexto, onCambio]);

  const elegir = (s: Sugerencia) => {
    setBusqueda(s.nombre);
    setSugerencias([]);
    setAbierto(false);
    onCambio(s.lat, s.lng);
  };

  return (
    <Caja>
      <div className="buscador">
        <input
          className="buscar"
          placeholder="Buscar dirección en el mapa…"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
        />
        {mostrarSugerencias && (
          <ul className="sugerencias">
            {sugerencias.map((s, i) => (
              <li key={i}>
                <button type="button" onMouseDown={() => elegir(s)}>
                  {s.nombre}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MapContainer
        className="mapa"
        center={centro}
        zoom={tienePin ? 16 : 5}
        scrollWheelZoom
      >
        <TileLayer url={TILES} attribution={ATRIBUCION} />
        <Sincronizar centro={centro} zoom={tienePin ? 16 : 5} />
        <ClicMapa onClic={onCambio} />
        {tienePin && (
          <Marker
            position={[lat as number, lng as number]}
            icon={ICONO_PIN}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const p = e.target.getLatLng();
                onCambio(p.lat, p.lng);
              },
            }}
          />
        )}
      </MapContainer>

      <span className="ayuda">
        {tienePin
          ? "Arrastrá el pin para ajustar la ubicación exacta."
          : "Buscá tu dirección o tocá el mapa para marcar el punto de entrega."}
      </span>
    </Caja>
  );
}

function Sincronizar({
  centro,
  zoom,
}: {
  centro: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(centro, zoom);
  }, [map, centro, zoom]);
  // El contenedor puede montarse oculto (form colapsado): forzamos el recálculo.
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function ClicMapa({ onClic }: { onClic: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onClic(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

const Caja = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  .buscador {
    position: relative;
  }

  .buscar {
    width: 100%;
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
  }

  .sugerencias {
    position: absolute;
    z-index: 500;
    left: 0;
    right: 0;
    top: calc(100% + 4px);
    list-style: none;
    margin: 0;
    padding: 4px;
    border-radius: 8px;
    border: 1px solid ${v.borderSutil};
    background: #14121c;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);

    button {
      width: 100%;
      text-align: left;
      padding: 8px 10px;
      border: none;
      background: none;
      color: ${v.colorTextoSuave};
      font-size: 12.5px;
      font-family: inherit;
      cursor: pointer;
      border-radius: 6px;
      &:hover {
        background: ${v.bgTarjetaHover};
        color: ${v.colorPrincipal};
      }
    }
  }

  .mapa {
    width: 100%;
    height: 240px;
    border-radius: ${v.borderRadius};
    border: 1px solid ${v.borderSutil};
  }

  /* Leaflet pinta los controles y la atribución con su propio CSS; solo
     ajustamos el color del texto de atribución para que no cante en oscuro. */
  .leaflet-container {
    background: ${v.bgTarjeta};
    font-family: inherit;
  }
  .leaflet-control-attribution {
    background: rgba(0, 0, 0, 0.6);
    color: ${v.colorTextoSuave2};
    a {
      color: ${v.colorTextoSuave};
    }
  }

  .ayuda {
    font-size: 12px;
    color: ${v.colorTextoSuave2};
  }
`;
