import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = (env.VITE_SITE_URL || 'https://syunkan-eisaku.pages.dev').replace(
    /\/$/,
    '',
  )

  return {
    plugins: [
      react(),
      {
        name: 'inject-site-url-for-ogp',
        transformIndexHtml(html) {
          return html.replaceAll('%SITE_URL%', siteUrl)
        },
      },
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:8788',
      },
    },
  }
})
