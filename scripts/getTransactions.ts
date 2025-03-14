import * as web3 from '@solana/web3.js';
import {
  Connection,
  PublicKey,
} from '@solana/web3.js';

// import {
//   createTables,
//   getLastSignature,
//   getLastSlot,
//   saveTransactionResult,
// } from './db';

const HTTP_URL = "https://rpc.testnet.soo.network/rpc"
const connection = new Connection(HTTP_URL);

interface TransactionDetails {
    signature: string;
    slot: number;
    blockTime: number | null;
    status: string;
    fee: number | undefined;
    message: {
        accountKeys: {
            pubkey: PublicKey;
            signer?: boolean;
            writable?: boolean;
        }[];
        instructions?: any[];
        recentBlockhash?: string;
    };
    logs: string[];
    meta: {
        err?: string;
        logMessages?: string[] | null;
        fee?: number;
        preTokenBalances?: any[] | null;
        postTokenBalances?: any[] | null;
        preBalances?: number[];
        postBalances?: number[];
        innerInstructions?:any [] |null;
    };
}
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
    if (tx.message.accountKeys) {
      const accounts = tx.message.accountKeys.map((key: any) => {
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
  
    if (tx.message.instructions) {
      console.log('指令数据:');
      tx.message.instructions.forEach((instr: any, index: number) => {
        if ('parsed' in instr) {
          console.log(`  [${index}] 已解析指令:`, instr.parsed);
        } else {
          
          console.log(`  [${index}] 未解析指令 - Program: ${instr.programId.toBase58()}, Data: ${instr.data}`);
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
                        const data = Buffer.from(instr.data, 'base64');
                        console.log(`    [${subIndex}] 未解析内部指令 - Program: ${instr.programId.toBase58()}, Data: ${data.toString('hex')}`);  
                        }
                    });
            
                }
            }); 
        }
        //   arseRaydiumInstructionData(instr as PartiallyDecodedInstruction, transactionType, signature);
        }
    });
    }    
}
  
async function getTransactionDetails(signature: string): Promise<TransactionDetails | null> {
    try {
        // 获取交易详情，包括解析后的指令数据
        const tx = await connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0,
        });

        if (!tx) {
            console.log(`Transaction ${signature} not found`);
            return null;
        }

        // 提取交易的关键信息
        const {
            blockTime,
            slot,
            meta,
            transaction: { message },
        } = tx;

        // 返回交易信息，而不是直接打印
        return {
            signature,
            slot: slot || 0,
            blockTime: blockTime || null,
            status: meta?.err ? 'Failed' : 'Success',
            fee: meta?.fee,
            message,
            meta: {
                err: meta?.err?.toString(),
                logMessages: meta?.logMessages,
                fee: meta?.fee,
                preTokenBalances: meta?.preTokenBalances,
                postTokenBalances: meta?.postTokenBalances,
                preBalances: meta?.preBalances,
                postBalances: meta?.postBalances,
                innerInstructions: meta?.innerInstructions,
            },
            logs: meta?.logMessages || [],
        };

    } catch (error) {
        console.error('Error fetching transaction details:', error);
        return null;
    }
}

interface Transactions {
    signer: string;
    signature: string;
    liquidityInfo: {
        liquidity: number;
        amount_0_max: number;
        amount_1_max: number;
        tick_lower_index: number;
        tick_upper_index: number;
        tick_array_lower_start_index: number;
        tick_array_upper_start_index: number;
    } | null;
}

interface TransactionsResult {
    lastSlot: number;
    transactions: Transactions[];
}

