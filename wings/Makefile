.PHONY: build release test run docker

build:
	cargo build

release:
	cargo build --release

test:
	cargo test

run:
	cargo run -- --config config.toml

docker:
	docker build -t nexus-wings:latest .

clean:
	cargo clean
