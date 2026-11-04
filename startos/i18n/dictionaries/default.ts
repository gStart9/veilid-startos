export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  weak: 0,
  fair: 1,
  good: 2,
  strong: 3,
  full: 4,
  'Attached (${strength}, ${peers} peers)': 5,
  'Attaching to the Veilid network': 6,
  'Not attached to the Veilid network. Check that this server can resolve DNS and make outbound connections.': 7,
  'Starting the Veilid node': 8,
  'Veilid Network': 9,

  // interfaces.ts
  'Veilid Peer Port': 10,
  'UDP, TCP and WebSocket port other Veilid nodes connect to': 11,

  // actions/configureNode.ts
  'DHT Storage Limit': 12,
  'Disk space this node offers for records that other Veilid users store on the network.': 13,
  'Log Level': 16,
  'How much the node writes to the service logs. Raise it to chase a problem, then lower it again.': 17,
  Error: 18,
  Warning: 19,
  Info: 20,
  Debug: 21,
  'Configure Node': 22,
  'Set how much storage the node offers and how much it logs': 23,

  // actions/nodeInfo.ts
  'Node Info': 24,
  "Show this node's Veilid identity and its connection to the network": 25,
  'Node ID': 26,
  Attachment: 27,
  'Published Peer Info': 28,
  'What this node advertises to other Veilid nodes: its public address, whether that address sits behind NAT, and any relay it uses': 29,
  'Live Peers': 32,

  // actions/resetNode.ts
  'Reset Node Identity': 33,
  'Discard this node’s keys and routing data and restart as a brand-new node': 34,
  'The current node ID is gone for good. Anything stored on the network under this node’s identity can no longer be reached through it.': 35,
  'Reset Queued': 36,
  'The node is restarting with a new identity. It takes a few minutes to attach to the network again.': 37,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
