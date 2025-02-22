import { ApiV3PoolInfoConcentratedItem, TickUtils, PoolUtils, ClmmKeys } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from './config'
import Decimal from 'decimal.js'
import { isValidClmm } from './utils'

export const openPosition = async () => {
  const raydium = await initSdk()

  let poolInfo: ApiV3PoolInfoConcentratedItem
  // SOL-CustomCOIN pool
  const poolId = 'DHh7eEN3cVQJf7fp13vANLWNbTPVgKoQ1KFsjJ9tUYtW'
  let poolKeys: ClmmKeys | undefined
  const data = await raydium.clmm.getPoolInfoFromRpc(poolId)
  poolInfo = data.poolInfo
  poolKeys = data.poolKeys

  /** code below will get on chain realtime price to avoid slippage error, uncomment it if necessary */
  // const rpcData = await raydium.clmm.getRpcClmmPoolInfo({ poolId: poolInfo.id })
  // poolInfo.price = rpcData.currentPrice
  console.log(poolInfo);
  const inputAmount = 0.000001 // SOL amount
  const [startPrice, endPrice] = [0.000001, 100000]

  const { tick: lowerTick } = TickUtils.getPriceAndTick({
    poolInfo,
    price: new Decimal(startPrice),
    baseIn: true,
  })

  const { tick: upperTick } = TickUtils.getPriceAndTick({
    poolInfo,
    price: new Decimal(endPrice),
    baseIn: true,
  })

  const epochInfo = await raydium.fetchEpochInfo()
  const res = await PoolUtils.getLiquidityAmountOutFromAmountIn({
    poolInfo,
    slippage: 0,
    inputA: true,
    tickUpper: Math.max(lowerTick, upperTick),
    tickLower: Math.min(lowerTick, upperTick),
    amount: new BN(new Decimal(inputAmount || '0').mul(10 ** poolInfo.mintA.decimals).toFixed(0)),
    add: true,
    amountHasFee: true,
    epochInfo: epochInfo,
  })

  const { execute, extInfo } = await raydium.clmm.openPositionFromBase({
    poolInfo,
    poolKeys,
    tickUpper: Math.max(lowerTick, upperTick),
    tickLower: Math.min(lowerTick, upperTick),
    base: 'MintA',
    ownerInfo: {
      useSOLBalance: true,
    },
    baseAmount: new BN(new Decimal(inputAmount || '0').mul(10 ** poolInfo.mintA.decimals).toFixed(0)),
    otherAmountMax: res.amountSlippageB.amount,
    txVersion,
    // optional: set up priority fee here
    computeBudgetConfig: {
      units: 600000,
      microLamports: 100000,
    },
  })

  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true })
  console.log('clmm position opened:', { txId, nft: extInfo.nftMint.toBase58() })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
openPosition()