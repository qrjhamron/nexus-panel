# Stage 1: Build static musl binary
FROM rust:1.93-alpine AS builder
RUN apk add --no-cache musl-dev protobuf-dev git

WORKDIR /build
COPY wings/Cargo.toml wings/Cargo.lock* wings/build.rs wings/
COPY wings/src/ wings/src/
COPY packages/shared/proto/ packages/shared/proto/

# Clear .cargo/config.toml — Alpine gcc links against musl natively
RUN mkdir -p /build/wings/.cargo && echo '' > /build/wings/.cargo/config.toml

WORKDIR /build/wings
RUN cargo build --release

# Stage 2: Minimal runtime
FROM alpine:3.21

COPY --from=builder /build/wings/target/release/nexus-wings /usr/local/bin/nexus-wings

RUN mkdir -p /etc/nexus /var/lib/nexus/data && \
    nexus-wings version

EXPOSE 8080 8081

ENTRYPOINT ["nexus-wings"]
