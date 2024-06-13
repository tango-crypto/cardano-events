import { Pool } from "@tangocrypto/tango-ledger";

export class BlockDto {
    id?: number;
    hash: string; // "4d8296d03f2a0a471a16e34f2204026ac3c82311dfa2569fbb7f680e4cf3e66b",
    epoch_no: number; // 372,
    slot_no: number; // "75398161",
    epoch_slot_no?: number; // 57361,
    block_no: number; // 7941775,
    previous_block?: number; // 7941774,
    next_block?: number; // null,
    slot_leader?: string; // "pool1ddg6t2h9kj6lqlec4ncjs945lzj43m3ggrgdhf5sgzhtygpkznz",
    out_sum?: number; // "6189878553712",
    fees?: number; // "11268611",
    confirmations?: number; // 1,
    size?: number; // 58863,
    time?: Date; // "2022-10-28T13:40:52.000Z",
    tx_count?: number; // "36",
    proto_major?: number; // 8
    proto_minor?: number; // 0
    op_cert?: string; // "d5b849f9757cd2ef60c883b092a7e985d27c22f89aac7648b13d3cfd4cce4737",
    vrf_key?: string; // "vrf_vk1m5tnjq3exhpu8mfcy6rl5xe5jedd8adzx6n5syju3vj8p5yhfels900hls",
    pool?: Pool;

}