/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALLOWED_USER_1: string;
  readonly VITE_ALLOWED_USER_2: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.svg" {
  const url: string;
  export default url;
}
