import { defineConfig, loadEnv } from 'vite'

import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa'



function resolveBase(env: Record<string, string>): string {
  const raw = env.VITE_BASE?.trim()
  // Cloudflare Pages 根域名必须用绝对路径 /；相对路径 ./ 会导致 /note/* 下 JS/CSS 404 白屏
  if (!raw || raw === './' || raw === '.') return '/'
  return raw
}

export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, '.', '')

  const base = resolveBase(env)



  return {

    base,

    plugins: [

      react(),

      VitePWA({

        registerType: 'autoUpdate',

        includeAssets: ['vite.svg'],

        strategies: 'injectManifest',

        srcDir: 'src',

        filename: 'sw.ts',

        injectManifest: {

          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        },

        manifest: {

          name: '个人知识库',

          short_name: '知识库',

          description: '支持离线编辑的个人知识管理系统',

          theme_color: '#2563eb',

          background_color: '#f9fafb',

          display: 'standalone',

          start_url: base,

          icons: [

            {

              src: `${base}vite.svg`.replace(/\/+/g, '/'),

              sizes: '192x192',

              type: 'image/svg+xml',

              purpose: 'any',

            },

            {

              src: `${base}vite.svg`.replace(/\/+/g, '/'),

              sizes: '512x512',

              type: 'image/svg+xml',

              purpose: 'any',

            },

          ],

        },

        devOptions: {

          enabled: true,

          type: 'module',

        },

      }),

    ],

  }

})


