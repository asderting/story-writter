import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import http from 'http';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'backend-proxy',
      configureServer(server) {
        // Proxy requests from /llm-proxy/<encoded-base-url>/<path> to the actual backend.
        // This avoids CORS issues when the browser talks to local LLM servers.
        server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const prefix = '/llm-proxy/';
          if (!req.url?.startsWith(prefix)) return next();

          const rest = req.url.slice(prefix.length);
          const slashIndex = rest.indexOf('/');
          if (slashIndex === -1) {
            res.statusCode = 400;
            res.end('Bad proxy URL');
            return;
          }

          const encodedBase = rest.slice(0, slashIndex);
          const targetPath = rest.slice(slashIndex);
          let baseUrl: string;
          try {
            baseUrl = decodeURIComponent(encodedBase);
          } catch {
            res.statusCode = 400;
            res.end('Bad encoded URL');
            return;
          }

          const targetUrl = new URL(targetPath, baseUrl);

          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(req.headers)) {
            if (key === 'host' || key === 'origin' || key === 'referer') continue;
            if (typeof value === 'string') headers[key] = value;
          }

          const proxyReq = http.request(
            targetUrl.toString(),
            { method: req.method, headers },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode || 500, {
                ...proxyRes.headers,
                'access-control-allow-origin': '*',
                'access-control-allow-methods': '*',
                'access-control-allow-headers': '*',
              });
              proxyRes.pipe(res);
            },
          );

          proxyReq.on('error', (err) => {
            res.statusCode = 502;
            res.end(`Proxy error: ${err.message}`);
          });

          req.pipe(proxyReq);
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
});
