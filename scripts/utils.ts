import { CLMM_PROGRAM_ID, DEVNET_PROGRAM_ID } from '@raydium-io/raydium-sdk-v2'
import { Connection, PublicKey, TransactionSignature, PartiallyDecodedInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import * as borsh from 'borsh';
import * as bs58 from 'bs58';
import {SWAP_V2_SCHEMA,SwapV2,CREATE_POOL_SCHEMA,CreatePool,
  INCREASE_LIQUIDITY_V2_SCHEMA,
  IncreaseLiquidityV2,
  DECREASE_LIQUIDITY_V2_SCHEMA,
  DecreaseLiquidityV2
} from './raydium';
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
interface ComputeBudgetData {
  discriminator: { type: string; data: number };
  units: { type: string; data: number };
}

interface ParsedComputeBudget {
  instruction: string;
  data: ComputeBudgetData;
}

export function parseSetComputeUnitLimit(hexData: string): ParsedComputeBudget {
  const data = Buffer.from(hexData, 'hex');
  let offset = 0;

  // 读取判别符
  const discriminator = data[offset];
  offset += 1;
  if (discriminator !== 2) {
      throw new Error('无效的判别符，不是 SetComputeUnitLimit');
  }

  // 读取 units (u32)
  const units = data.readUInt32LE(offset);
  offset += 4;

  return {
      instruction: 'SetComputeUnitLimit',
      data: {
          discriminator: { type: 'u8', data: discriminator },
          units: { type: 'u32', data: units },
      },
  };
}

// 解析函数
interface Creator {
  address: string; // Base58 格式
  verified: boolean;
  share: number;
}

interface DataV2 {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators: Creator[] | null;
  collection: any;
  uses: any;
}

interface ParsedMetadata {
  discriminator: { type: string; data: number };
  dataV2: { type: string; data: DataV2 };
  isMutable: { type: string; data: boolean };
  collectionDetails: { type: string; data: any };
}

export function parseCreateMetadataAccountV3(hexData: string): ParsedMetadata {
  const data = Buffer.from(hexData, 'hex');
  let offset = 0;

  // 读取判别符
  const discriminator = data[offset];
  offset += 1;
  if (discriminator !== 33) {
      throw new Error('无效的判别符，不是 CreateMetadataAccountV3');
  }

  // 解析名称
  const nameLength = data.readUInt32LE(offset);
  offset += 4;
  const name = data.toString('utf8', offset, offset + nameLength);
  offset += nameLength;

  // 解析符号
  const symbolLength = data.readUInt32LE(offset);
  offset += 4;
  const symbol = data.toString('utf8', offset, offset + symbolLength);
  offset += symbolLength;

  // 解析 URI
  const uriLength = data.readUInt32LE(offset);
  offset += 4;
  const uri = data.toString('utf8', offset, offset + uriLength);
  offset += uriLength;

  // 解析销售费用基点
  const sellerFeeBasisPoints = data.readUInt16LE(offset);
  offset += 2;

  // 解析创建者
  const hasCreators = data[offset];
  offset += 1;
  let creators: Creator[] | null = null;
  if (hasCreators) {
      const numCreators = data.readUInt32LE(offset);
      offset += 4;
      creators = [];
      for (let i = 0; i < numCreators; i++) {
          const addressBuffer = data.slice(offset, offset + 32);
          const address = new PublicKey(addressBuffer).toBase58(); // 转换为 Base58
          offset += 32;
          const verified = data[offset] === 1;
          offset += 1;
          const share = data[offset];
          offset += 1;
          creators.push({ address, verified, share });
      }
  }

  // 解析集合
  const hasCollection = data[offset];
  offset += 1;
  const collection = hasCollection ? { /* 解析逻辑 */ } : null;

  // 解析使用限制
  const hasUses = data[offset];
  offset += 1;
  const uses = hasUses ? { /* 解析逻辑 */ } : null;

  // 读取是否可变
  const isMutable = data[offset] === 1;
  offset += 1;

  return {
      discriminator: { type: 'u8', data: discriminator },
      dataV2: {
          type: 'u8',
          data: {
              name,
              symbol,
              uri,
              sellerFeeBasisPoints,
              creators,
              collection,
              uses,
          },
      },
      isMutable: { type: 'u8', data: isMutable },
      collectionDetails: { type: 'u8', data: null },
  };
}

interface ComputeBudgetData {
  discriminator: { type: string; data: number };
  units: { type: string; data: number };
}

interface ParsedComputeBudget {
  instruction: string;
  data: ComputeBudgetData;
}
export function parseSetComputeUnitPrice(hexData: string): ParsedComputeBudget {
  console.log(hexData)
  const data = Buffer.from(hexData, 'hex');
  let offset = 0;

  // 读取判别符
  const discriminator = data[offset];
  offset += 1;
  if (discriminator !== 3) {
      throw new Error('无效的判别符，不是 SetComputeUnitPrice');
  }

  // 读取 microLamports (u64)
  const microLamports = Number(data.readBigUInt64LE(offset));
  offset += 8;

  return {
      instruction: 'SetComputeUnitPrice',
      data: {
          discriminator: { type: 'u8', data: discriminator },
          units: { type: 'u64', data: microLamports },
      },
  };
}
const CUSTOM_PROGRAM_ID = new PublicKey('RapAmzUdR9e5rgsSkM6eGXPhTQATJAVxPxbxqCv53Yo'); // 从你的数据提取
// 解析 Raydium 指令数据
export function parseRaydiumInstructionData(instruction: PartiallyDecodedInstruction, transactionType: string, signature: string): void {
  if (instruction.programId.equals(CUSTOM_PROGRAM_ID)) {
    const bsdata = bs58.default.decode(instruction.data);
    const data = Buffer.from(bsdata);
    // const data = buffdata.toString('hex');
    // const data = Buffer.from(instruction.data, 'base64');
    console.log("instruction Data:", instruction.data);
    console.log("hex instr data:", data.toString('hex'));
    try {
      const discriminator = data.slice(0, 8);
      console.log('指令 Discriminator:', discriminator.toString('hex'));

      if (transactionType === 'Swap') {
        const decoded = borsh.deserialize(SWAP_V2_SCHEMA, SwapV2, data) as SwapV2;
        console.log('SwapV2 详情:', {
          signature,
          instructionDiscriminator: decoded.instructionDiscriminator.toString(),
          amount: decoded.amount.toString(),
          otherAmountThreshold: decoded.otherAmountThreshold.toString(),
          sqrtPriceLimitX64: decoded.sqrtPriceLimitX64.toString(),
          isBaseInput: decoded.isBaseInput,
          padding: decoded.padding,
        });
      } else if ( transactionType === 'CreatePool') {
        const decoded = borsh.deserialize(CREATE_POOL_SCHEMA, CreatePool, data) as CreatePool;
        console.log('CreatePool 详情:', {
          signature,
          instructionDiscriminator: decoded.instructionDiscriminator.toString(),
        });
      } else if (transactionType === 'AddLiquidity') {
        const decoded = borsh.deserialize(INCREASE_LIQUIDITY_V2_SCHEMA, IncreaseLiquidityV2, data) as IncreaseLiquidityV2;
        console.log('AddLiquidity 详情:', {
          signature,
          instructionDiscriminator: decoded.instructionDiscriminator.toString(),
          liquidity: decoded.liquidity.toString(),
          amount0Max: decoded.amount0Max.toString(),
          amount1Max: decoded.amount1Max.toString(),
          baseFlag: decoded.baseFlag,
          padding: decoded.padding,
        });
      } else if ( transactionType === 'RemoveLiquidity') {
        const decoded = borsh.deserialize(DECREASE_LIQUIDITY_V2_SCHEMA, DecreaseLiquidityV2, data) as DecreaseLiquidityV2;
        console.log('RemoveLiquidity 详情:', {
          signature,
          instructionDiscriminator: decoded.instructionDiscriminator.toString(),
          liquidity: decoded.liquidity.toString(),
          amount0Min: decoded.amount0Min.toString(),
          amount1Min: decoded.amount1Min.toString(),
        });
      } else {
        console.log('未知指令类型或类型不匹配，Discriminator:', discriminator.toString('hex'));
        console.log('原始数据 (HEX):', data.toString('hex'));
      }
    } catch (e: unknown) {
      const error = e as Error;
      console.log('指令解码失败:', error.message);
      console.log('原始数据 (HEX):', data.toString('hex'));
    }
  }
}

interface ComputeBudgetData {
    discriminator: { type: string; data: number };
    units: { type: string; data: number };
}

interface ParsedComputeBudget {
    instruction: string;
    data: ComputeBudgetData;
}