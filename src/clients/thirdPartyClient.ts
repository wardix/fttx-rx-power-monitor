import { sleep } from '../utils';

export async function fetchJsonWithRetries(url: string, opts: any = {}, retries = 3, signal?: AbortSignal) {
  let attempt = 0;
  let backoff = 500;
  while (attempt <= retries) {
    if (signal?.aborted) throw new Error('Aborted');
    try {
      const res = await fetch(url, { ...opts, signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      console.warn(`fetch failed (attempt ${attempt}), retrying after ${backoff}ms:`, err);
      await sleep(backoff);
      backoff *= 2;
    }
  }
}

export async function fetchRxPower(base: string, apiKey: string, circuitId: string, signal?: AbortSignal, maxRetries = 3) {
  const url = `${base.replace(/\/+$/,'')}/command?customerID=${encodeURIComponent(circuitId)}&commandName=RxPower`;
  return fetchJsonWithRetries(url, { headers: { 'X-API-Key': apiKey }, method: 'GET' }, maxRetries, signal);
}

export async function fetchSubscribersPage(base: string, token: string, page = 1, signal?: AbortSignal, maxRetries = 3) {
  // operator id can be provided via OPERATOR_ID or SUBSCRIBER_OPERATOR_ID env var
  const operatorId = process.env.OPERATOR_ID || process.env.SUBSCRIBER_OPERATOR_ID || '';
  let url = `${base.replace(/\/+$/,'')}?page=${page}`;
  if (operatorId) {
    url += `&operator_id=${encodeURIComponent(operatorId)}`;
  }
  return fetchJsonWithRetries(url, { headers: { 'Authorization': `Bearer ${token}` }, method: 'GET' }, maxRetries, signal);
}