async function getTransactions(programId: PublicKey): Promise<TransactionsResult> {
    console.log(`Getting transactions for program ${programId.toString()}`);
    // console.log(`Filtering for pool ${poolId.toString()}`);

    try {
        // 获取当前最新的区块高度
        const currentSlot = await connection.getSlot();
        console.log(`Current slot: ${currentSlot}`);

        // const lastSignature = await getLastSignature();
        // console.log("lastSignature:",lastSignature)
        let beforeSignature: string | undefined = undefined;
        const signatures = await connection.getSignaturesForAddress(
            programId,
            {
                limit:500,
                before:beforeSignature,
                until: undefined,
            },
            'confirmed'
        );
        console.log(`Found ${signatures.length} total transactions`);
        console.log(`signatures:` + JSON.stringify(signatures));
        // 用于存储结果的数组
        const transactions: Transactions[] = [];
        let lastSlot = 0;

        for (const sig of signatures) {
            const txDetails = await getTransactionDetails(sig.signature);
            if (txDetails) {
                // 更新最后一个区块高度
                lastSlot = Math.max(lastSlot, txDetails.slot);

                if (txDetails.slot ) {
                    processTransactionDetails(txDetails, sig.signature);
                    
                    // 提取流动性数据
                    const liquidityLog = txDetails.logs.find(log => log.includes('Liquidity:'));
                    let liquidityData: {
                        liquidity: number;
                        amount_0_max: number;
                        amount_1_max: number;
                        tick_lower_index: number;
                        tick_upper_index: number;
                        tick_array_lower_start_index: number;
                        tick_array_upper_start_index: number;
                    } | null = null;
                    
                    if (liquidityLog) {
                        const dataStr = liquidityLog.split('Program log: ')[1];
                        console.log("DataStr",dataStr);
                        const matches = dataStr.match(/liquidity: (\d+), amount_0_max: (\d+), amount_1_max: (\d+), tick_lower_index: (-?\d+), tick_upper_index: (-?\d+), tick_array_lower_start_index: (-?\d+), tick_array_upper_start_index: (-?\d+)/);

                        if (matches) {
                            liquidityData = {
                                liquidity: parseInt(matches[1]),
                                amount_0_max: parseInt(matches[2]),
                                amount_1_max: parseInt(matches[3]),
                                tick_lower_index: parseInt(matches[4]),
                                tick_upper_index: parseInt(matches[5]),
                                tick_array_lower_start_index: parseInt(matches[6]),
                                tick_array_upper_start_index: parseInt(matches[7])
                            };
                        }
                    }

                    transactions.push({
                        signer: txDetails.message.accountKeys[0].pubkey.toString(),
                        signature: txDetails.signature,
                        liquidityInfo: liquidityData
                    });

                    // 打印交易信息（保持原有的日志输出）
                    console.log('\nTransaction Details:');
                    console.log('------------------');
                    console.log(`Signature: ${txDetails.signature}`);
                    console.log(`Slot: ${txDetails.slot}`);
                    console.log(`Time: ${txDetails.blockTime ? new Date(txDetails.blockTime * 1000).toISOString() : 'unknown'}`);
                    console.log(`Status: ${txDetails.status}`);
                    console.log(`Fee: ${txDetails.fee} lamports`);
                    console.log('\nAccounts involved:', txDetails.message.accountKeys.map(acc => acc.pubkey.toString()));
                    console.log('\nSigner:', txDetails.message.accountKeys[0].pubkey.toString());
                    if (txDetails.meta?.err) {
                        console.log('\nError:', JSON.stringify(txDetails.meta.err));
                    }
                    console.log('\n------------------\n');
                
                }
            }
        }

        console.log(`Found ${transactions.length}`);

        // 返回最后的区块高度和交易数组
        return {
            lastSlot,
            transactions
        };
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return {
            lastSlot: 0,
            transactions: []
        };
    }
}

async function runService() {
    try {
        // 确保数据库表已创建
        // await createTables();
        
        const programId = new web3.PublicKey("CcCFdUQdoG3bS9bJJUvWupgGnWoKHYGXRXuyDFAdack5");
        // const poolId = new web3.PublicKey("93q9Bo3iokby9R5Xsbodg1CxPT9PdVBhkQ9sidY64EDq");

        // while (true) {
            try {
                console.log("\n开始新一轮数据获取...");
                console.log(new Date().toISOString());

                // 获取最新的slot作为起始slot
                // const startSlot = await getLastSlot();
                // console.log(`从slot ${startSlot}开始获取交易数据`);
                
                const result = await getTransactions(programId);

                // 保存结果到数据库
                if (result.transactions.length > 0) {
                    // await saveTransactionResult(result);
                    console.log(result);
                    console.log(`成功保存 ${result.transactions.length} 条新交易数据`);
                } else {
                    console.log("没有新的交易数据");
                }

                // 等待5秒
                await new Promise(resolve => setTimeout(resolve, 5000));
            } catch (error) {
                console.error('本轮执行出错:', error);
                // 出错后等待5秒继续
                await new Promise(resolve => setTimeout(resolve, 5000));
                // continue;
            }
        // }
    } catch (error) {
        console.error('服务启动错误:', error);
        process.exit(1);
    }
}

// 替换原来的main函数调用
console.log("启动交易监听服务...");
runService().catch((err) => {
    console.error('服务异常退出:', err);
    process.exit(1);
});

// 添加进程退出处理
process.on('SIGINT', () => {
    console.log('收到退出信号，正在关闭服务...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('收到终止信号，正在关闭服务...');
    process.exit(0);
});
