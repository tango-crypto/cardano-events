import { Block, BlockBFT, BlockEBB, BlockPraos, Certificate, StakeDelegation } from "@cardano-ogmios/schema";

// export declare type CommonBlock = BlockBabbage | BlockAlonzo | BlockMary | BlockAllegra | BlockShelley;

export const isEBBBlock = (block: Block): block is BlockEBB => block.type === 'ebb' && block.era === 'byron';
export const isBFTBlock = (block: Block): block is BlockBFT => block.type === 'bft' && block.era === 'byron';
export const isPraosBlock = (block: Block): block is BlockPraos => block.type === 'praos';
export const isStakeDelegation = (cert: Certificate): cert is StakeDelegation => cert.type === 'stakeDelegation' && (!!cert.stakePool && !cert.delegateRepresentative);