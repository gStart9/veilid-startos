import { healthFns } from '@start9labs/start-sdk'
import { rm } from 'node:fs/promises'
import { storeJson } from './fileModels/store.json'
import { veilidServerConf } from './fileModels/veilidServerConf'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { attachedStates, dataDir, getState, p2pPort } from './utils'

const strengths = {
  AttachedWeak: i18n('weak'),
  AttachedFair: i18n('fair'),
  AttachedGood: i18n('good'),
  AttachedStrong: i18n('strong'),
  AttachedFull: i18n('full'),
} satisfies Record<(typeof attachedStates)[number], string>

async function checkAttachment(): Promise<healthFns.HealthCheckResult> {
  try {
    const { attachment } = await getState()
    if ((attachedStates as readonly string[]).includes(attachment.state)) {
      return {
        result: 'success',
        message: i18n('Attached (${strength}, ${peers} peers)', {
          strength:
            strengths[attachment.state as (typeof attachedStates)[number]],
          peers: String(attachment.live_peer_count),
        }),
      }
    }
    if (attachment.state === 'Attaching') {
      return {
        result: 'starting',
        message: i18n('Attaching to the Veilid network'),
      }
    }
    return {
      result: 'failure',
      message: i18n(
        'Not attached to the Veilid network. Check that this server can resolve DNS and make outbound connections.',
      ),
    }
  } catch {
    return { result: 'starting', message: i18n('Starting the Veilid node') }
  }
}

export const main = sdk.setupMain(async ({ effects }) => {
  console.info('Starting Veilid!')

  // Queued by Reset Node Identity; applied before any daemon holds the stores.
  const reset = (await storeJson.read((s) => s.resetPending).once()) === true
  if (reset) {
    for (const path of ['protected_store', 'table_store', 'block_store']) {
      await rm(sdk.volumes.veilid.subpath(path), {
        recursive: true,
        force: true,
      })
    }
  }

  // The identity lives in the conf so backups can carry it without table_store.
  const hasKeys = await veilidServerConf
    .read((c) => !!c.core.network.routing_table.secret_keys?.length)
    .once()
  if (reset || !hasKeys) {
    const { stdout } = await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'veilid' },
      null,
      'keygen',
      (sub) => sub.execFail(['veilid-server', '--generate-key-pairs']),
    )
    const pairs = String(stdout)
      .trim()
      .split('\n')
      .map((line) => line.trim().split(':'))
    await veilidServerConf.merge(effects, {
      core: {
        network: {
          routing_table: {
            public_keys: pairs.map(([kind, pub]) => `${kind}:${pub}`),
            secret_keys: pairs.map(([kind, , secret]) => `${kind}:${secret}`),
          },
        },
      },
    })
    console.info('Generated a new node identity')
  }
  if (reset) await storeJson.merge(effects, { resetPending: false })

  // Veilid publishes only the address the user made public on the peer port.
  const address = await sdk.host
    .getOwn(effects, 'p2p', (host) => {
      const ips =
        host?.bindings[p2pPort]?.interfaces.p2p?.addressInfo.public.filter({
          kind: 'ip',
        }).hostnames ?? []
      const ip = ips.find((h) => h.metadata.kind === 'ipv4') ?? ips[0]
      if (!ip) return null
      const port = ip.port ?? p2pPort
      return ip.metadata.kind === 'ipv6'
        ? `[${ip.hostname}]:${port}`
        : `${ip.hostname}:${port}`
    })
    .const()
  await veilidServerConf.merge(effects, {
    core: {
      network: {
        privacy: { require_inbound_relay: !address },
        protocol: {
          udp: { public_address: address },
          tcp: { public_address: address },
          ws: { url: address && `ws://${address}/ws` },
        },
      },
    },
  })

  const veilidSub = sdk.SubContainer.of(
    effects,
    { imageId: 'veilid' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'veilid',
      subpath: null,
      mountpoint: dataDir,
      readonly: false,
    }),
    'veilid-sub',
  )

  return sdk.Daemons.of(effects)
    .addOneshot('chown', {
      subcontainer: veilidSub,
      exec: {
        command: [
          'sh',
          '-c',
          `mkdir -p ${dataDir}/protected_store ${dataDir}/table_store ${dataDir}/block_store ${dataDir}/ipc && chown -R veilid:veilid ${dataDir} && chmod -R u+rwX,g-w,o-rwx ${dataDir}`,
        ],
        user: 'root',
      },
      requires: [],
    })
    .addDaemon('veilid', {
      subcontainer: veilidSub,
      exec: {
        command: ['veilid-server', '-c', `${dataDir}/veilid-server.conf`],
      },
      ready: {
        display: i18n('Veilid Network'),
        gracePeriod: 5 * 60 * 1000,
        fn: checkAttachment,
      },
      requires: ['chown'],
    })
})
