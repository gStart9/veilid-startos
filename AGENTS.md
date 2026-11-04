# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

- Actions can't reach the API on `127.0.0.1` because they don't share the subcontainers' network namespace. Query it from a temporary subcontainer, as `node-info` does. The health check runs in the main context, where loopback does work.
- Keep `detect_address_changes` pinned to `false`. With detection on, Veilid publishes the IP its outbound traffic comes from, which the user never made public.
