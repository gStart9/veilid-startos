<p align="center">
  <img src="icon.png" alt="Veilid Logo" width="21%">
</p>

# Veilid on StartOS

> Everything not listed in this document should behave the same as upstream Veilid.
> If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable — see the Documentation section of
> `instructions.md` for links.

This package runs `veilid-server`, the headless Veilid node, as an always-on peer. It is a network node only. It does not provide Veilid addresses for other services, and nothing it carries leaves the Veilid network.

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)

## Image and Container Runtime

The image is built from the package's `Dockerfile` on a Debian slim base, and it carries both `veilid-server` and `veilid-cli`.

| Architecture | Source of the binaries                                                                       |
| ------------ | -------------------------------------------------------------------------------------------- |
| x86_64       | Upstream's official `.deb` from `packages.veilid.net`, verified against `veilid-debs.sha256` |
| aarch64      | Upstream's official `.deb` from `packages.veilid.net`, verified against `veilid-debs.sha256` |
| riscv64      | Cross-compiled from the upstream release tag, checked against its pinned commit              |

Upstream publishes no riscv64 build.

One subcontainer, `veilid-sub`, runs:

- a `chown` oneshot as root, which creates the store directories and hands the data directory to the `veilid` user;
- the `veilid` daemon, `veilid-server -c /var/db/veilid-server/veilid-server.conf`, as the `veilid` user.

## Volume and Data Layout

The package has two volumes:

- `veilid`, mounted at `/var/db/veilid-server`, which holds the node's own data;
- `startos`, which is mounted nowhere and holds the package's internal state.

| Path (in `veilid`)   | Contents                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `veilid-server.conf` | Node configuration, owned by the package, including the node's identity key pair               |
| `protected_store/`   | The device key that encrypts the table store (`insecure_keyring`, stored in the clear on disk) |
| `table_store/`       | Encrypted tables: the routing table and DHT records                                            |
| `block_store/`       | Block storage. Not used by release builds                                                      |
| `ipc/`               | IPC socket that `veilid-cli` can connect through                                               |

`startos/store.json` holds `resetPending`, which the **Reset Node Identity** action sets.

## File Models

There are two file models.

