import { Registry, Gauge } from 'prom-client';

const registry = new Registry();

export const rxGauge = new Gauge({
  name: 'fttx_rx_power_dbm',
  help: 'FTTx RX power in dBm',
  labelNames: ['circuit_id', 'subscriber_id', 'subscriber_name', 'operator', 'fttx'] as string[],
});

registry.registerMetric(rxGauge);

export default registry;
