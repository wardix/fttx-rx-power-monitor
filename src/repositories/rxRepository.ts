import sql from '../db';

export async function upsertRx(circuitId: string, rxPowerDbm: number | null, source: string, raw: any) {
  const rawJson = JSON.stringify(raw);
  
  // Update measured_at and rx_power_dbm only on successful measurement (rxPowerDbm !== null)
  if (rxPowerDbm !== null && rxPowerDbm !== undefined) {
    return sql`
      INSERT INTO rx_power (circuit_id, rx_power_dbm, measured_at, source, raw)
      VALUES (${circuitId}, ${rxPowerDbm}, now(), ${source}, ${rawJson})
      ON CONFLICT (circuit_id) DO UPDATE SET
        rx_power_dbm = EXCLUDED.rx_power_dbm,
        measured_at = EXCLUDED.measured_at,
        source = EXCLUDED.source,
        raw = EXCLUDED.raw
    `;
  }

  // On failure, only insert/update raw and source, but DO NOT overwrite measured_at or rx_power_dbm
  return sql`
    INSERT INTO rx_power (circuit_id, source, raw)
    VALUES (${circuitId}, ${source}, ${rawJson})
    ON CONFLICT (circuit_id) DO UPDATE SET
      source = EXCLUDED.source,
      raw = EXCLUDED.raw
  `;
}

export async function getAllLatestRx() {
  const rows = await sql`
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
  `;
  return rows;
}

export async function isSafeRecently(circuitId: string, recheckHours?: number, threshold?: number): Promise<boolean> {
  const hours = recheckHours ?? parseInt(process.env.RX_SAFE_RECHECK_HOURS || '4', 10);
  const thr = threshold ?? parseFloat(process.env.RX_SAFE_THRESHOLD_DBM || '-26');
  const rows = await sql`
    SELECT (rx_power_dbm IS NOT NULL AND rx_power_dbm > ${thr} AND measured_at >= now() - (${hours}::int * INTERVAL '1 hour')) AS safe
    FROM rx_power
    WHERE circuit_id = ${circuitId}
  `;
  if (!rows[0]) return false;
  return rows[0].safe === true;
}
