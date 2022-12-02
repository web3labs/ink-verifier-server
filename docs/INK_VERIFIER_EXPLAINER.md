# Ink! Verifier Service Explainer

Smart contracts allow users to interact with them without trusting third parties, such as developers or companies. However, smart contracts are stored on-chain as bytecode and is not readable to humans. Without the original source code uploaded, it is impossible for users of the smart contract to know what it really does. At the same time, uploaded source code needs to be verified to make sure that it indeed corresponds to the contract that it claims to be. Source code verification is a process that assures uploaded source code matches the binary bytecode deployed on a blockchain in a trustless way. The Ink! Verifier Service provides such a service for Ink! smart contracts running on Substrate chains.

The Ink! Verifier Service is designed to be a stand-alone service that handles both the verification process as well as the management of verified source code and metadata. It exposes a web-based API that can be integrated in any application that wishes to use the functionalities of the service. Through the web API, the client application will be able to:

- upload source code for verification
- check on verification status of a contract
- receive stream of processing logs during verification through web socket
- download verified source code and metadata files

---

**Note:**

Source code verification does not ensure the correctness nor the security of a smart contract, which is carried out by "formal verification" techniques.

---

## Source Code Verification in Ink!

Smart contracts written in Ink! are compiled to Wasm and only the Wasm blobs are stored on-chain. Hence, the published source code needs to be compiled to output the exact same Wasm blob in order to be verified. This can be achieved through a deterministic build of the source code, which requires the build environment to be equivalent for both deployment and verification. For that reason we provide [ink-verifier-image](https://github.com/web3labs/ink-verifier-image), a container image supporting the generation of verifiable build packages and its verification.

The Ink! Verifier Service currently makes use of the Ink! Verifier Image for performing deterministic builds, but it is not tied to the image. If, in the future, the Ink! team publishes an official image which supports deterministic builds, we will integrate the Ink! Verifier Service with the official image.

## Ink! Verifier Server Integration

While the Ink! Verifier Server is client-agnostic, we have integrated it with our [contracts explorer UI](https://github.com/web3labs/epirus-substrate/tree/main/explorer-ui) to provide a user-friendly interface for source code verification. 

In the following sections we will explain in detail how the UI, the Ink! Verifier Server and the Ink! Verifier Image works together.

### Source Code Verification Workflow

We will explain, with the help of a sequence diagram, the end-to-end workflow of the source code verification process.

![Source Code Verification Workflow](https://drive.google.com/uc?id=1Z4NVCnXRkDVPro7I39rFdlJ2mtSdNPDc)

**Step 1:** The user, through the interface of the Explorer UI, uploads the source code package, in `.zip`, `.tar.gz` or `.tar.bz2` format. The package should include the relevant source code files as well as the `.contract` file.

**Steps 2-3:** The UI will make a POST request with the source code package to the Ink! Verifier Server. The corresponding network name and code hash of the contract should be supplied as path parameters. If the server receives the package successfully, it will return a `201 Created` response and start the verification process in the background.

**Steps 4-6:** The server resolves the web socket endpoint for the corresponding network and retrieves the pristine Wasm blob stored on-chain by code hash. It then run the Ink! Verifier Image in a child process, passing the source code package and the pristine Wasm. 

**Steps 7-8:** At any point after the UI receives the `201 Created` response, up until the verification process is ended, it can open a web socket to the server to stream the process logs.

**Steps 9-10:** In the Ink! Verifier Image sub-process, the source code and `.contract` files will be extracted. The Wasm blob in the `.contract` file will then be matched against the pristine Wasm. If the two do not match, the process will terminate with an error.

**Steps 12-14:** If the Wasm blob in the `.contract` file matches with the pristine Wasm, the process will proceed to read the toolchain versions required for performing a deterministic build. After installing the required toolchains, the Ink! Verifier Image will compile the source code and match the output Wasm against the pristine.

**Steps 15-19:** Depending on whether the compiled Wasm matches with the pristine, the verification process will end with either publishing the verified source code or the error logs. The server web socket would then close with the corresponding exit code and the UI can display either a success or error message.

---

**Note:**

For the moment we are storing all published source codes and error logs on the file system. In the future we will consider moving the storage to decentralised storage systems.

---

### Source Code Verification Display

Besides being responsible for running the source code verification process with the Ink! Verifier Image, the Ink! Verifier Server also provides a web API to query the verification status and retrieve source files. The following sequence diagram shows how the Explorer UI interacts with the Ink! Verifier Server API to display the right information to the user. 

![Source Code Verification Workflow](https://drive.google.com/uc?id=1buW2-izg51SJALpDZuPVZAPbTsaxRDHp)

**Steps 1-2:** When a user navigates to the source code interface of a contract code hash, the UI will make a `GET` request to the Ink! Verifier Server to retrieve the verification status of the contract.

**Steps 3-5 & 12:** The UI will render the interface corresponding to the verification status. If the contract has not been verified, the user will be shown the interface for uploading the source code package to start the verification process as described in [Source Code Verification Workflow](#source-code-verification-workflow). If a verification process is in progress for the contract, the user will be able to see the rolling process logs. If a contract is already verified, the user will be shown the contract metadata and source codes.

**Steps 6-11:** In order to display the necessary information for a verified contract, the UI will need to make a few more API requests to the Ink! Verifier Server. The requests are:
- `GET` request to retrieve `metadata.json` file. This will allow the UI to display the contract name, authors, build information and the ABI.
- `GET` request to retrieve the sources list. The response is a JSON object describing the directory structure of the sources and pointers to the path of each resource.
- For each resource in the sources list, the UI will make a `GET` request to retrieve the resource file.

Finally, all resources are rendered in a user-friendly interface for the user.
