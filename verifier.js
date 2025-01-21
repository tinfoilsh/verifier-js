function verify() {
    let repo = document.getElementById("repo").value;
    let domain = document.getElementById("domain").value;

    let log = document.getElementById("log");
    log.innerText = "";

    function addLog(message) {
        let timestamp = new Date().toLocaleString();
        log.innerText += `${timestamp} - ${message}\n`;
    }

    addLog(`Fetching latest release for ${repo}`);
    fetch("https://api.github.com/repos/" + repo + "/releases/latest")
        .then(response => response.json())
        .then(data => {
            let latestTag = data.tag_name;

            const regex = /EIF hash: ([a-f0-9]{64})/i;
            const match = data.body.match(regex);
            if (match) {
                let digest = match[1];
                addLog(`Found latest release ${latestTag}`);
                return digest;
            } else {
                addLog("Failed to find EIF hash");
            }
        })
        .catch(error => {
            addLog("Failed to fetch latest release: " + error);
            throw error;
        })
        .then(digest => {
            addLog(`Verifying ${domain} against latest release ${digest}`)
            let bundleURL = "https://api.github.com/repos/" + repo + "/attestations/sha256:" + digest;
            let attestationURL = `https://${domain}/.well-known/tinfoil-attestation`;

            let bundleLink = document.getElementById("bundleLink");
            bundleLink.href = bundleURL;
            bundleLink.textContent = bundleURL;

            let attestationLink = document.getElementById("attestationLink");
            attestationLink.href = attestationURL;
            attestationLink.textContent = attestationURL;

            addLog("Loading WASM verifier");
            const go = new Go();
            WebAssembly.instantiateStreaming(fetch("tinfoil-verifier.wasm"), go.importObject).then((result) => {
                go.run(result.instance);
                addLog("WASM verifier loaded");

                addLog("Fetching sigstore attestation bundle from GitHub");
                let sigstorePromise = fetch(bundleURL)
                    .catch(error => {
                        addLog("Failed to fetch attestation bundle from Sigstore: " + error);
                        throw error;
                    })
                    .then(response => {
                        if (response.status !== 200) {
                            let error = `Failed to fetch attestation bundle from Sigstore: ${response.status}`;
                            addLog(error);
                            throw new Error(error);
                        }
                        return response.json();
                    })
                    .then(data => {
                        let bundle = data.attestations[0].bundle;
                        addLog("Verifying sigstore signature");
                        let sigstoreMeasurement = verifySigstore(digest, JSON.stringify(bundle), repo);
                        addLog("Sigstore: " + sigstoreMeasurement);
                        return sigstoreMeasurement;
                    });

                addLog("Fetching nitro attestation");
                let nitroPromise = fetch(attestationURL)
                    .catch(error => {
                        addLog("Failed to fetch nitro attestation: " + error);
                        throw error;
                    })
                    .then(response => {
                        if (response.status !== 201) {
                            let error = `Failed to fetch nitro attestation: ${response.status}`;
                            addLog(error);
                            throw new Error(error);
                        }
                        return response.text();
                    })
                    .then(nitroAttestation => {
                        let nitroMeasurement = verifyNitro(nitroAttestation);
                        addLog("Nitro: " + nitroMeasurement);
                        return nitroMeasurement;
                    });

                // Wait for both to finish and print both
                Promise.all([sigstorePromise, nitroPromise])
                    .then(([sigstoreMeasurement, nitroMeasurement]) => {
                        if (sigstoreMeasurement === nitroMeasurement) {
                            addLog("Verification successful! ✅");
                        } else {
                            throw new Error("Verification failed: measurements do not match");
                        }
                    })
                    .catch(error => {
                        addLog("Verification failed: " + error);
                    });
            });
        })
}

document.addEventListener("DOMContentLoaded", function () {
    let url = new URL(window.location.href);
    let urlRepo = url.searchParams.get("repo");
    let urlDomain = url.searchParams.get("domain");

    if (urlRepo) {
        document.getElementById("repo").value = urlRepo;
    }
    if (urlDomain) {
        document.getElementById("domain").value = urlDomain;
    }

    verify();
});
