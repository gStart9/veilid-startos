import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { apiPort, dataDir, VeilidState } from '../utils'

const QUERY = `exec 3<>/dev/tcp/127.0.0.1/${apiPort} && printf '%s\\n' '{"id":1,"op":"GetState"}' '{"id":2,"op":"Debug","command":"peerinfo"}' >&3 && timeout 10 grep -m2 '"type":"Response"' <&3`

export const nodeInfo = sdk.Action.withoutInput(
  'node-info',

  async () => ({
    name: i18n('Node Info'),
    description: i18n(
      "Show this node's Veilid identity and its connection to the network",
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    // The API listens on the subcontainers' loopback, which this context does not share.
    const res = await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'veilid' },
      sdk.Mounts.of().mountVolume({
        volumeId: 'veilid',
        subpath: null,
        mountpoint: dataDir,
        readonly: true,
      }),
      'node-info',
      (sub) => sub.execFail(['bash', '-c', QUERY]),
    )
    const replies = String(res.stdout)
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
    const { attachment, network }: VeilidState = replies.find(
      (r) => r.id === 1,
    ).value
    const peerInfo: string = replies.find((r) => r.id === 2).value

    return {
      version: '1',
      title: i18n('Node Info'),
      message: null,
      result: {
        type: 'group',
        value: [
          ...network.node_ids.map((id) => ({
            type: 'single' as const,
            name: i18n('Node ID'),
            description: null,
            value: id,
            masked: false,
            copyable: true,
            qr: false,
            launchable: false,
          })),
          {
            type: 'single',
            name: i18n('Attachment'),
            description: null,
            value: attachment.state,
            masked: false,
            copyable: false,
            qr: false,
            launchable: false,
          },
          {
            type: 'single',
            name: i18n('Live Peers'),
            description: null,
            value: String(attachment.live_peer_count),
            masked: false,
            copyable: false,
            qr: false,
            launchable: false,
          },
          {
            type: 'multiline',
            name: i18n('Published Peer Info'),
            description: i18n(
              'What this node advertises to other Veilid nodes: its public address, whether that address sits behind NAT, and any relay it uses',
            ),
            value: peerInfo,
            masked: false,
            copyable: true,
            qr: false,
            filename: null,
          },
        ],
      },
    }
  },
)
