import { Raydium, TxVersion, parseTokenAccountResp } from '@raydium-io/raydium-sdk-v2'
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import bs58 from 'bs58'
import dotenv from 'dotenv';
import https from 'https';
dotenv.config();



if (!process.env.PRIVATE_KEY) {
  throw new Error('WALLET_SECRET_KEY is not set in the environment variables');
}

interface PriorityFeeResponse {
  jsonrpc: string;
  result: {
    per_compute_unit: {
      extreme: number;
      medium: number;
    };
  };
  id: number;
}

function httpsRequest(url: string, options: https.RequestOptions, data: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk.toString());
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}
export const owner: Keypair = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY || ""))
// export const connection = new Connection('https://api.mainnet-beta.solana.com') //<YOUR_RPC_URL>
export const connection = new Connection('https://rpc.fc.devnet.soo.network/rpc') //<YOUR_RPC_URL>
export const txVersion = TxVersion.V0 // or TxVersion.LEGACY
const cluster = 'devnet' // 'mainnet' | 'devnet'

let raydium: Raydium | undefined
export const initSdk = async (params?: { loadToken?: boolean }) => {
  if (raydium) return raydium
  if (connection.rpcEndpoint === clusterApiUrl('devnet'))
    console.warn('using free rpc node might cause unexpected error, strongly suggest uses paid rpc node')
  console.log(`connect to rpc ${connection.rpcEndpoint} in ${cluster}`)
  raydium = await Raydium.load({
    owner,
    connection,
    cluster,
    disableFeatureCheck: true,
    disableLoadToken: !params?.loadToken,
    blockhashCommitment: 'finalized',
  // urlConfigs: {
  //   BASE_HOST: '<API_HOST>', // api url configs, currently api doesn't support devnet
  // },
  })

  /**
   * By default: sdk will automatically fetch token account data when need it or any sol balace changed.
   * if you want to handle token account by yourself, set token account data after init sdk
   * code below shows how to do it.
   * note: after call raydium.account.updateTokenAccount, raydium will not automatically fetch token account
   */

  /*  
  raydium.account.updateTokenAccount(await fetchTokenAccountData())
  connection.onAccountChange(owner.publicKey, async () => {
    raydium!.account.updateTokenAccount(await fetchTokenAccountData())
  })
  */

  return raydium
}

export const fetchTokenAccountData = async () => {
  const solAccountResp = await connection.getAccountInfo(owner.publicKey)
  const tokenAccountResp = await connection.getTokenAccountsByOwner(owner.publicKey, { programId: TOKEN_PROGRAM_ID })
  const token2022Req = await connection.getTokenAccountsByOwner(owner.publicKey, { programId: TOKEN_2022_PROGRAM_ID })
  const tokenAccountData = parseTokenAccountResp({
    owner: owner.publicKey,
    solAccountResp,
    tokenAccountResp: {
      context: tokenAccountResp.context,
      value: [...tokenAccountResp.value, ...token2022Req.value],
    },
  })
  return tokenAccountData
}
async function fetchPriorityFee(): Promise<number> {
  if (!process.env.QUICKNODE_URL) {
    throw new Error('QUICKNODE_URL is not set in the environment variables');
  }

  const url = new URL(process.env.QUICKNODE_URL);
  const options: https.RequestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const requestBody = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'qn_estimatePriorityFees',
    params: {
      last_n_blocks: 100,
      account: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
      api_version: 2
    }
  });

  const response = await httpsRequest(url.href, options, requestBody);
  const data: unknown = JSON.parse(response);
  
  if (!isPriorityFeeResponse(data)) {
    throw new Error('Unexpected response format from priority fee API');
  }
  
  // Using the 'extreme' priority fee from 'per_compute_unit'
  const extremePriorityFeePerCU = data.result.per_compute_unit.extreme;
  
  // Estimate compute units for the transaction (this is an approximation)
  const estimatedComputeUnits = 300000; // Adjust this based on your typical transaction
  
  // Calculate total priority fee in micro-lamports
  const totalPriorityFeeInMicroLamports = extremePriorityFeePerCU * estimatedComputeUnits;
  
  // Convert to SOL (1 SOL = 1e9 lamports = 1e15 micro-lamports)
  const priorityFeeInSOL = totalPriorityFeeInMicroLamports / 1e15;
  
  // Ensure the fee is not less than 0.000001 SOL (minimum fee)
  return Math.max(priorityFeeInSOL, 0.000001);
}
function isPriorityFeeResponse(data: unknown): data is PriorityFeeResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'jsonrpc' in data &&
    'result' in data &&
    typeof data.result === 'object' &&
    data.result !== null &&
    'per_compute_unit' in data.result &&
    typeof data.result.per_compute_unit === 'object' &&
    data.result.per_compute_unit !== null &&
    'extreme' in data.result.per_compute_unit &&
    typeof data.result.per_compute_unit.extreme === 'number'
  );
}
export const CONFIG = {
  RPC_URL: "https://api.devnet.solana.com",
  WALLET_SECRET_KEY: process.env.PRIVATE_KEY,
  BASE_MINT: 'So11111111111111111111111111111111111111112', // SOLANA mint address
  QUOTE_MINT: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK mint address
  TOKEN_A_AMOUNT: 0.000001,
  EXECUTE_SWAP: true,
  USE_VERSIONED_TRANSACTION: false,
  SLIPPAGE: 5,
  getPriorityFee: fetchPriorityFee,
};
export const grpcUrl = '<YOUR_GRPC_URL>'
export const grpcToken = '<YOUR_GRPC_TOKEN>'