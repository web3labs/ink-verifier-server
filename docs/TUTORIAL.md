Please, see [Ink! Verifier Explainer](https://github.com/web3labs/ink-verifier-server/blob/main/docs/INK_VERIFIER_EXPLAINER.md) for an overall explanation of how the system components relate to each other.

# Testing Scenarios

## Prerequisites

You will need the following software installed in your machine:
- Docker >= 20.10.21
- Docker Compose >= 1.29.2
- Node.js >= 16.5.1

As well you will need a set of services running, below the instructions.

Clone the [epirus-substrate](https://github.com/web3labs/epirus-substrate) repository

```
git clone git@github.com:web3labs/epirus-substrate.git
```

Change directory to `local-testnet`

```
cd epirus-substrate/local-testnet
```

Run your substrate test network
```
docker-compose -f docker-compose.testnet.yml up
```

Run a local archive
```
docker-compose -f docker-compose.squid-archive.yml up
```

Run a squid-ink
```
docker-compose -f docker-compose.squid-ink.yml up
```

Run the explorer user interface
```
docker-compose -f docker-compose.explorer-ui.yml up
```

Alternatively, you can run all the above commands at once executing the `./run-all.sh` script.

## S1 - Verifiable Packages

In this scenario we will generate a verifiable package, upload the contract to local chain and verify it using the explorer UI.

Clone the  [ink-verifier-image](https://github.com/web3labs/ink-verifier-image) repository
```
git clone git@github.com:web3labs/ink-verifier-image.git
```

Change the working directory
```
cd ink-verifier-image
```

Build the docker image
```
docker build . -t ink-verifier:develop
```

Change to the command line tool directory
```
cd cli
```

Install the command line tool
> You will need cargo installed, if it is not the case check [rustup](https://www.rust-lang.org/tools/install)
```
cargo install --path .
```

Check that the tool is installed correctly
```
build-verifiable-ink -h
```

🌟 Now it is time to test out some smart contracts

In another directory...
```
cd ../..
```

Clone the [example contracts](https://github.com/web3labs/dev-contracts-substrate) repository
```
git clone git@github.com:web3labs/dev-contracts-substrate.git
```

Change the working directory to the flipper contract source
```
cd examples/...
```

Generate the verifiable source code package
```
build-verifiable-ink -t develop .
```

Extract the `<name> .contract` file frome the packag.zip
```
```
upload and instantiate the contract to your chain
```
```


Run the verifier server
Clone repo
```
```

```
npm start
```

Now you can use the explorer ui to find your contract code hash and verify the source code package.

Go to the explorer-ui (http://)

using the search box find the code hash
Open the Source Code tab
upload the package.zip
Click verify

See video...

S2 Owner-signed Metadata

...


