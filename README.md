# Tinfoil Verifier for JavaScript

[![Build Status](https://github.com/tinfoilanalytics/verifier-js/workflows/Build%20and%20Deploy/badge.svg)](https://github.com/tinfoilanalytics/verifier-js/actions)

## Overview

This JavaScript verifier brings Tinfoil's enclave verification capabilities directly to web browsers. Built from the same Go source code as the main [Tinfoil Go client](https://github.com/tinfoilsh/tinfoil-go), it's compiled to WebAssembly to run natively in browsers without requiring server-side verification.

When new versions are tagged, our GitHub Actions workflow automatically:
1. Compiles the Go verification logic to WebAssembly
2. Generates versioned WASM files with integrity guarantees
3. Deploys them to GitHub Pages for secure, cached distribution
4. Updates version tags so clients always load the correct module

This ensures that browser-based applications can perform an audit of Tinfoil without additional infrastructure dependencies. For more details on the underlying attestation process, see the [Tinfoil verification documentation](https://docs.tinfoil.sh/verification/comparison).

## Quick Start

Include required scripts:

```html
<script src="wasm_exec.js"></script>
<script src="main.js"></script>

<!-- Load and use the verifier -->
<script>
// Dynamically fetch the current version and load the corresponding WASM file
fetch("tinfoil-verifier.tag")
  .then(response => response.text())
  .then(version => {
    const go = new Go(); // Create verifier instance
    WebAssembly.instantiateStreaming(fetch(`tinfoil-verifier-${version}.wasm`), go.importObject)
      .then((result) => {
        go.run(result.instance);
        
        // Verify an enclave
        verifyEnclave("inference.example.com")
          .then(result => {
            console.log("Certificate fingerprint:", result.certificate);
            console.log("Enclave measurement:", result.measurement);
          });
      });
  });
</script>
```

> **Note:** The verifier uses a tag file (`tinfoil-verifier.tag`) to specify the current version, ensuring you always load the correct WASM module without hardcoding version numbers.

You can see a working example in the `public/index.html` file.

## How It Works

This verifier is compiled from the same Go source code as the main [Tinfoil Verifier](https://github.com/tinfoilsh/verifier), but targets WebAssembly to run directly in browsers. 

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


## Reporting Vulnerabilities

Please report security vulnerabilities by either:
- Emailing [contact@tinfoil.sh](mailto:contact@tinfoil.sh)
- Opening an issue on GitHub on this repository

We aim to respond to security reports within 24 hours and will keep you updated on our progress.
