# Source Code Verification Tutorial

> If you would like to understand how the system components relate to each other, please check out the [Ink! Verifier Explainer](./INK_VERIFIER_EXPLAINER.md).

- [**Testing on Local Network**](#testing-on-local-network)
  - [**Prerequisites**](#prerequisites)
    - [**Local Testnet and Explorer Setup**](#local-testnet-and-explorer-setup)
    - [**Local Verifier Server Setup**](#local-verifier-server-setup)
  - [**S1 - Verifiable Packages**](#s1---verifiable-packages)
    - [**Generating the Verifiable Package**](#generating-the-verifiable-package)
    - [**Uploading to the Network**](#uploading-to-the-network)
    - [**Verifying Your Contract**](#verifying-your-contract)
  - [**S2 - Owner-signed Metadata**](#s2---owner-signed-metadata)
- [**Testing on Rococo Contracts**](#testing-on-rococo-contracts)

## **Testing on Local Network**

### **Prerequisites**

You will need the following software installed in your machine:
- Docker >= 20.10.21
- Docker Compose >= 1.29.2
- Node.js >= 16.5.1

#### **Local Testnet and Explorer Setup**

Clone the [epirus-substrate](https://github.com/web3labs/epirus-substrate) repository

```bash
git clone git@github.com:web3labs/epirus-substrate.git
```

Change directory to `local-testnet`

```bash
cd epirus-substrate/local-testnet
```

Run your substrate test network
```bash
docker-compose -f docker-compose.testnet.yml up -d
```

Run a local Squid archive
```bash
docker-compose -f docker-compose.squid-archive.yml up -d
```

Run a squid-ink processor
```bash
docker-compose -f docker-compose.squid-ink.yml up -d
```

Run the explorer user interface
```bash
docker-compose -f docker-compose.explorer-ui.yml up -d
```

Alternatively, you can run all the above commands at once executing the `./run-all.sh` script.

#### **Local Verifier Server Setup**

Clone the [Ink! Verifier Server](https://github.com/web3labs/ink-verifier-server) repository

```bash
git clone git@github.com:web3labs/ink-verifier-server.git
```

Enter the project directory and start the server. You can also run `npm run start:dev` to see prettified logs.
```bash
cd ink-verifier-server && npm start
```

### **S1 - Verifiable Packages**

In this scenario we will generate a verifiable package, upload the contract to local chain and verify it using the explorer UI.

#### **Generating the Verifiable Package**
> You can skip directly to the next section [Uploading to the Network](#uploading-to-the-network) if you use verifiable packages already generated in [this repo directory](https://github.com/web3labs/dev-contracts-substrate/tree/main/verifiable-packages/ink4.0.0-alpha.3). Note that in this case you will need to use Polkadot.js UI or Contracts UI for uploading.

Clone the  [ink-verifier-image](https://github.com/web3labs/ink-verifier-image) repository
```bash
git clone git@github.com:web3labs/ink-verifier-image.git
```

Change the working directory
```bash
cd ink-verifier-image
```

Build the docker image
```bash
docker build . -t ink-verifier:develop
```

Change to the command line tool directory
```bash
cd cli/
```

Install the command line tool
> You will need cargo installed, if it is not the case check [rustup](https://www.rust-lang.org/tools/install)
```bash
cargo install --path .
```

Check that the tool is installed correctly
```
❯ build-verifiable-ink -h
A command line interface to generate verifiable source code packages.

Usage: build-verifiable-ink [OPTIONS] <SOURCE>

Arguments:
  <SOURCE>  Source directory, can be relative; e.g. '.'

Options:
  -i, --image <IMAGE>        Ink! verifier image name [default: ink-verifier]
  -t, --tag <TAG>            Ink! verifier image tag [default: latest]
      --engine <ENGINE>      Container engine [default: docker]
      --env-file <ENV_FILE>  Environment file
  -h, --help                 Print help information
  -V, --version              Print version information
```

🌟 Now it is time to test out some smart contracts

In another directory, clone the [example contracts](https://github.com/web3labs/dev-contracts-substrate) repository
```bash
git clone git@github.com:web3labs/dev-contracts-substrate.git
```

Change the working directory to the flipper contract source
```bash
cd example-contracts/flipper/
```

Generate the verifiable source code package
```bash
build-verifiable-ink -t develop .
```

At the end of the build you should see the following output
```
The contract was built in RELEASE mode.

Your contract artifacts are ready. You can find them in:
/build/package/src/target/ink

  - flipper.contract (code + metadata)
  - flipper.wasm (the contract's code)
  - metadata.json (the contract's metadata)
  adding: src/ (stored 0%)
  adding: src/lib.rs (deflated 67%)
  adding: src/Cargo.toml (deflated 48%)
  adding: src/Cargo.lock (deflated 77%)
  adding: flipper.contract (deflated 61%)
Verification package in /build/target/ink/package.zip
Archive:  /build/target/ink/package.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
        0  2022-12-01 11:44   src/
     1315  2022-12-01 11:32   src/lib.rs
      690  2022-12-01 11:32   src/Cargo.toml
    17747  2022-12-01 11:43   src/Cargo.lock
     4152  2022-12-01 11:44   flipper.contract
---------                     -------
    23904                     5 files
```

#### **Uploading to the Network**

Extract the `<name>.contract` file frome the package.zip if you plan to use [Polkadot.js UI](https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/contracts) or [Contracts UI](https://weightv1--contracts-ui.netlify.app/?rpc=ws://127.0.0.1:9944) to upload your contract. If you want to use cargo-contract tool, you will need to extract the `metadata.json` and `flipper.wasm` files.
```bash
❯ unzip -qq -p target/ink/package.zip "*.contract" > target/ink/flipper.contract
❯ unzip -qq -p target/ink/package.zip "*.contract" | jq "del(.source.wasm)" > target/ink/metadata.json
❯ unzip -qq -p target/ink/package.zip "*.contract" | jq -r ".source.wasm" | xxd -r -p > target/ink/flipper.wasm
```
If you're using cargo-contract
```
cargo contract upload -s '//Bob'
```

#### **Verifying Your Contract**

Now you can use the explorer ui to find your contract code hash and verify the source code package.

Go to the explorer-ui. It should be running on http://127.0.0.1:3000/ and you should see the homepage.

![homepage](https://drive.google.com/uc?id=1yG6bLlOQiywm9svg9-dtB8gY_PdLmExT)

Navigate to the code hash page through the link on the homepage (indicated by yellow arrow in the above image). Alternatively, use the search box to find the code hash. Inside the code hash page, open the Source Code tab.

![source code tab](https://drive.google.com/uc?id=1vv1ZFAlO-5fByWJ4snzhtEKrRwR_LdBC)

Upload the generated `package.zip` and click the Verify Source Code button.

![source code tab](https://drive.google.com/uc?id=1fyXqe4axYrlAxIGiiE096TxrBCB2gB_S)

You should see the process logs of the verification being streamed. The verification process will take a while; in the meantime, why not brew a fresh cup of ☕?

![source code tab](https://drive.google.com/uc?id=11kjgoGeNOSGkqg8DaOLY2YP6j7SJ3xy_)

Verification success! 🎉 (hopefully)

![verification success](https://drive.google.com/uc?id=1RQB458aeiiPFjN7aM6wZeHn-vufdJMIz)

Click on Browse Verified Files to see your verified source code.
 
![verified source code](https://drive.google.com/uc?id=1xRBp2wQ_aUox3Ca50Hu6Y95R4wKhfC-3)

### **S2 - Owner-signed Metadata**

> To understand more about this feature and why we are supporting it, check out the [veriifier server documentation](../README.md#unverified-metadata-upload)
 
In this scenario we will upload only the contract metadata and sign it using the explorer UI.

Since this feature does not carry out verification, you can use any ink! contract built using `cargo contract build`. Upload your contract as you would normally do and have the `metadata.json` file ready. If you do not have any contracts already built, follow the steps in [Generating the Verifiable Package](#generating-the-verifiable-package) and [Uploading to the Network](#uploading-to-the-network).

---

**Note:**

If you have already verified the source code following the steps in [S1 - Verifiable Packages](#s1---verifiable-packages), you won't have the option to test out the metadata upload using the same contract. If you want to avoid compiling and uploading another contract, you can remove the directory storing the verified source code in `<root-path>/ink-verifier-server/.tmp/publish/<codehash>/`

---

After your contract is already uploaded, open up the explorer UI and navigate to your contract code hash page. Click on "Signed Metadata" to display the metadata upload interface.

![signed metadata upload](https://drive.google.com/uc?id=1tDbAtXGptbQ0mLRwGHFeVJkY7j9pGJLC)

Drag and drop the `metadata.json` file into the upload box. You will notice that the "Current message to be signed by the owner account" field will be automatically generated. You will need to sign this message using the account that uploaded the contract. You can either use the subkey command suggested in the UI, or use the [Sign and Verify](https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/signing) tool of Polkadot.js. Paste your signature in the "Owner Signature" textbox and hit "Upload Metadata".

![signed metadata upload](https://drive.google.com/uc?id=1gxT5wl1lH9u4KQtHA5yZAmbgT_PDYqya)

❗ You will need to sign the message using the same account that uploaded the contract code hash, otherwise the upload will fail.

You will now see your contract metadata in the source code tab.

![signed metadata upload](https://drive.google.com/uc?id=137VFlVosRVZFcsZpZSWY82qIEFX3gIJz)

## **Testing on Rococo Contracts**

We run a public instance of the Explorer UI that indexes Rococo Contracts and is integrated with our verifier server. You can access the public explorer at https://substrate.sirato.xyz/

If you wish to verify contracts or upload metadata in Rococo Contracts, simply follow the same steps as in [S1 - Verifiable Packages](#s1---verifiable-packages) and [S2 - Owner-signed Metadata](#s2---owner-signed-metadata) using the public Explorer instance.

If you need some ROC to upload contracts, head to the Rococo Faucet Matrix chatroom #rococo-faucet:matrix.org and post
```
!drip YOUR_SS_58_ADDRESS:1002
```