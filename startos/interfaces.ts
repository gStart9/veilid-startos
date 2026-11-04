import { i18n } from './i18n'
import { sdk } from './sdk'
import { apiHostId, apiPort, p2pPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  await sdk.MultiHost.of(effects, apiHostId).bindPort(apiPort, {
    protocol: null,
    preferredExternalPort: apiPort,
    addSsl: null,
    secure: { ssl: false },
  })

  const p2pOrigin = await sdk.MultiHost.of(effects, 'p2p').bindPort(p2pPort, {
    protocol: null,
    preferredExternalPort: p2pPort,
    addSsl: null,
    secure: { ssl: false },
  })

  const p2pInterface = sdk.createInterface(effects, {
    name: i18n('Veilid Peer Port'),
    id: 'p2p',
    description: i18n(
      'UDP, TCP and WebSocket port other Veilid nodes connect to',
    ),
    type: 'p2p',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  return [await p2pOrigin.export([p2pInterface])]
})
