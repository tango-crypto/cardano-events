export class BlockInfo {
    blockNo: number;
    hash: string;
    txBlocks: any[];
    slot?: number;
    blockSize?: number;
    epochNo?: number;
    slotNoInEpoch?: number;
    poolId?: string;
    time?: Date;
    protocolVersion?: any;
    opCert?: any;
    vrfKey?: string;
}