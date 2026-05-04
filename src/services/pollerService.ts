import { getAllCircuitIdsSorted } from '../repositories/subscriberRepository';
import { upsertRx, isSafeRecently } from '../repositories/rxRepository';
import { fetchRxPower } from '../clients/thirdPartyClient';
import { sleep, parseRxPower } from '../utils';

export async function startPoller(opts?: { apiBase?: string; apiKey?: string; requestDelayMs?: number; maxRetries?: number; safeRecheckHours?: number; signal?: AbortSignal }) {
  const THIRD_PARTY_API_BASE = opts?.apiBase || process.env.THIRD_PARTY_API_BASE || '';
  const API_KEY = opts?.apiKey || process.env.X_API_KEY || '';
  const REQUEST_DELAY_MS = opts?.requestDelayMs ?? parseInt(process.env.REQUEST_DELAY_MS || '200', 10);
  const MAX_RETRIES = opts?.maxRetries ?? parseInt(process.env.REQUEST_MAX_RETRIES || '3', 10);
  const SAFE_RECHECK_HOURS = opts?.safeRecheckHours ?? parseInt(process.env.RX_SAFE_RECHECK_HOURS || '4', 10);
  const signal = opts?.signal;

  if (!THIRD_PARTY_API_BASE) throw new Error('THIRD_PARTY_API_BASE not set');
  if (!API_KEY) throw new Error('X_API_KEY not set');

  async function pollOnce() {
    const circuits = await getAllCircuitIdsSorted();
    for (const circuit of circuits) {
      if (signal?.aborted) return;

      try {
        // Skip polling if circuit was safe recently
        const safeRecent = await isSafeRecently(circuit, SAFE_RECHECK_HOURS);
        if (safeRecent) {
          continue;
        }

        const body = await fetchRxPower(THIRD_PARTY_API_BASE, API_KEY, circuit, signal, MAX_RETRIES);
        const item = Array.isArray(body?.result) ? (body.result.find((i: any) => i.circuit_id === circuit) || body.result[0]) : null;
        if (item && item.status === 'success') {
          const rx = parseRxPower(item.command_return);
          await upsertRx(circuit, rx, 'third-party-api', body);
        } else {
          await upsertRx(circuit, null, 'third-party-api', body);
        }
      } catch (err) {
        console.error(`Error polling ${circuit}:`, err);
        try {
          await upsertRx(circuit, null, 'third-party-api', { error: String(err) });
        } catch (e) {
          console.error('Failed to persist error record:', e);
        }
      }
      if (signal?.aborted) return;
      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log('Starting poller (serial loop)...');
  while (!signal?.aborted) {
    try {
      await pollOnce();
    } catch (err) {
      console.error('Poller loop error:', err);
    }
  }
  console.log('Poller stopped');
}
