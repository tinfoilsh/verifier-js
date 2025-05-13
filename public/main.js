function verify() {
    let repo = document.getElementById("repo").value;
    let hostname = document.getElementById("domain").value;

    document.getElementById("logs").innerHTML = "";

    function addLog(...messages) {
        const date = new Date();
        const timestamp = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
        console.log(`${timestamp}`, ...messages, '\n');
    }

    fetch("/tinfoil-verifier.tag")
        .then(response => response.text())
        .then(version => {
            addLog(`Loading verifier-js ${version}`);

            const go = new Go();
            WebAssembly.instantiateStreaming(fetch(`/tinfoil-verifier-${version}.wasm`), go.importObject).then((result) => {
                go.run(result.instance);

                if (verifierVersion === version) {
                    addLog(`WARNING: verifier-js version mismatch. Requested ${version}, got ${verifierVersion}`);
                } else {
                    addLog("Verifier version match");
                }

                let enclavePromise = verifyEnclave(hostname).then(result => {
                    addLog("Enclave attested certificate fingerprint:", result.certificate);
                    return result.measurement;
                }).catch(error => {
                    addLog("Error verifying enclave:", error);
                });

                addLog(`Fetching latest release for ${repo}`);
                let sigstorePromise = fetch("https://api.github.com/repos/" + repo + "/releases/latest")
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
                            const regex = /Digest: `([a-f0-9]{64})`/;
                            const match = data.body.match(regex);
                            if (match) {
                                let digest = match[1];
                                addLog(`Found latest release ${latestTag}`);
                                return digest;
                            } else {
                                addLog("Failed to find EIF hash");
                            }
                        }
                    })
                    .then(digest => {
                        return verifyCode(repo, digest)
                    })
                    .catch(error => {
                        addLog("Failed to fetch latest release: " + error);
                        throw error;
                    })
        
                Promise.all([sigstorePromise, enclavePromise])
                    .then(([sigstoreMeasurement, enclaveMeasurement]) => {
                        addLog("Source:", sigstoreMeasurement);
                        addLog("Enclave:", enclaveMeasurement);
                        if (sigstoreMeasurement === enclaveMeasurement) {
                            addLog("Verification successful! ✅");
                        } else {
                            throw new Error("Verification failed: measurements do not match");
                        }
                    })
                    .catch(error => {
                        addLog("Verification failed: " + error);
                    });
            });
        });
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

    let logsElement = document.getElementById("logs");

    console.stdlog = console.log.bind(console);
    console.log = function () {
        console.stdlog.apply(console, arguments);
        logsElement.innerHTML = logsElement.innerHTML + Array.from(arguments).join(" ") + "<br>";
    }

    verify();
});
