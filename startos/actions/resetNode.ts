import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const resetNode = sdk.Action.withoutInput(
  'reset-node',

  async () => ({
    name: i18n('Reset Node Identity'),
    description: i18n(
      'Discard this node’s keys and routing data and restart as a brand-new node',
    ),
    warning: i18n(
      'The current node ID is gone for good. Anything stored on the network under this node’s identity can no longer be reached through it.',
    ),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    await storeJson.merge(effects, { resetPending: true })
    await sdk.restart(effects)
    return {
      version: '1',
      title: i18n('Reset Queued'),
      message: i18n(
        'The node is restarting with a new identity. It takes a few minutes to attach to the network again.',
      ),
      result: null,
    }
  },
)
