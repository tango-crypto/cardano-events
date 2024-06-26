import { BlockDto } from "./block";
import { DelegationDto } from "./delegation";

export class TransactionDto {
    id?: number;
    hash: string;
    block_id?: number;
    block_index?: number;
    out_sum: number;
    fee: number;
    deposit?: number;
    size: number;
    invalid_before?: number;
    invalid_hereafter?: number;
    valid_contract?: boolean;
    script_size?: number;
    mint?: any;
    metadata?: any;
    block?: BlockDto;
    delegations?: DelegationDto[];
}

export class UtxoDto {
    hash: string;
    index: number;
    address: string;
    value: number;
    assets?: AssetDto[];
    datum?: { hash? :string, value_raw?: string, value?: any };
}

export class AssetDto {
    policy_id: string;
    asset_name: string;
    asset_name_label?: number;
    quantity: number;
    fingerprint?: string;
    owner?: string;
}