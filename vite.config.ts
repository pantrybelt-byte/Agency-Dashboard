import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    // The shell test waits up to 15s for the first lazy route to resolve,
    // which it cannot do under Vitest's 5s default — the per-test budget
    // expired before the wait it was given. Sized above that wait so the
    // intent in shell.test.tsx is actually reachable when the whole suite
    // runs in parallel.
    testTimeout: 20_000,
  },
})
