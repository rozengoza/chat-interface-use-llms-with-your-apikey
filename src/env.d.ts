/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Backend API URLs used by the frontend
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.svg" {
  const url: string;
  export default url;
}
