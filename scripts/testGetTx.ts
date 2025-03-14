import { Connection, PublicKey, TransactionSignature, PartiallyDecodedInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import * as borsh from 'borsh';
import * as bs58 from 'bs58';
import { Metadata  } from '@metaplex-foundation/mpl-token-metadata';
import { buffer } from 'stream/consumers';

// 替换为你创建的 Program ID
const CUSTOM_PROGRAM_ID = new PublicKey('RapAmzUdR9e5rgsSkM6eGXPhTQATJAVxPxbxqCv53Yo'); // 从你的数据提取
const HTTP_ENDPOINT = 'https://rpc.mainnet.soo.network/rpc';

// 导入 Node.js 的 crypto 模块
const crypto = require('crypto');

// 定义 SwapV2 类
class SwapV2 {
  instructionDiscriminator: bigint;
  amount: bigint;
  otherAmountThreshold: bigint;
  sqrtPriceLimitX64: bigint;
  isBaseInput: boolean;
  padding: number;

  constructor(args: { instructionDiscriminator: bigint; amount: bigint; otherAmountThreshold: bigint; sqrtPriceLimitX64: bigint; isBaseInput: boolean; padding: number }) {
    this.instructionDiscriminator = args.instructionDiscriminator;
    this.amount = args.amount;
    this.otherAmountThreshold = args.otherAmountThreshold;
    this.sqrtPriceLimitX64 = args.sqrtPriceLimitX64;
    this.isBaseInput = args.isBaseInput;
    this.padding = args.padding;
  }
}

// 定义 IncreaseLiquidityV2 类（AddLiquidity）
class IncreaseLiquidityV2 {
  instructionDiscriminator: bigint;
  liquidity: bigint;
  amount0Max: bigint;
  amount1Max: bigint;
  baseFlag: boolean;
  padding: number[];

  constructor(args: { instructionDiscriminator: bigint; liquidity: bigint; amount0Max: bigint; amount1Max: bigint; baseFlag: boolean; padding: number[] }) {
    this.instructionDiscriminator = args.instructionDiscriminator;
    this.liquidity = args.liquidity;
    this.amount0Max = args.amount0Max;
    this.amount1Max = args.amount1Max;
    this.baseFlag = args.baseFlag;
    this.padding = args.padding;
  }
}

// 定义 DecreaseLiquidityV2 类（RemoveLiquidity）
class DecreaseLiquidityV2 {
  instructionDiscriminator: bigint;
  liquidity: bigint;
  amount0Min: bigint;
  amount1Min: bigint;

  constructor(args: { instructionDiscriminator: bigint; liquidity: bigint; amount0Min: bigint; amount1Min: bigint }) {
    this.instructionDiscriminator = args.instructionDiscriminator;
    this.liquidity = args.liquidity;
    this.amount0Min = args.amount0Min;
    this.amount1Min = args.amount1Min;
  }
}

// 定义 CreatePool 类
class CreatePool {
  instructionDiscriminator: bigint;
  // 根据实际数据调整字段
  constructor(args: { instructionDiscriminator: bigint }) {
    this.instructionDiscriminator = args.instructionDiscriminator;
  }
}

// 定义指令的 Borsh 布局
const SWAP_V2_SCHEMA = new Map([
  [
    SwapV2,
    {
      kind: 'struct',
      fields: [
        ['instructionDiscriminator', 'u64'],
        ['amount', 'u64'],
        ['otherAmountThreshold', 'u64'],
        ['sqrtPriceLimitX64', 'u128'],
        ['isBaseInput', 'u8'],
        ['padding', 'u8'],
      ],
    },
  ],
]);

const INCREASE_LIQUIDITY_V2_SCHEMA = new Map([
  [
    IncreaseLiquidityV2,
    {
      kind: 'struct',
      fields: [
        ['instructionDiscriminator', 'u64'],
        ['liquidity', 'u128'],
        ['amount0Max', 'u64'],
        ['amount1Max', 'u64'],
        ['baseFlag', 'u8'],
        ['padding', [2]], // 2 字节填充处理
      ],
    },
  ],
]);

const DECREASE_LIQUIDITY_V2_SCHEMA = new Map([
  [
    DecreaseLiquidityV2,
    {
      kind: 'struct',
      fields: [
        ['instructionDiscriminator', 'u64'],
        ['liquidity', 'u128'],
        ['amount0Min', 'u64'],
        ['amount1Min', 'u64'],
      ],
    },
  ],
]);

const CREATE_POOL_SCHEMA = new Map([
  [
    CreatePool,
    {
      kind: 'struct',
      fields: [
        ['instructionDiscriminator', 'u64'],
        // 待补充完整字段
      ],
    },
  ],
]);


// 解析交易详情并分类
function processTransactionDetails(tx: any, signature: string): void {
  if (!tx || !tx.meta) {
    console.log(`交易 ${signature} 无有效数据`);
    return;
  }

  const slot = tx.slot;
  const blockTime = tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : '未知';
  const logs = tx.meta.logMessages || [];
  
  console.log(`\n=== 交易详情: ${signature} ===`);
  console.log(`Slot: ${slot}`);
  console.log(`时间: ${blockTime}`);

  console.log('日志:');
  logs.forEach((log: string, index: number) => {
    console.log(`  [${index}] ${log}`);
  });

  // 判断交易类型，精确匹配 Instruction 日志
  let transactionType = 'Unknown';
  logs.forEach((log: string) => {
    if (log.includes('Instruction: SwapV2')) {
      transactionType = 'Swap';
    } else if (log.includes('Instruction: IncreaseLiquidityV2')) {
      transactionType = 'AddLiquidity';
    } else if (log.includes('Instruction: DecreaseLiquidityV2')) {
      transactionType = 'RemoveLiquidity';
    } else if (log.includes('Instruction: CreatePool')) {
      transactionType = 'CreatePool';
    } else if (log.includes('Instruction: InitializeReward')) {
      transactionType = 'InitializeReward';
    }else if (log.includes('Instruction: OpenPosition')) {
      transactionType = 'OpenPosition';
    }
  });
  console.log(`交易类型: ${transactionType}`);

  console.log('涉及账户:');
  if (tx.transaction.message.accountKeys) {
    const accounts = tx.transaction.message.accountKeys.map((key: any) => {
      return 'toBase58' in key ? key.toBase58() : key.pubkey?.toBase58() || key.toString();
    });
    accounts.forEach((account: string, index: number) => {
      console.log(`  [${index}] ${account}`);
    });
  } else {
    console.log('  无账户信息');
  }

  if (tx.meta.preTokenBalances && tx.meta.postTokenBalances) {
    console.log('代币余额变化:');
    tx.meta.postTokenBalances.forEach((post: any) => {
      const pre = tx.meta.preTokenBalances.find((p: any) => p.accountIndex === post.accountIndex && p.mint === p.mint);
      const preAmount = pre ? parseInt(pre.uiTokenAmount.amount) : 0;
      const postAmount = parseInt(post.uiTokenAmount.amount);
      const diff = postAmount - preAmount;
      if (diff !== 0) {
        console.log(`  账户[${post.accountIndex}] ${post.mint}: ${preAmount} -> ${postAmount} (变化: ${diff})`);
      }
    });
  }

  const lamportsToSol = (lamports: number) => lamports / 1e9;
  console.log('SOL余额变化:');
  tx.meta.postBalances.forEach((postBalance: number, index: number) => {
    const preBalance = tx.meta.preBalances[index];
    const diff = postBalance - preBalance;
    if (diff !== 0) {
      console.log(`  账户[${index}] ${lamportsToSol(preBalance)} SOL -> ${lamportsToSol(postBalance)} SOL (变化: ${lamportsToSol(diff)} SOL)`);
    }
  });

  if (tx.transaction.message.instructions) {
    console.log('指令数据:');
    tx.transaction.message.instructions.forEach((instr: any, index: number) => {
      if ('parsed' in instr) {
        console.log(`  [${index}] 已解析指令:`, instr.parsed);
      } else {
        console.log(`  [${index}] 未解析指令 - Program: ${instr.programId.toBase58()}, Data: ${Buffer.from(instr.data, 'base64').toString('hex')}`);
        parseRaydiumInstructionData(instr as PartiallyDecodedInstruction, transactionType, signature);
           // 处理内部指令
           if (tx.meta.innerInstructions && tx.meta.innerInstructions.length > 0 ) {
            console.log('内部指令数据:');
            tx.meta.innerInstructions.forEach((inner: any, innerIndex: number) => {
            if(inner.index == index){
                console.log(`  由顶层指令 [${inner.index}] 触发: `);
            inner.instructions.forEach((instr: any, subIndex: number) => {
                if ('parsed' in instr) {
                console.log(`    [${subIndex}] 已解析内部指令:`, JSON.stringify(instr.parsed, null, 2));
                } else {
                const bsdata = bs58.default.decode(instr.data);
                const buffdata = Buffer.from(bsdata);
                const data = buffdata.toString('hex');
                if( instr.programId.toBase58() == "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"){
                  const metadata = parseCreateMetadataAccountV3(data);
                  console.log(`    [${subIndex}] 未解析内部指令 - Program: ${instr.programId.toBase58()}, Accounts: ${instr.accounts}, Data: ${JSON.stringify(metadata,null, 2)}`);  
                  // const metadata = Metadata.decode(data);
                  
                }
              }
            });
           
            }
            }); 
        }
      }
    });
  }
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

function parseCreateMetadataAccountV3(hexData: string): ParsedMetadata {
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
// 解析 Raydium 指令数据
function parseRaydiumInstructionData(instruction: PartiallyDecodedInstruction, transactionType: string, signature: string): void {
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

// 获取并解析特定交易的详情
async function fetchTransactionDetails(signature: string): Promise<void> {
  const connection = new Connection(HTTP_ENDPOINT, 'finalized');
  console.log(`正在获取交易 ${signature} 的详情...`);

  try {
    const tx = await connection.getParsedTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0,
    });

    if (tx) {
      processTransactionDetails(tx, signature);
    } else {
      console.log(`无法获取交易 ${signature} 的详情`);
    }
  } catch (error) {
    console.error(`获取交易 ${signature} 时出错:`, error);
  }
}

// 获取历史交易
async function fetchHistoricalTransactions(untilSignature?: string): Promise<void> {
  const connection = new Connection(HTTP_ENDPOINT, 'finalized');
  console.log('已连接到Solana HTTPS RPC，开始获取历史日志...');

  let beforeSignature: string | undefined = undefined;
  let hasMore = true;
  const successfulSignatures: string[] = [];
  let totalSignaturesProcessed = 0;

  while (hasMore) {
    try {
      const signatures = await connection.getSignaturesForAddress(CUSTOM_PROGRAM_ID, {
        limit: 50,
        before: beforeSignature,
        until: untilSignature,
      });

      if (signatures.length === 0) {
        console.log('没有更多历史交易');
        hasMore = false;
      } else {
        console.log(`获取到 ${signatures.length} 条历史交易签名 (总计: ${totalSignaturesProcessed + signatures.length})`);
        totalSignaturesProcessed += signatures.length;
        for (const sig of signatures) {
          await fetchTransactionDetails(sig.signature);
          if (sig.err === null) successfulSignatures.push(sig.signature);
        }
        beforeSignature = signatures[signatures.length - 1].signature;
      }
    } catch (error) {
      console.error('获取历史交易时出错:', error);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('历史交易获取完成，总计处理:', totalSignaturesProcessed, '条签名');
  console.log('成功的交易签名:', successfulSignatures);
}

// 主函数
async function testGetTx(): Promise<void> {
  try {
    await fetchHistoricalTransactions();
    // await fetchTransactionDetails('gLcR8kubGwhsuAKKntusZrHsak5eoeBzgTCYBVfvBMZpQZEJ5ThJpR2xii93gxMDEbKoT4noytVtBmS9kWVtpuF');
  } catch (error) {
    console.error('程序出错:', error);
  }
}

testGetTx();