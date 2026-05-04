import { query } from '../db';

export async function getAllCircuitIdsSorted(freshnessHours?: number): Promise<string[]> {
  const hours = freshnessHours ?? parseInt(process.env.SUBSCRIBER_FRESHNESS_HOURS || '24', 10);
  const res = await query("SELECT circuit_id FROM subscribers WHERE updated_at >= now() - ($1 * INTERVAL '1 hour') ORDER BY circuit_id ASC", [hours]);
  return res.rows.map((r: any) => r.circuit_id);
}

export async function upsertSubscriber(subscriberId: string, subscriberName: string | null, circuitId: string) {
  return query(
    `INSERT INTO subscribers (subscriber_id, subscriber_name, circuit_id, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (subscriber_id, circuit_id) DO UPDATE SET
       subscriber_name = EXCLUDED.subscriber_name,
       updated_at = EXCLUDED.updated_at`,
    [subscriberId, subscriberName, circuitId]
  );
}
