import { CLMM_PROGRAM_ID, DEVNET_PROGRAM_ID } from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import { initSdk, txVersion } from './config'
import Decimal from 'decimal.js'
import BN from 'bn.js'
import { devConfigs } from './utils'

export const testCreatePool = async () => {
  const raydium = await initSdk({ loadToken: true })
  console.log("rayDium inited!", raydium.cluster);
  // you can call sdk api to get mint info or paste mint info from api: https://api-v3.raydium.io/mint/list
  // t24 on DevNet
  const mint1 = await raydium.token.getTokenInfo('2tWjVSRhkf8rN6cMy7DFDUJ5gx3cRJXtqT3Qu5ATfznp')
  // SOLLL
  
  const mint2 = await raydium.token.getTokenInfo('So11111111111111111111111111111111111111112')
  // const clmmConfigs = await raydium.api.getClmmConfigs()
  // console.log("clmmConfig:", clmmConfigs);
  console.log(mint1, mint2);
  
  const clmmConfigs = devConfigs // devnet configs
  // console.log(mint1, mint2);
  console.log(new PublicKey("CcCFdUQdoG3bS9bJJUvWupgGnWoKHYGXRXuyDFAdack5"));
  const { execute } = await raydium.clmm.createPool({
    // programId: CLMM_PROGRAM_ID,
    programId: new PublicKey("CcCFdUQdoG3bS9bJJUvWupgGnWoKHYGXRXuyDFAdack5"),
    mint1,
    mint2,
    ammConfig: { ...clmmConfigs[0], id: new PublicKey(clmmConfigs[0].id), fundOwner: '', description: '' },
    initialPrice: new Decimal(1),
    txVersion,

  })
  
  const { txId } = await execute({ sendAndConfirm: true })
  console.log('clmm pool created:', { txId: `https://solscan.io//tx/${txId}?cluster=custom&customUrl=https://rpc.testnet.soo.network/rpc` })
  process.exit() // if you don't want to end up node execution, comment this line
}

testCreatePool()