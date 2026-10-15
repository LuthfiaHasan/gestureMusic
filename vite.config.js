import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import os from 'os';

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

export default defineConfig({
  define: {
    __LOCAL_IP__: JSON.stringify(localIp),
  },
  server: {
    port: 5173,
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  plugins: [
    basicSsl(),
    {
      name: 'kiosk-network-info',
      configureServer(server) {
        const submissions = [];

        server.middlewares.use('/api/kiosk-info', (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ip: getLocalIp(), port: 5173, isHttps: true }));
        });

        server.middlewares.use('/api/submit-claim', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const entry = JSON.parse(body);
                submissions.push(entry);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, entry }));
              } catch (err) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
          } else {
            res.statusCode = 405;
            res.end('Method Not Allowed');
          }
        });

        server.middlewares.use('/api/poll-submissions', (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          const urlObj = new URL(req.url, 'https://localhost');
          const since = parseInt(urlObj.searchParams.get('since') || '0', 10);
          const newItems = submissions.filter(s => s.timestamp > since);
          res.end(JSON.stringify({ items: newItems }));
        });
      },
    },
  ],
  assetsInclude: ['**/*.task', '**/*.wasm'],
});

