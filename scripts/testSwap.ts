import {
    ApiV3PoolInfoConcentratedItem,
    ClmmKeys,
    ComputeClmmPoolInfo,
    PoolUtils,
    ReturnTypeFetchMultiplePoolTickArrays,
    RAYMint,
  } from '@raydium-io/raydium-sdk-v2'
  import BN from 'bn.js'
  import { initSdk, txVersion } from './config'
  import { isValidClmm,printSimulateInfo } from './utils'
  import { PublicKey } from '@solana/web3.js'
  
  export const swap = async () => {
    const raydium = await initSdk()
    let poolInfo: ApiV3PoolInfoConcentratedItem
    // RAY-USDC pool
    const poolId = 'DHh7eEN3cVQJf7fp13vANLWNbTPVgKoQ1KFsjJ9tUYtW'
    const inputMint = (new PublicKey("So11111111111111111111111111111111111111112")).toBase58()
    let poolKeys: ClmmKeys | undefined
    let clmmPoolInfo: ComputeClmmPoolInfo
    let tickCache: ReturnTypeFetchMultiplePoolTickArrays
  
    const inputAmount = new BN(1000000)
  
    // if (raydium.cluster === 'mainnet') {
    //   // note: api doesn't support get devnet pool info, so in devnet else we go rpc method
    //   // if you wish to get pool info from rpc, also can modify logic to go rpc method directly
    //   const data = await raydium.api.fetchPoolById({ ids: poolId })
    //   poolInfo = data[0] as ApiV3PoolInfoConcentratedItem
    //   if (!isValidClmm(poolInfo.programId)) throw new Error('target pool is not CLMM pool')
  
    //   clmmPoolInfo = await PoolUtils.fetchComputeClmmInfo({
    //     connection: raydium.connection,
    //     poolInfo,
    //   })
    //   tickCache = await PoolUtils.fetchMultiplePoolTickArrays({
    //     connection: raydium.connection,
    //     poolKeys: [clmmPoolInfo],
    //   })
    // } else {
    const data = await raydium.clmm.getPoolInfoFromRpc(poolId)
    poolInfo = data.poolInfo
    poolKeys = data.poolKeys
    clmmPoolInfo = data.computePoolInfo
    tickCache = data.tickData
    // }
  
    if (inputMint !== poolInfo.mintA.address && inputMint !== poolInfo.mintB.address)
      throw new Error('input mint does not match pool')
  
    const baseIn = inputMint === poolInfo.mintA.address
  
    const { minAmountOut, remainingAccounts } = await PoolUtils.computeAmountOutFormat({
      poolInfo: clmmPoolInfo,
      tickArrayCache: tickCache[poolId],
      amountIn: inputAmount,
      tokenOut: poolInfo[baseIn ? 'mintB' : 'mintA'],
      slippage: 0.01,
      epochInfo: await raydium.fetchEpochInfo(),
    })
  
    const { execute } = await raydium.clmm.swap({
      poolInfo,
      poolKeys,
      inputMint: poolInfo[baseIn ? 'mintA' : 'mintB'].address,
      amountIn: inputAmount,
      amountOutMin: minAmountOut.amount.raw,
      observationId: clmmPoolInfo.observationId,
      ownerInfo: {
        useSOLBalance: true, // if wish to use existed wsol token account, pass false
      },
      remainingAccounts,
      txVersion,
  
      // optional: set up priority fee here
      // computeBudgetConfig: {
      //   units: 600000,
      //   microLamports: 465915,
      // },
  
      // optional: add transfer sol to tip account instruction. e.g sent tip to jito
      // txTipConfig: {
      //   address: new PublicKey('96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'),
      //   amount: new BN(10000000), // 0.01 sol
      // },
    })
  
    printSimulateInfo()
    const { txId } = await execute()
    console.log('swapped in clmm pool:', { txId: `https://solscan.io//tx/${txId}?cluster=custom&customUrl=https://rpc.testnet.soo.network/rpc` })
    // process.exit() // if you don't want to end up node execution, comment this line
  }
  
  /** uncomment code below to execute */
  swap()