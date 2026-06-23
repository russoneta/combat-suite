import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base` es obligatorio: el sitio se sirve desde un subpath
// usuario.github.io/combat-suite/. Sin esto los assets dan 404.
export default defineConfig({
  plugins: [react()],
  base: '/combat-suite/',
})
