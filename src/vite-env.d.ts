/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_OPENAI_API_KEY: string
  /** 部署子路径，Cloudflare 根域名用 /，GitHub Pages 项目站用 /仓库名/ */
  readonly VITE_BASE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
