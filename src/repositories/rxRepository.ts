import { query } from '../db';

export async function upsertRx(circuitId: string, rxPowerDbm: number | null, source: string, raw: any) {
  // Update measured_at and rx_power_dbm only on successful measurement (rxPowerDbm !== null)
  if (rxPowerDbm !== null && rxPowerDbm !== undefined) {
    return query(
      `INSERT INTO rx_power (circuit_id, rx_power_dbm, measured_at, source, raw)
       VALUES ($1, $2, now(), $3, $4)
       ON CONFLICT (circuit_id) DO UPDATE SET
         rx_power_dbm = EXCLUDED.rx_power_dbm,
         measured_at = EXCLUDED.measured_at,
         source = EXCLUDED.source,
         raw = EXCLUDED.raw`,
      [circuitId, rxPowerDbm, source, JSON.stringify(raw)]
    );
  }

  // On failure, only insert/update raw and source, but DO NOT overwrite measured_at or rx_power_dbm
  return query(
    `INSERT INTO rx_power (circuit_id, source, raw)
     VALUES ($1, $2, $3)
     ON CONFLICT (circuit_id) DO UPDATE SET
       source = EXCLUDED.source,
       raw = EXCLUDED.raw`,
    [circuitId, source, JSON.stringify(raw)]
  );
}

export async function getAllLatestRx() {
  const res = await query(`
    SELECT r.circuit_id, r.rx_power_dbm,
           sub.subscriber_id, sub.subscriber_name
    FROM rx_power r
    LEFT JOIN LATERAL (
      SELECT subscriber_id, subscriber_name
      FROM subscribers s
      WHERE s.circuit_id = r.circuit_id
      ORDER BY s.updated_at DESC
      LIMIT 1
    ) sub ON true
  `);
  return res.rows;
}

export async function isSafeRecently(circuitId: string, recheckHours?: number, threshold?: number): Promise<boolean> {
  const hours = recheckHours ?? parseInt(process.env.RX_SAFE_RECHECK_HOURS || '4', 10);
  const thr = threshold ?? parseFloat(process.env.RX_SAFE_THRESHOLD_DBM || '-26');
  const res = await query("SELECT (rx_power_dbm IS NOT NULL AND rx_power_dbm > $2 AND measured_at >= now() - ($3 * INTERVAL '1 hour')) AS safe FROM rx_power WHERE circuit_id = $1", [circuitId, thr, hours]);
  if (!res.rows[0]) return false;
  return res.rows[0].safe === true;
}
