import { ApiV3PoolInfoConcentratedItem, ClmmKeys, RAYMint } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from './config'
import Decimal from 'decimal.js'
import { isValidClmm } from './utils'
import { PublicKey } from '@solana/web3.js'

export const createFarm = async () => {
  const raydium = await initSdk()
  // note: please ensure you this is owned by yourself
  let poolInfo: ApiV3PoolInfoConcentratedItem

  // SOL-USDC pool
  const poolId = 'DHh7eEN3cVQJf7fp13vANLWNbTPVgKoQ1KFsjJ9tUYtW'
  let poolKeys: ClmmKeys | undefined

  
const data = await raydium.clmm.getPoolInfoFromRpc(poolId)
poolInfo = data.poolInfo
poolKeys = data.poolKeys
console.log(poolInfo);
const token = new PublicKey("2tWjVSRhkf8rN6cMy7DFDUJ5gx3cRJXtqT3Qu5ATfznp");
const mint = await raydium.token.getTokenInfo(token.toBase58())
const currentChainTime = await raydium.currentBlockChainTime()
const openTime = Math.floor(currentChainTime / 1000) // in seconds
const endTime = openTime + 60 * 60 * 24 * 7

  const newRewardInfos = [
    {
      mint,
      openTime,
      endTime,
      perSecond: new Decimal(1),
    },
  ]

  const { execute } = await raydium.clmm.initRewards({
    poolInfo,
    poolKeys,
    rewardInfos: newRewardInfos,
    checkCreateATAOwner: true,
    ownerInfo: {
      useSOLBalance: true,
    },
    txVersion,
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 46591500,
    // },

    // optional: add transfer sol to tip account instruction. e.g sent tip to jito
    // txTipConfig: {
    //   address: new PublicKey('96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'),
    //   amount: new BN(10000000), // 0.01 sol
    // },
  })

  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
//   const { txId } = await execute({ sendAndConfirm: true })
//   console.log('clmm farm created:', { txId: `https://solscan.io//tx/${txId}?cluster=custom&customUrl=https://rpc.testnet.soo.network/rpc` })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
createFarm()