import {clusterApiUrl, ComputeBudgetProgram, Connection, Keypair, PublicKey} from '@solana/web3.js';
import { Wallet } from '@project-serum/anchor';
import {PoolUtils, RAYMint, ClmmKeys, publicKey} from '@raydium-io/raydium-sdk-v2';
import BN from 'bn.js';
import  bs58  from 'bs58';
import {initSdk, txVersion} from './config';
import {isValidClmm} from './utils';

//config
const connection  = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
// const connection  = new Connection(clusterApiUrl('devnet'));

const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY || '')));
const poolId = "3nMFwZXwY1s1M5s8vYAHqd4wGs4iSxXE4LRoUMMYqEgF";
const USDTAddress = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const mintUSDT = new PublicKey(USDTAddress);
const  inputMint = new PublicKey(mintUSDT.toBase58());
console.log('inputMintAddress:', inputMint);
let poolInfo;
let poolKeys;
let clmmPoolInfo;
let tickCache;

const inputAmount = new BN(100);
export async function testSwap () {
    console.log('Starting swap process...');
    try {
        const raydium  = await initSdk();
        //get  pool info
        console.log("raydium inited!");
        const data = await raydium.clmm.getPoolInfoFromRpc(poolId);
        console.log("Data Fetched OK!");
        poolInfo = data.poolInfo;
        poolKeys = data.poolKeys;
        clmmPoolInfo = data.computePoolInfo;
        tickCache = data.tickData;

        if(!isValidClmm(poolInfo.programId)) throw new Error('Target Pool is Not a valid Clmm pool!');
        // console.log('CLMM Pool Info', clmmPoolInfo);

        // convert to  publickey instant
        const mintAAddress = new PublicKey(poolInfo.mintA.address);
        const mintBAddress = new PublicKey(poolInfo.mintB.address);
        console.log(mintAAddress, mintBAddress);
        // check tokens 
        if(inputMint.toBase58()!==mintAAddress.toBase58() && inputMint.toBase58() !==mintBAddress.toBase58()){
            throw new Error("input Address not correct!");
        } 

        const baseIn = inputMint.toBase58() ===mintAAddress.toBase58();

        const  userTokenAccountA = await connection.getTokenAccountsByOwner(wallet.publicKey, {mint: mintAAddress});
        const  userTokenAccountB = await connection.getTokenAccountsByOwner(wallet.publicKey, {mint: mintBAddress});
        console.log("Addresses:", userTokenAccountA, userTokenAccountB);
        

        const { minAmountOut, remainingAccounts } = await PoolUtils.computeAmountOutFormat({
            poolInfo: clmmPoolInfo,
            tickArrayCache: tickCache[poolId],
            amountIn: inputAmount,
            tokenOut: poolInfo[baseIn ? 'mintB' : 'mintA'],
            slippage: 0.01,
            epochInfo: await raydium.fetchEpochInfo(),
          })
        console.log('Minimum Amount Out:', minAmountOut.amount.raw.toString());
        
        // execute CLMM pool exchange
        const {execute, transaction} = await raydium.clmm.swap({
            poolInfo,
            poolKeys,
            inputMint:poolInfo[baseIn?'mintA':'mintB'].address,
            amountIn: inputAmount,
            amountOutMin: minAmountOut.amount.raw,
            observationId:clmmPoolInfo.observationId,
            ownerInfo:{
                useSOLBalance: true,
            },
            remainingAccounts,
            txVersion
        });
        console.log('Executing tx.....');
        console.log('Tx:', transaction);
        const { txId } = await execute();
        console.log(`Tx success: https://explorer.solana.com/tx/${txId}` );
        process.exit();
    } catch (error) {
        console.error('Error during Swap:', error);
    };

    
}
testSwap().catch((error) => {
    console.error('An error occurred during the swap process:');
    console.error(error);
  });