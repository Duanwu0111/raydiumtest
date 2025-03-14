// 定义 SwapV2 类
export class SwapV2 {
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
  export class IncreaseLiquidityV2 {
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
 export  class DecreaseLiquidityV2 {
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
  export class CreatePool {
    instructionDiscriminator: bigint;
    // 根据实际数据调整字段
    constructor(args: { instructionDiscriminator: bigint }) {
      this.instructionDiscriminator = args.instructionDiscriminator;
    }
  }
  
  // 定义指令的 Borsh 布局
  export const SWAP_V2_SCHEMA = new Map([
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
  
  export const INCREASE_LIQUIDITY_V2_SCHEMA = new Map([
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
  
  export const DECREASE_LIQUIDITY_V2_SCHEMA = new Map([
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
  
  export const CREATE_POOL_SCHEMA = new Map([
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
  