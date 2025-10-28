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

**Try it now**: The hosted WASM verifier is available at [tinfoil.sh/verifier](https://tinfoil.sh/verifier)

**Usage**: This WASM verifier is also integrated into [Tinfoil Chat](https://chat.tinfoil.sh) to provide transparent verification of the Tinfoil private chat. The verification center UI can be found in [tinfoil-chat/verifier](https://github.com/tinfoilsh/tinfoil-chat/tree/main/src/components/verifier).

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

        // Complete end-to-end verification (recommended)
        verify("inference.example.com", "tinfoilsh/confidential-llama-qwen")
          .then(groundTruthJSON => {
            const groundTruth = JSON.parse(groundTruthJSON);
            console.log("TLS Public Key:", groundTruth.tls_public_key);
            console.log("HPKE Public Key:", groundTruth.hpke_public_key);
            console.log("Verification successful!");
          })
          .catch(error => {
            console.error("Verification failed:", error);
          });
      });
  });
</script>
```

## How It Works

This verifier is compiled from the same Go source code as the main [Tinfoil Verifier](https://github.com/tinfoilsh/verifier), but targets WebAssembly to run directly in browsers.

### Complete Verification (Recommended)

Use the `verify()` function for complete end-to-end verification that performs all steps atomically:

```javascript
// Complete end-to-end verification
const groundTruthJSON = await verify("inference.example.com", "tinfoilsh/confidential-llama-qwen");
const groundTruth = JSON.parse(groundTruthJSON);

// The ground truth contains:
// - tls_public_key: TLS certificate fingerprint
// - hpke_public_key: HPKE public key for E2E encryption
// - digest: GitHub release digest
// - code_measurement: Expected code measurement from GitHub
// - enclave_measurement: Actual runtime measurement from enclave
// - hardware_measurement: TDX platform measurements (if applicable)
// - code_fingerprint: Fingerprint of code measurement
// - enclave_fingerprint: Fingerprint of enclave measurement

console.log("TLS Public Key:", groundTruth.tls_public_key);
console.log("HPKE Public Key:", groundTruth.hpke_public_key);
console.log("Verification successful - measurements match!");
```

The `verify()` function automatically:
1. Fetches the latest release digest from GitHub
2. Verifies code provenance using Sigstore/Rekor
3. Performs runtime attestation against the enclave
4. Verifies hardware measurements (for TDX platforms)
5. Compares code and runtime measurements using platform-specific logic

If any step fails, an error is thrown with details about which step failed.

### Manual Step-by-Step Verification

For more control, you can perform individual verification steps:

```javascript
// 1. Verify enclave attestation
const enclaveResult = await verifyEnclave("inference.example.com");
console.log("Enclave measurement:", enclaveResult.measurement);

// 2. Verify code matches GitHub release
const repo = "org/repo";
const codeResult = await verifyCode(repo, expectedDigest);
console.log("Code measurement:", codeResult);

// 3. Compare measurements manually
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
