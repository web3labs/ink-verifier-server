
export interface CodeHashParams {
  codeHash: string
}

export interface NetworkCodeParams extends CodeHashParams {
  network: string
}

export const CodeHashPathSchema = {
  type: 'object',
  properties: {
    codeHash: {
      type: 'string',
      description: 'The on-chain content-addressable code hash for the contract source code'
    }
  }
}

export const NetworkCodePathSchema = {
  type: 'object',
  properties: {
    network: {
      type: 'string',
      description: `The network name to resolve the node endpoint by
      [@polkadot/apps-config](https://github.com/polkadot-js/apps/tree/master/packages/apps-config/src/endpoints).
      `,
      default: 'rococoContracts'
    },
    codeHash: {
      type: 'string',
      description: 'The on-chain code hash for the contract source code'
    }
  }
}
