# Veilid

## Documentation

- [Veilid Developer Book](https://veilid.gitlab.io/developer-book/*) — the upstream guide to how Veilid works and how to run and configure a node

## What you get on StartOS

A Veilid node that runs around the clock. It routes encrypted traffic for other users, relays for phones that cannot accept connections themselves, and stores network records up to a limit you set. There is no web interface. You watch the node through its health check and the **Node Info** action.

The node does not carry traffic out to the ordinary internet, and it does not give your other services a Veilid address.

## Getting set up

1. Start the service. The **Veilid Network** health check reads "Attaching" for a minute or two, then "Attached" with a peer count.
2. Decide which IP address other Veilid nodes may see, and read [Your IP address](#your-ip-address) before you change anything.
3. Optionally, let other nodes connect to yours directly. This helps the network far more than a node reached through a relay, but it publishes that IP address to every Veilid node.
   1. Forward port **5150**, both TCP and UDP, to this server, either on your router or on your StartTunnel.
   2. In the **Veilid Peer Port** interface, turn on the public address you forwarded. The service restarts.
4. Run **Node Info** and read **Published Peer Info**. With a public address turned on, it lists that address as `Direct`. With none turned on, it lists no address and shows the relay your node is reached through.

## Using Veilid

- **Node Info** shows your node ID, its attachment strength, how many live peers it has, and the record it publishes to other nodes.
- **Configure Node** sets two things:
  - **DHT Storage Limit**: how much disk the node offers for other users' records.
  - **Log Level**: how much the node writes to the logs.

  Saving restarts the node.

- **Reset Node Identity** throws away the node's keys and routing data and starts it as a brand-new node with a new ID.

## Your IP address

Other Veilid nodes can learn your IP address in two separate ways, and each is controlled by a different setting.

- **The address your node publishes.** Your node publishes an address only if you turn one on in the **Veilid Peer Port** interface. Every Veilid node can then read it. If you turn on several, only one is published, an IPv4 address when there is one. Turning on a StartTunnel address publishes the StartTunnel's IP, not your router's.
- **The address your node's own connections come from.** Your node constantly connects out to other nodes, and each of them sees the IP address those connections come from. This is decided by the service's **Outbound Traffic** tab, not by the Veilid Peer Port interface. By default it uses the system gateway, which is usually the router your server is plugged into. **This means that, even with only a StartTunnel address turned on, or with no address turned on at all, other nodes still see your router's public IP address.**

To keep your router's public IP address away from other Veilid nodes entirely:

1. On the service's **Outbound Traffic** tab, choose your StartTunnel gateway or an outbound VPN instead of the system gateway.
2. In the **Veilid Peer Port** interface, leave your router's address turned off. Turn on only the StartTunnel address, or nothing.

The Veilid Peer Port interface may also list Tor or I2P addresses. Veilid can only use IP addresses, so turning one of those on does nothing.

## Limitations

- Backups carry your settings and your node ID, not the network records your node was storing. A restored node keeps its ID and fills its share of the network back up on its own.
