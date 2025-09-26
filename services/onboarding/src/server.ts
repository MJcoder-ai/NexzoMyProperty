import { createServer } from 'node:http';
import { getHealth } from './index';

const port = Number(process.env.PORT ?? 3000);

const server = createServer((req, res) => {
  if (!req.url) {
    res.statusCode = 400;
    res.end('Bad request');
    return;
  }

  if (req.url === '/' || req.url === '/healthz') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(getHealth()));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

if (require.main === module) {
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    const health = getHealth();
    console.log(`[${health.service}] listening on port ${port}`);
  });
}

export default server;
