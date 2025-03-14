import { Connection, PublicKey, TransactionSignature, PartiallyDecodedInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import * as borsh from 'borsh';
import * as bs58 from 'bs58';
import {
  parseRaydiumInstructionData,
  parseCreateMetadataAccountV3,
  parseSetComputeUnitPrice,
  parseSetComputeUnitLimit
} from './utils';
import {SWAP_V2_SCHEMA,SwapV2,CREATE_POOL_SCHEMA,CreatePool,
  INCREASE_LIQUIDITY_V2_SCHEMA,
  IncreaseLiquidityV2,
  DECREASE_LIQUIDITY_V2_SCHEMA,
  DecreaseLiquidityV2
} from './raydium';
// 替换为你创建的 Program ID
const CUSTOM_PROGRAM_ID = new PublicKey('RapAmzUdR9e5rgsSkM6eGXPhTQATJAVxPxbxqCv53Yo'); // 从你的数据提取
const HTTP_ENDPOINT = 'https://rpc.mainnet.soo.network/rpc';

// 导入 Node.js 的 crypto 模块
const crypto = require('crypto');



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
        const buffdata = Buffer.from(bs58.default.decode(instr.data));
        const data = buffdata.toString('hex')
        console.log(`  [${index}] 未解析指令 - Program: ${instr.programId.toBase58()},  decodedData: ${instr.data},HexData: ${data}`);
        
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
                console.log(buffdata);
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
          if(buffdata[0]==3){
            const priceData = parseSetComputeUnitPrice(data);
            console.log(priceData);
          }
          if(buffdata[0]==2){
            const unitData = parseSetComputeUnitLimit(data);
            console.log(unitData);
          }
      }
    });
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
  let count = 0;
  while (count <10) {
    count++;
    try {
      const signatures = await connection.getSignaturesForAddress(CUSTOM_PROGRAM_ID, {
        limit: 10,
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
    // await fetchHistoricalTransactions();
   await fetchTransactionDetails('5kog5p158mZYL4quxxt97A7eyPqxSqb2nmxyEPcPTCjpgE1KjXT7FaUouV36JTLmXAUbiko3JAQJ2477e7NBcEEE');
  } catch (error) {
    console.error('程序出错:', error);
  }
}

testGetTx();