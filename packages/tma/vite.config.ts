import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: true,          // Bind to 0.0.0.0 (required for tunnels)
        allowedHosts: true,  // Allow any external host (ngrok, localtunnel, etc.)
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    },
});
