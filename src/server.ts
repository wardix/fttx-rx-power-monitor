import { Hono } from 'hono';
import { startPoller } from './poller';
import { startSubscribersSync } from './subscribers_sync';
import { collectMetricsText } from './controllers/metricsController';

const app = new Hono();
const METRICS_PORT = parseInt(process.env.METRICS_PORT || '3000', 10);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/metrics', async (c) => {
  try {
    const metrics = await collectMetricsText();
    return c.text(metrics, 200, { 'Content-Type': 'text/plain; version=0.0.4' });
  } catch (err) {
    console.error('Error building metrics:', err);
    return c.text('# error building metrics\n', 500, { 'Content-Type': 'text/plain; version=0.0.4' });
  }
});

app.get('/', (c) => c.text('fttx-rx-power-monitor'));

const abortController = new AbortController();

async function startBackgroundWorkers() {
  // start poller and subscribers sync but don't await them
  startPoller({ signal: abortController.signal }).catch((err) => {
    console.error('Poller failed:', err);
    abortController.abort();
  });
  startSubscribersSync({ signal: abortController.signal }).catch((err) => {
    console.error('Subscribers sync failed:', err);
    abortController.abort();
  });
}

startBackgroundWorkers().catch(err => {
  console.error('Failed to start background workers:', err);
  process.exit(1);
});

const server = app.listen({ port: METRICS_PORT });

console.log(`Metrics server listening on port ${METRICS_PORT}`);

function shutdown() {
  console.log('Shutdown requested, aborting background workers...');
  abortController.abort();
  try { server?.stop?.(); } catch (e) {}
  setTimeout(() => process.exit(0), 5000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
