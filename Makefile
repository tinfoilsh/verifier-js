all: clean patch build

clean:
	rm -rf public/tinfoil-verifier*.wasm

patch: # This is a hack. We should upstream this
	go mod vendor
	cp patches/util_unix.go.patched vendor/github.com/in-toto/in-toto-golang/in_toto/util_unix.go
	cp patches/logger_wasm.go.patched vendor/github.com/google/logger/logger_wasm.go
	patch vendor/marwan.io/wasm-fetch/fetch.go patches/fetch.patch

build:
	$(eval VERSION := $(shell git describe --tags --always))
	GOOS=js GOARCH=wasm go build \
		-trimpath \
		-ldflags="-buildid= -X main.version=$(VERSION)" \
		-o public/tinfoil-verifier-$(VERSION).wasm
	cp public/tinfoil-verifier-$(VERSION).wasm public/tinfoil-verifier.wasm
	echo "$(VERSION)" > public/tinfoil-verifier.tag
	#cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" .
