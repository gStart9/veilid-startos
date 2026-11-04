import { logLevels, veilidServerConf } from '../fileModels/veilidServerConf'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  storage: Value.number({
    name: i18n('DHT Storage Limit'),
    description: i18n(
      'Disk space this node offers for records that other Veilid users store on the network.',
    ),
    default: 10000,
    required: true,
    min: 100,
    integer: true,
    units: 'MB',
  }),
  logLevel: Value.select({
    name: i18n('Log Level'),
    description: i18n(
      'How much the node writes to the service logs. Raise it to chase a problem, then lower it again.',
    ),
    default: 'info',
    values: {
      error: i18n('Error'),
      warn: i18n('Warning'),
      info: i18n('Info'),
      debug: i18n('Debug'),
    } satisfies Record<(typeof logLevels)[number], string>,
  }),
})

export const configureNode = sdk.Action.withInput(
  'configure-node',

  async () => ({
    name: i18n('Configure Node'),
    description: i18n(
      'Set how much storage the node offers and how much it logs',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async () => {
    const conf = await veilidServerConf.read().once()
    return {
      storage: conf?.core.network.dht.remote_max_storage_space_mb,
      logLevel: conf?.logging.terminal.level,
    }
  },

  async ({ effects, input }) => {
    await veilidServerConf.merge(effects, {
      logging: { terminal: { level: input.logLevel } },
      core: {
        network: {
          dht: { remote_max_storage_space_mb: input.storage },
        },
      },
    })
    await sdk.restart(effects)
  },
)
