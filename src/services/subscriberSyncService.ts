import { fetchSubscribersPage } from '../clients/thirdPartyClient';
import { upsertSubscriber } from '../repositories/subscriberRepository';
import { sleep } from '../utils';

export async function startSubscribersSync(opts?: { apiBase?: string; apiKey?: string; intervalHours?: number; signal?: AbortSignal }) {
  const SUBSCRIBER_API_BASE = opts?.apiBase || process.env.SUBSCRIBER_API_BASE || '';
  const API_KEY = opts?.apiKey || process.env.SUBSCRIBER_BEARER_TOKEN || '';
  const SYNC_INTERVAL_HOURS = opts?.intervalHours ?? parseFloat(process.env.SUBSCRIBER_SYNC_INTERVAL_HOURS || '4');
  const signal = opts?.signal;

  if (!SUBSCRIBER_API_BASE) throw new Error('SUBSCRIBER_API_BASE not set');
  if (!API_KEY) throw new Error('SUBSCRIBER_BEARER_TOKEN not set');

  async function syncOnce() {
    console.log('Starting subscribers sync');
    let page = 1;
    while (true) {
      if (signal?.aborted) return;
      try {
        const body = await fetchSubscribersPage(SUBSCRIBER_API_BASE, API_KEY, page, signal);
        const rows = body?.results || body?.data || [];
        if (!Array.isArray(rows) || rows.length === 0) break;
        for (const s of rows) {
          const subscriber_id = s.subscriber_id || s.id || s.customer_id;
          const subscriber_name = s.subscriber_name || s.name || null;
          const circuit_id = s.circuit_id || s.customerID || s.customer_id;
          if (!subscriber_id || !circuit_id) continue;
          await upsertSubscriber(subscriber_id, subscriber_name, circuit_id);
        }
        page++;
      } catch (err) {
        console.error('Subscriber sync page error:', err);
        break;
      }
    }
    console.log('Subscribers sync completed');
  }

  console.log('Starting subscribers sync loop');
  while (!signal?.aborted) {
    try {
      await syncOnce();
    } catch (err) {
      console.error('Subscribers sync failed:', err);
    }
    const delayMs = SYNC_INTERVAL_HOURS * 60 * 60 * 1000;
    for (let waited = 0; waited < delayMs; waited += 1000) {
      if (signal?.aborted) return;
      await sleep(1000);
    }
  }
  console.log('Subscribers sync stopped');
}
