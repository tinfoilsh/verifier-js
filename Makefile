all: clean patch build

clean:
	rm -rf tinfoil-verifier.wasm

update-release:
	go get github.com/tinfoilanalytics/verifier@$(shell curl -sL https://api.github.com/repos/tinfoilanalytics/verifier/releases/latest | jq -r ".tag_name")

patch: # This is a hack. We should upstream this
	go mod vendor
	cp util_unix.go.patched vendor/github.com/in-toto/in-toto-golang/in_toto/util_unix.go

build:
	GOOS=js GOARCH=wasm go build \
		-trimpath \
		-ldflags=-buildid= \
		-o public/tinfoil-verifier.wasm
	#cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" .
