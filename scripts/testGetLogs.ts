import { Connection, PublicKey, TransactionSignature } from '@solana/web3.js';

// Raydium Liquidity Pool V4 程序ID
const RAYDIUM_PROGRAM_ID = new PublicKey('CcCFdUQdoG3bS9bJJUvWupgGnWoKHYGXRXuyDFAdack5');

// Solana 主网 HTTPS RPC 端点
const HTTP_ENDPOINT = 'https://rpc.testnet.soo.network/rpc';

// 解析日志并输出操作
function processLogs(logs: string[], signature: string, slot: number): void {
  logs.forEach((log) => {
    const logLower = log.toLowerCase();
    if (logLower.includes('error')) {
        console.log(`error tx on SLOG: ${slot}`);
        return;
    } else if (logLower.includes('initialize2')) {
      console.log(`[createPool] 签名: ${signature}, Slot: ${slot}, 日志: ${log}`);
    } else if (logLower.includes('deposit')) {
      console.log(`[addLiquidity] 签名: ${signature}, Slot: ${slot}, 日志: ${log}`);
    } else if (logLower.includes('withdraw')) {
      console.log(`[removeLiquidity] 签名: ${signature}, Slot: ${slot}, 日志: ${log}`);
    } else if (logLower.includes('swap')) {
      console.log(`[swap] 签名: ${signature}, Slot: ${slot}, 日志: ${log}`);
    } else  {
        return;
    }
  });
}

// 获取历史交易
async function fetchHistoricalTransactions(untilSignature?: string): Promise<void> {
  const connection = new Connection(HTTP_ENDPOINT, 'finalized');
  console.log('已连接到Solana HTTPS RPC，开始获取历史日志...');

  let beforeSignature: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    try {
      // 获取Raydium程序的交易签名
      const signatures = await connection.getSignaturesForAddress(RAYDIUM_PROGRAM_ID, {
        limit: 100, // 每次获取100条签名
        before: beforeSignature, // 从上次的签名往前追溯
        until: untilSignature, // 停止点（可选）
      });

      if (signatures.length === 0) {
        console.log('没有更多历史交易');
        hasMore = false;
      } else {
        console.log(`获取到 ${signatures.length} 条历史交易签名`);
        // 更新beforeSignature为当前批次的最早签名
        beforeSignature = signatures[signatures.length - 1].signature;

        // 遍历每个签名，获取交易详情
        for (const sig of signatures) {
          const signature: TransactionSignature = sig.signature;
          const tx = await connection.getParsedTransaction(signature, {
            commitment: 'finalized',
            maxSupportedTransactionVersion: 0, // 支持版本0交易
          });
          if (tx && tx.meta?.logMessages) {
            const slot = tx.slot;
            const logs = tx.meta.logMessages;
            processLogs(logs, signature, slot);
          }
        }
      }
    } catch (error) {
      console.error('获取历史交易时出错:', error);
      break;
    }

    // 添加延迟，避免触发RPC速率限制
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒延迟
  }

  console.log('历史交易获取完成');
}

// 主函数
async function main(): Promise<void> {
  try {
    // 获取历史交易（可选：指定停止点）
    const untilSignature = undefined; // 可替换为具体签名，如 '5...xyz'
    await fetchHistoricalTransactions(untilSignature);
  } catch (error) {
    console.error('程序出错:', error);
  }
}

main();