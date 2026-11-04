# Updating the upstream version

Upstream is `veilid-server` and `veilid-cli` from [gitlab.com/veilid/veilid](https://gitlab.com/veilid/veilid). The x86_64 and aarch64 images take upstream's official `.deb` files. riscv64 compiles the same release tag from source.

**packages.veilid.net keeps only the newest version.** Once upstream releases, the `.deb` URLs pinned here return 404, and every build of this package fails until it is bumped.

## Determining the upstream version

```bash
git ls-remote --tags https://gitlab.com/veilid/veilid.git 'v*' | sort -t/ -k3 -V | tail -1
curl -s https://packages.veilid.net/apt/dists/stable/main/binary-amd64/Packages | grep -E '^(Package|Version|SHA256)'
curl -s https://packages.veilid.net/apt/dists/stable/main/binary-arm64/Packages | grep -E '^(Package|Version|SHA256)'
```

The tag listing and the apt index should name the same version. Read upstream's `CHANGELOG.md` for breaking changes to `veilid-server` settings.

## Applying the bump

1. In `Dockerfile`, set `ARG VEILID_VERSION`. Set `ARG VEILID_COMMIT` to the commit the new `v<version>` tag points at (`git ls-remote https://gitlab.com/veilid/veilid.git refs/tags/v<version>`).
2. Replace all four lines of `veilid-debs.sha256` with the `SHA256` values from the two apt indexes above.
3. Bump the `rust:` builder tag if the new release raises its minimum Rust version (`rust-version` in upstream's root `Cargo.toml`).
4. Set `version` in `startos/versions/current.ts` to `<version>:0`.
5. Build all three architectures (`make`). riscv64 is a full source build, so it is the slow one and the most likely to break.