- **`veilid-server.conf`** (YAML, `startos/fileModels/veilidServerConf.ts`):
  - **Seeded:** on every init with an empty merge.
  - **Fixed values, self-healed on every init:** the store directories, insecure protected storage, the client API (IPC on, TCP on `0.0.0.0:5959`), `auto_attach`, terminal logging, UPnP off, address-change detection off (`detect_address_changes: false`), and the UDP/TCP/WS listen addresses (`:5150`).
  - **Identity, written by the package:** `core.network.routing_table.public_keys` and `secret_keys`. Before the daemon starts, `main` generates them with `veilid-server --generate-key-pairs` if they are missing, and again after Reset Node Identity. veilid-server takes these over any identity in `table_store/`.
  - **Published address, written by `main` from the Interfaces page:** `core.network.protocol.udp.public_address`, `tcp.public_address`, `ws.url` and `core.network.privacy.require_inbound_relay`. See [Network Access and Interfaces](#network-access-and-interfaces).
  - **User values, written by Configure Node:** `core.network.dht.remote_max_storage_space_mb` and `logging.terminal.level`.
  - **Hand edits:** keys the model doesn't name survive. A hand edit to a fixed value is reverted on the next init.
- **`store.json`** (JSON, on the `startos` volume) holds `resetPending`. It is seeded on every init.

## Dependencies

None.

## Network Access and Interfaces

The package binds two ports.

| Port | Host id | Protocols        | Interface                  | Purpose                                        |
| ---- | ------- | ---------------- | -------------------------- | ---------------------------------------------- |
| 5150 | `p2p`   | UDP, TCP, WS     | `p2p` (`Veilid Peer Port`) | Veilid peer traffic                            |
| 5959 | `api`   | TCP (JSON lines) | none                       | Veilid JSON API, for other services on the box |

The API has no authentication. It is bound but not exported, so it is reachable only over the LXC bridge, never from the LAN, a public address, or Tor. A dependent resolves it with `sdk.host.getBridgeAddress(effects, { packageId: 'veilid', hostId: 'api', internalPort: 5959 })`.

The node publishes only an address the user has made public on the `p2p` interface, and never discovers one by itself. `main` reads the interface's enabled public IP addresses reactively, so toggling one restarts the service:

- **None enabled:** `require_inbound_relay` is on. The node publishes no address and is reached through another node acting as a relay.
- **One or more enabled:** the first IPv4 address (otherwise the first IPv6) becomes the node's static UDP, TCP and WS address, published as `Direct` without being tested. Veilid takes one address per protocol, so any other enabled address is not published.

Turning an address on does not open the port at the gateway. The router or StartTunnel must forward 5150, TCP and UDP, to this server, or peers fail to connect to the published address.

A peer this node connects to still sees the IP the connection comes from, which is the service's outbound gateway (by default the system gateway, usually the router the server is plugged into), whatever is enabled on `p2p`. Only setting the service's outbound gateway to StartTunnel or a VPN keeps the router's public IP from peers.

Tor and I2P plugin addresses on `p2p` are ignored, because Veilid dial info is IP-only.

## Installation and First-Run Flow

Nothing needs to be set up. On first start the package generates the node's identity into `veilid-server.conf`, then the node bootstraps from `bootstrap-v1.veilid.net` and attaches.

## Actions

- **Node Info** (`node-info`):
  - **When to run it:** whenever you want to inspect the node; read-only and safe to repeat. It only runs while the service is running.
  - **What it does:** queries the API from a temporary subcontainer, then shows the node IDs, the attachment state, the live peer count, and the node's published peer record verbatim.
- **Configure Node** (`configure-node`):
  - **When to run it:** to change the DHT storage limit (default 10000 MB) or the log level (default `info`).
  - **What it does:** writes `veilid-server.conf` and restarts the service. Safe to repeat.
- **Reset Node Identity** (`reset-node`):
  - **When to run it:** to start over as a new node, for example after the node's keys have been exposed.
  - **What it does:** sets `resetPending`, then restarts. Before any daemon starts, `protected_store/`, `table_store/` and `block_store/` are deleted and a new key pair replaces the one in `veilid-server.conf`. The old node ID can't be recovered.

## Tasks

None.

## Health Checks

**Veilid Network** (the daemon's ready check) sends `GetState` to the API on loopback. It allows a 5-minute grace period.

| Attachment state                | Result                                         |
| ------------------------------- | ---------------------------------------------- |
| `AttachedWeak` … `AttachedFull` | success, with the strength and live peer count |
| `Attaching`                     | starting                                       |
| `Detached`, `Detaching`         | failure                                        |
| API unreachable                 | starting                                       |

A failure that lasts beyond the grace period almost always means the server can't resolve DNS or can't make outbound connections, because bootstrap depends on a DNS TXT lookup.

## Backups and Restore

Both volumes are backed up, apart from `protected_store/`, `table_store/`, `block_store/` and `ipc/`. A backup therefore carries `veilid-server.conf`, which holds the settings and the node's identity key pair, plus the package's internal state. DHT records and the routing table are not backed up. A restored node keeps its node ID and rebuilds its routing table and DHT share from the network.

## Limitations and Differences

- The package is a node only. It has no SOCKS proxy, no tunnel, and no address plugin for other services.
- Protected storage is file-based (`always_use_insecure_storage`). The device key sits on the same volume as the data it encrypts, and the node's secret key is stored in the clear in `veilid-server.conf`.
- UPnP is off. Port forwarding is left to the user's router.
- WSS is not offered, because upstream release builds compile it out.

---

## Quick Reference for AI Consumers

```yaml
package_id: 'veilid'
image: 'Dockerfile: upstream .deb binaries (x86_64, aarch64), source build (riscv64), Debian slim'
architectures: [x86_64, aarch64, riscv64]
subcontainers: [veilid-sub]
volumes:
  veilid: /var/db/veilid-server
  startos: not mounted
file_models:
  - veilid-server.conf (YAML, veilid volume)
  - store.json (JSON, startos volume)
startos_managed_env_vars: []
dependencies: []
interfaces:
  p2p: { port: 5150, protocols: [udp, tcp, ws], type: p2p }
  api: { port: 5959, exported: false, bridge_only: true, auth: none }
actions: [node-info, configure-node, reset-node]
tasks: []
health_checks: [veilid]
```
