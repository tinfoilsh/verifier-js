# Tinfoil Verifier for JavaScript

[![Build Status](https://github.com/tinfoilanalytics/verifier-js/workflows/Build%20and%20Deploy/badge.svg)](https://github.com/tinfoilanalytics/verifier-js/actions)

## Quick Start

Include required scripts:

```html
<script src="wasm_exec.js"></script>
<script src="main.js"></script>

<!-- Load and use the verifier -->
<script>
const go = new Go(); // Create verifier instance
WebAssembly.instantiateStreaming(fetch("tinfoil-verifier.wasm"), go.importObject)
  .then((result) => {
    go.run(result.instance);
    
    // Verify an enclave
    verifyEnclave("inference.example.com")
      .then(result => {
        console.log("Certificate fingerprint:", result.certificate);
        console.log("Enclave measurement:", result.measurement);
      });
  });
</script>
```

You can see a working example in the `public/index.html` file.

## Building the WebAssembly Module

The verifier is built using Go's WebAssembly target.
Simply run `make` to build the module, which produces `public/tinfoil-verifier.wasm`.


## How It Works

This verifier is compiled from the same Go source code as the main [Tinfoil Verifier](https://github.com/tinfoilanalytics/verifier), but targets WebAssembly to run directly in browsers. 

```javascript
// 1. Verify enclave attestation
const enclaveResult = await verifyEnclave("inference.example.com");
console.log("Enclave measurement:", enclaveResult.measurement);

// 2. Verify code matches GitHub release
const repo = "org/repo";
const codeResult = await verifyCode(repo, expectedDigest);
console.log("Code measurement:", codeResult);

// 3. Compare measurements
if (enclaveResult.measurement === codeResult) {
  console.log("Verification successful!");
} else {
  console.error("Measurements don't match!");
}
```


##  Reporting Vulnerabilities

Please report security vulnerabilities by either:
- Emailing [contact@tinfoil.sh](mailto:contact@tinfoil.sh)
- Opening an issue on GitHub on this repository

We aim to respond to security reports within 24 hours and will keep you updated on our progress.
