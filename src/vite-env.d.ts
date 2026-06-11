/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GRAPHOPPER_API_KEY?: string;
  readonly VITE_DEFAULT_CENTER_LAT?: string;
  readonly VITE_DEFAULT_CENTER_LNG?: string;
  readonly VITE_DEFAULT_ZOOM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
