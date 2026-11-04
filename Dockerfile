ARG VEILID_VERSION=0.5.7

FROM --platform=$BUILDPLATFORM debian:trixie-slim@sha256:62bd423aeee912639ca8ee681c2b762cb3e25137e0a92b20be455898a9f034ad AS fetch-deb
ARG VEILID_VERSION
ARG TARGETARCH
ADD https://packages.veilid.net/apt/pool/stable/main/veilid-server-${VEILID_VERSION}_${TARGETARCH}.deb /tmp/
ADD https://packages.veilid.net/apt/pool/stable/main/veilid-cli-${VEILID_VERSION}_${TARGETARCH}.deb /tmp/
COPY veilid-debs.sha256 /tmp/
RUN cd /tmp \
  && grep -e "-${VEILID_VERSION}_${TARGETARCH}.deb" veilid-debs.sha256 | sha256sum -c --strict \
  && [ "$(grep -c -e "-${VEILID_VERSION}_${TARGETARCH}.deb" veilid-debs.sha256)" = 2 ] \
  && mkdir /out \
  && for deb in /tmp/*.deb; do dpkg-deb --fsys-tarfile "$deb" | tar -x -C /out ./usr/bin; done

FROM fetch-deb AS bin-amd64
FROM fetch-deb AS bin-arm64

FROM --platform=$BUILDPLATFORM rust:1.99.1-slim-trixie AS bin-riscv64
ARG VEILID_VERSION
ARG VEILID_COMMIT=f5cdcca38cecf4845eb9bd5e21ddca382a357a75
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git gcc-riscv64-linux-gnu libc6-dev-riscv64-cross \
  && rm -rf /var/lib/apt/lists/*
RUN rustup target add riscv64gc-unknown-linux-gnu
RUN git clone --depth 1 --branch v${VEILID_VERSION} https://gitlab.com/veilid/veilid.git /src \
  && [ "$(git -C /src rev-parse HEAD)" = "${VEILID_COMMIT}" ]
WORKDIR /src
ENV CARGO_TARGET_RISCV64GC_UNKNOWN_LINUX_GNU_LINKER=riscv64-linux-gnu-gcc \
  CC_riscv64gc_unknown_linux_gnu=riscv64-linux-gnu-gcc
RUN cargo build --locked --release --target riscv64gc-unknown-linux-gnu -p veilid-server -p veilid-cli \
  && mkdir -p /out/usr/bin \
  && cp target/riscv64gc-unknown-linux-gnu/release/veilid-server target/riscv64gc-unknown-linux-gnu/release/veilid-cli /out/usr/bin/

FROM bin-${TARGETARCH} AS bin

FROM debian:trixie-slim@sha256:62bd423aeee912639ca8ee681c2b762cb3e25137e0a92b20be455898a9f034ad
COPY --from=bin /out/usr/bin/ /usr/bin/
RUN groupadd --system veilid \
  && useradd --system --gid veilid --home-dir /var/db/veilid-server --no-create-home --shell /usr/sbin/nologin veilid
USER veilid
ENTRYPOINT ["veilid-server"]
