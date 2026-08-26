import { defineConfig } from 'vite'

export default defineConfig({
  // 相对基路径：dist/index.html 可以直接用浏览器打开调试，
  // 同时不影响 Cloudflare Pages / OSS 等静态托管。
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
})
