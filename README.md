# Verifier Server for Ink!

Server for Ink! source code verification.

Features:

- Uploading verifiable source code packages
- Tracking the status of the verification process
- Downloading the verified artifacts

Please, go to [ink-verifier](https://github.com/web3labs/ink-verifier) for information on how to generate the verifiable source code packages.

## Configuration

The configuration uses the environment variables described in the table below.

|Name|Description|Defaults|
|----|-----------|--------|
|SERVER_HOST|The server host address. e.g. 0.0.0.0|`127.0.0.1`|
|SERVER_PORT|The server port to listen to|`3000`|
|OAS_URL|The external URL of the server for the Opean Api docs|`http://${SERVER_HOST}:${SERVER_PORT}`|
|BASE_DIR|Base directory for verification pipeline stages|`:project_root_dir/tmp`|
|CACHES_DIR|The base directory for caches|`:project_root_dir/tmp/caches`|
|PUBLISH_DIR|Base directory for long-term access to successfully verified artefacts|`:project_root_dir/publish`|
|MAX_CONTAINERS|Maximum number of running containers|`5`|
|VERIFIER_IMAGE|The ink-verifier container image to be used for verification|`ink-verifier:develop`|
|CONTAINER_ENGINE|The container engine executable|`docker`|
|CONTAINER_RUN_PARAMS|Additional parameters for the conainter engine|n/a|

The server has support for `.env` files.

## Verification Pipeline

### Actors

* Requestor: The user uploading the source code for verification
* Server: The verification server implemented in this repository
* Verifier Image: The container image with the verification logic for ink! source codes

### Directories

* Staging: `$BASE_DIR/staging/:network/:code-hash`
* Processing: `$BASE_DIR/processing/:network/:code-hash`
* Errors: `$BASE_DIR/errors/:network/:code-hash`
* Publish: `$PUBLISH_DIR/:code-hash`

### Process Overview

1. A requestor uploads the source packge archive for a network and code hash
2. The server checks that:
  * The source code for the network and code hash is not already verified or being verified
  * There is enough host resources to start a new verification

> **Staging** steps below happen in the staging directory

3. The server downloads the pristine WASM byte code correspondening to the provided network and code hash
4. The server streams the archive if is a compressed archive

> **Processing** in the processing directory

5. The server moves the staging files to the processing directory
6. The server runs a container process for the verifier image to verify the package in processing. See [verifier image](https://github.com/web3labs/ink-verifier) for details
7. On the event of container exit the server moves the verified artificats to the publish directory if the verification was successful, otherwise keeps a log in the errors directory

## Technical Notes

### Publish Directory

The publish directory is not segmented by network name because the code hashes are content-addressable, i.e. the same for all networks.
For source code verification the network name is required to download the uploaded pristine bytecode.

### Network Names

We are using [@polkadot/apps-config](https://github.com/polkadot-js/apps/tree/master/packages/apps-config) to resolve the network endpoints by name. You can find the available endpoints in the [endpoints directory](https://github.com/polkadot-js/apps/tree/master/packages/apps-config/src/endpoints).

