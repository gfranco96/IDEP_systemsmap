import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built app also works when opened from a sub-path.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
} as never);
