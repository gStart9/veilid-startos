import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { apiPort, dataDir, p2pPort } from '../utils'

const listen = z.looseObject({
  listen_address: z.literal(`:${p2pPort}`).catch(`:${p2pPort}`),
  public_address: z.string().nullable().catch(null),
})

const ws = z.looseObject({
  listen_address: z.literal(`:${p2pPort}`).catch(`:${p2pPort}`),
  url: z.string().nullable().catch(null),
})

const protocol = z.looseObject({
  udp: listen.catch(() => listen.parse({})),
  tcp: listen.catch(() => listen.parse({})),
  ws: ws.catch(() => ws.parse({})),
})

const dht = z.looseObject({
  remote_max_storage_space_mb: z.number().int().min(100).catch(10000),
})

const privacy = z.looseObject({
  require_inbound_relay: z.boolean().catch(true),
})

const routingTable = z.looseObject({
  public_keys: z.array(z.string()).optional().catch(undefined),
  secret_keys: z.array(z.string()).optional().catch(undefined),
})

const network = z.looseObject({
  upnp: z.literal(false).catch(false),
  detect_address_changes: z.literal(false).catch(false),
  routing_table: routingTable.catch(() => routingTable.parse({})),
  dht: dht.catch(() => dht.parse({})),
  privacy: privacy.catch(() => privacy.parse({})),
  protocol: protocol.catch(() => protocol.parse({})),
})

const store = (directory: string) =>
  z.looseObject({ directory: z.literal(directory).catch(directory) })

const tableStore = store(`${dataDir}/table_store`)
const blockStore = store(`${dataDir}/block_store`)

const protectedStore = z.looseObject({
  directory: z
    .literal(`${dataDir}/protected_store`)
    .catch(`${dataDir}/protected_store`),
  always_use_insecure_storage: z.literal(true).catch(true),
  allow_insecure_fallback: z.literal(true).catch(true),
})

const core = z.looseObject({
  protected_store: protectedStore.catch(() => protectedStore.parse({})),
  table_store: tableStore.catch(() => tableStore.parse({})),
  block_store: blockStore.catch(() => blockStore.parse({})),
  network: network.catch(() => network.parse({})),
})

const clientApi = z.looseObject({
  ipc_enabled: z.literal(true).catch(true),
  ipc_directory: z.literal(`${dataDir}/ipc`).catch(`${dataDir}/ipc`),
  network_enabled: z.literal(true).catch(true),
  listen_address: z.literal(`0.0.0.0:${apiPort}`).catch(`0.0.0.0:${apiPort}`),
})

export const logLevels = ['error', 'warn', 'info', 'debug'] as const

const terminal = z.looseObject({
  enabled: z.literal(true).catch(true),
  level: z.enum(logLevels).catch('info'),
})

const logging = z.looseObject({
  terminal: terminal.catch(() => terminal.parse({})),
})

const shape = z.looseObject({
  auto_attach: z.literal(true).catch(true),
  client_api: clientApi.catch(() => clientApi.parse({})),
  logging: logging.catch(() => logging.parse({})),
  core: core.catch(() => core.parse({})),
})

export const veilidServerConf = FileHelper.yaml(
  { base: sdk.volumes.veilid, subpath: 'veilid-server.conf' },
  shape,
)
