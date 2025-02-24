import { CLMM_PROGRAM_ID, DEVNET_PROGRAM_ID } from '@raydium-io/raydium-sdk-v2'

const VALID_PROGRAM_ID = new Set([CLMM_PROGRAM_ID.toBase58(), DEVNET_PROGRAM_ID.CLMM.toBase58(),"CSXnnfF6c9jetGKqWkii55CRRvBt8jr9NvkXuh7G4tPA"])

export const isValidClmm = (id: string) => VALID_PROGRAM_ID.has(id)

export const devConfigs = [
  {
    id: '8tuDKCjN9dw978zV16a6znQBhNLCmC3KKzJw8FwjgRQN',
    index: 0,
    protocolFeeRate: 120000,
    tradeFeeRate: 100,
    tickSpacing: 10,
    fundFeeRate: 40000,
    description: 'Best for very stable pairs',
    defaultRange: 0.005,
    defaultRangePoint: [0.001, 0.003, 0.005, 0.008, 0.01],
  },
  {
    id: '2eB2nFKhGaMtn4SvxKjKFN671JhehuidAhShFRA9G8GN',
    index: 1,
    protocolFeeRate: 120000,
    tradeFeeRate: 10,
    tickSpacing: 100,
    fundFeeRate: 1000,
    description: 'Best for most pairs',
    defaultRange: 0.1,
    defaultRangePoint: [0.01, 0.05, 0.1, 0.2, 0.5],
  },
  {
    id: 'GjLEiquek1Nc2YjcBhufUGFRkaqW1JhaGjsdFd8mys38',
    index: 3,
    protocolFeeRate: 120000,
    tradeFeeRate: 10000,
    tickSpacing: 120,
    fundFeeRate: 40000,
    description: 'Best for exotic pairs',
    defaultRange: 0.1,
    defaultRangePoint: [0.01, 0.05, 0.1, 0.2, 0.5],
  },
  {
    id: 'GVSwm4smQBYcgAJU7qjFHLQBHTc4AdB3F2HbZp6KqKof',
    index: 2,
    protocolFeeRate: 120000,
    tradeFeeRate: 500,
    tickSpacing: 10,
    fundFeeRate: 40000,
    description: 'Best for tighter ranges',
    defaultRange: 0.1,
    defaultRangePoint: [0.01, 0.05, 0.1, 0.2, 0.5],
  },
]

// const configs = [
//     {
//       id: '9iFER3bpjf1PTTCQCfTRu17EJgvsxo9pVyA9QWwEuX4x',
//       index: 4,
//       protocolFeeRate: 120000,
//       tradeFeeRate: 100,
//       tickSpacing: 1,
//       fundFeeRate: 40000,
//       description: 'Best for very stable pairs',
//       defaultRange: 0.005,
//       defaultRangePoint: [0.001, 0.003, 0.005, 0.008, 0.01],
//     },
//     {
//       id: '3XCQJQryqpDvvZBfGxR7CLAw5dpGJ9aa7kt1jRLdyxuZ',
//       index: 5,
//       protocolFeeRate: 120000,
//       tradeFeeRate: 500,
//       tickSpacing: 1,
//       fundFeeRate: 40000,
//       description: 'Best for tighter ranges',
//       defaultRange: 0.1,
//       defaultRangePoint: [0.01, 0.05, 0.1, 0.2, 0.5],
//     },
//     {
//       id: 'E64NGkDLLCdQ2yFNPcavaKptrEgmiQaNykUuLC1Qgwyp',
//       index: 1,
//       protocolFeeRate: 120000,
//       tradeFeeRate: 2500,
//       tickSpacing: 60,
//       fundFeeRate: 40000,
//       description: 'Best for most pairs',
//       defaultRange: 0.1,
//       defaultRangePoint: [0.01, 0.05, 0.1, 0.2, 0.5],
//     },
//     {
//       id: 'A1BBtTYJd4i3xU8D6Tc2FzU6ZN4oXZWXKZnCxwbHXr8x',
//       index: 3,
//       protocolFeeRate: 120000,
//       tradeFeeRate: 10000,
//       tickSpacing: 120,
//       fundFeeRate: 40000,
//       description: 'Best for exotic pairs',
//       defaultRange: 0.1,
//       defaultRangePoint: [0.01, 0.05, 0.1, 0.2, 0.5],
//     },
//   ]


export const printSimulateInfo = () => {
  console.log(
    'you can paste simulate tx string here: https://explorer.solana.com/tx/inspector and click simulate to check transaction status'
  )
  console.log(
    'if tx simulate successful but did not went through successfully after running execute(xxx), usually means your txs were expired, try set up higher priority fees'
  )
  console.log('strongly suggest use paid rpcs would get you better performance')
}