/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "1" — сборка с сервером репетитора (вход по коду, синхронизация). */
  readonly VITE_BACKEND?: string;
}
