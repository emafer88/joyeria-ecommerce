import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import {
  Autocomplete,
  GoogleMap,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";
import { v } from "../../styles/variables";

// `libraries` tiene que ser una referencia estable o el loader se queja y
// recarga el script en cada render.
const LIBRERIAS: "places"[] = ["places"];
const CENTRO_MX = { lat: 23.6345, lng: -102.5528 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface Props {
  lat: number | null;
  lng: number | null;
  /** Dirección tipeada en el form; se geocodifica para plantar el pin. */
  direccionTexto: string;
  onCambio: (lat: number, lng: number) => void;
}

/** Sin API key no hay mapa: el form sigue andando sin lat/lng. */
export function MapaUbicacion(props: Props) {
  if (!API_KEY) return null;
  return <MapaInterno {...props} />;
}

function MapaInterno({ lat, lng, direccionTexto, onCambio }: Props) {
  const { isLoaded } = useJsApiLoader({
    id: "gmaps-script",
    googleMapsApiKey: API_KEY as string,
    libraries: LIBRERIAS,
  });

  const [mapa, setMapa] = useState<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const ultimoGeocode = useRef("");

  const tienePin = lat != null && lng != null;
  const centro = useMemo(
    () => (tienePin ? { lat: lat as number, lng: lng as number } : CENTRO_MX),
    [tienePin, lat, lng]
  );

  // Mientras no haya pin, geocodificamos la dirección tipeada (con debounce)
  // para plantar el primer punto. Al setear lat/lng el efecto se apaga solo.
  useEffect(() => {
    if (!isLoaded || tienePin) return;
    const texto = direccionTexto.trim();
    if (texto.length < 10 || texto === ultimoGeocode.current) return;
    const t = setTimeout(() => {
      ultimoGeocode.current = texto;
      new google.maps.Geocoder().geocode(
        { address: `${texto}, México` },
        (res, status) => {
          if (status === "OK" && res && res[0]) {
            const loc = res[0].geometry.location;
            onCambio(loc.lat(), loc.lng());
          }
        }
      );
    }, 800);
    return () => clearTimeout(t);
  }, [isLoaded, tienePin, direccionTexto, onCambio]);

  const usarLugar = () => {
    const loc = autocompleteRef.current?.getPlace()?.geometry?.location;
    if (loc) {
      onCambio(loc.lat(), loc.lng());
      mapa?.panTo(loc);
      mapa?.setZoom(16);
    }
  };

  if (!isLoaded) {
    return (
      <Caja>
        <div className="cargando">Cargando mapa…</div>
      </Caja>
    );
  }

  return (
    <Caja>
      <Autocomplete
        onLoad={(a) => (autocompleteRef.current = a)}
        onPlaceChanged={usarLugar}
        options={{ componentRestrictions: { country: "mx" } }}
      >
        <input className="buscar" placeholder="Buscar dirección en el mapa…" />
      </Autocomplete>

      <GoogleMap
        mapContainerClassName="mapa"
        center={centro}
        zoom={tienePin ? 16 : 5}
        onLoad={setMapa}
        onClick={(e) =>
          e.latLng && onCambio(e.latLng.lat(), e.latLng.lng())
        }
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {tienePin && (
          <MarkerF
            position={{ lat: lat as number, lng: lng as number }}
            draggable
            onDragEnd={(e) =>
              e.latLng && onCambio(e.latLng.lat(), e.latLng.lng())
            }
          />
        )}
      </GoogleMap>

      <span className="ayuda">
        {tienePin
          ? "Arrastrá el pin para ajustar la ubicación exacta."
          : "Buscá tu dirección o tocá el mapa para marcar el punto de entrega."}
      </span>
    </Caja>
  );
}

const Caja = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

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

  .mapa {
    width: 100%;
    height: 240px;
    border-radius: ${v.borderRadius};
    border: 1px solid ${v.borderSutil};
  }

  .cargando {
    height: 240px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: ${v.borderRadius};
    border: 1px solid ${v.borderSutil};
    background: ${v.bgTarjeta};
    color: ${v.colorTextoSuave2};
    font-size: 13px;
  }

  .ayuda {
    font-size: 12px;
    color: ${v.colorTextoSuave2};
  }
`;
