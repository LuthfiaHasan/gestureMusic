import localtunnel from 'localtunnel';

(async () => {
  try {
    console.log('Connecting tunnel to port 5173...');
    const tunnel = await localtunnel({ port: 5173 });
    console.log('TUNNEL_URL: ' + tunnel.url);

    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
    });

    // Keep process alive
    process.on('SIGINT', () => {
      tunnel.close();
      process.exit();
    });
  } catch (err) {
    console.error('Failed to create tunnel:', err);
    process.exit(1);
  }
})();
