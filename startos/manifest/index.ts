import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'veilid',
  title: 'Veilid',
  license: 'MPL-2.0',
  packageRepo: 'https://github.com/gStart9/veilid-startos',
  upstreamRepo: 'https://gitlab.com/veilid/veilid',
  marketingUrl: 'https://veilid.com/',
  donationUrl: 'https://veilid.com/donate/',
  description: { short, long },
  volumes: ['veilid', 'startos'],
  images: {
    veilid: {
      source: { dockerBuild: {} },
      arch: ['x86_64', 'aarch64', 'riscv64'],
    },
  },
})
