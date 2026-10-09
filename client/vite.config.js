import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    reporters: ['default', 'junit'],
    outputFile: { junit: 'test-results/junit.xml' },
    coverage: {
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.js', 'src/**/*.jsx'],
    },
  },
})
