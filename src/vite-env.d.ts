/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_SUPABASE_URL: string;
  readonly VITE_APP_SUPABASE_ANON_KEY: string;
  /** MapTiler (geocodificación inversa). Opcional: sin key, el botón
   *  "Usar mi ubicación actual" solo completa lat/lng y el resto se
   *  llena a mano. */
  readonly VITE_MAPTILER_API_KEY?: string;
  /** Orígenes del admin (separados por coma) que pueden mandar el borrador
   *  del diseño a la vista previa. Opcional: hay valores por defecto. */
  readonly VITE_ADMIN_ORIGENES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
