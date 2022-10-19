# Ink Verifier Server

Server for Ink! source code verification.

## Configuration

The configuration uses the environment variables described in the table below.

|Name|Description|
|----|-----------|
|SERVER_HOST| |
|SERVER_PORT| |
|OAS_URL| |
|BASE_DIR|Base directory for verification pipeline stages|
|PUBLISH_DIR|Base directory for long-term access to successfully verified artefacts|
|MAX_CONTAINERS|Maximum number of running containers|
|VERIFIER_IMAGE| |
|DOCKER_RUN_PARAMS| |
|CACHES_DIR| |

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
* Publish: `$PUBLISH_DIR/:network/:code-hash`

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

Substrate network endpoint resolution

