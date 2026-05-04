import registry, { rxGauge } from '../promRegistry';
import { getAllLatestRx } from '../repositories/rxRepository';

export async function collectMetricsText(): Promise<string> {
  try {
    // Read latest measurements from DB and populate the gauge so /metrics reflects persisted state
    const rows = await getAllLatestRx();

    // Reset previous gauge values (best-effort; some prom-client versions may throw)
    try { rxGauge.reset(); } catch (e) { /* ignore if reset not available */ }

    for (const r of rows) {
      const { circuit_id, rx_power_dbm, subscriber_id, subscriber_name } = r as any;
      if (rx_power_dbm !== null && rx_power_dbm !== undefined && !Number.isNaN(Number(rx_power_dbm))) {
        try {
          rxGauge.set(
            {
              circuit_id: String(circuit_id),
              subscriber_id: String(subscriber_id ?? ''),
              subscriber_name: String(subscriber_name ?? ''),
              operator: 'fbstar',
              fttx: 'yes',
            },
            Number(rx_power_dbm)
          );
        } catch (e) {
          console.warn('Failed to set rxGauge for', circuit_id, e);
        }
      }
    }

    return await registry.metrics();
  } catch (err) {
    console.error('collectMetricsText error:', err);
    throw err;
  }
}
