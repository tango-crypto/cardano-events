import { ConnectionConfig } from '@cardano-ogmios/client'
import { Intersection } from '@cardano-ogmios/client/dist/ChainSynchronization';
import { Block, PointOrOrigin, TipOrOrigin, EraSummary, BlockEBB, BlockBFT, BlockPraos, Transaction } from '@cardano-ogmios/schema';
import { AssetsJSON, hash_plutus_data, MintJSON, PlutusData, Transaction as SerializationTransaction } from '@emurgo/cardano-serialization-lib-nodejs';
import { PostgresClient } from '@tangocrypto/tango-ledger';
import { BlockDto } from '../models/block';
import { isBFTBlock, isEBBBlock, isPraosBlock } from '../models/ogmios/block';
import { Payment } from '../models/payment';
import { AssetDto, TransactionDto, UtxoDto } from '../models/transaction';
import { assetFingerprint, buildPlutusDataMap, convertAssetName, getAddress, getPoolHash, getStakeAddress, reverseMetadataObject, slotInEpoch, slotToEpoch, slotToTime, plutusDataToJson } from '../utils';
import { OgmiosChainSyncClient } from './chain-sync';
import { OgmiosStateQueryClient } from './state-query';
import { BlockInfo } from 'src/models/block-info';


const OGMIOS_SOURCE = 'tango.ogmios';

export class OgmiosManager {
    network: string;
    connectionConfig: ConnectionConfig;
    chainSyncClient: OgmiosChainSyncClient;
    stateQueryClient: OgmiosStateQueryClient;

    intersection: Intersection;
    onrollForward: any;
    onrollBackward: any;

    dbClient: PostgresClient;
    subscriptions: Map<string, { callback: (error: any, data: any, source?: string) => void }>;
    events: Map<string, boolean>;

    constructor(config: { host?: string, port?: number, tls?: boolean, node_env?: string, redis_host?: string, redis_port?: number, redis_pwd?: string, redis_cluster?: string, network?: string }, dbClient: PostgresClient) {
        this.connectionConfig = { host: config.host, port: config.port, tls: config.tls };
        console.log('Connection:', this.connectionConfig);
        console.log('Network:', config.network);
        this.network = config.network || 'mainnet';

        this.chainSyncClient = new OgmiosChainSyncClient(this.connectionConfig);
        this.stateQueryClient = new OgmiosStateQueryClient(this.connectionConfig);

        this.onrollForward = this.rollForward.bind(this);
        this.onrollBackward = this.rollBackward.bind(this);

        this.dbClient = dbClient;
    }

    async startChainSync(events: Map<string, boolean>, subscriptions: Map<string, { callback: (error: any, data: any, source?: string) => void }>, points?: PointOrOrigin[], inFlight?: number): Promise<void> {
        this.events = events;
        this.subscriptions = subscriptions;
        await this.chainSyncClient.createClient({ rollForward: this.onrollForward, rollBackward: this.onrollBackward });

        // if (!points) {
        //     const latestPoint = await this.getChainTip();
        //     console.log('Get chain tip', latestPoint);
        //     points = [latestPoint];
        // }
        this.intersection = await this.chainSyncClient.start(points, inFlight);
        console.log('Chain sync starting at:', this.intersection);

    }

    public async getChainTip(point?: PointOrOrigin): Promise<PointOrOrigin> {
        await this.adjustStateQueryClient(point);
        return this.stateQueryClient.getChainTip();
    }

    public async getEraSummaries(point?: PointOrOrigin): Promise<EraSummary[]> {
        await this.adjustStateQueryClient(point);
        return this.stateQueryClient.getEraSummaries();
    }

    private async adjustStateQueryClient(point?: PointOrOrigin) {
        console.log('Acquiere point:', point);
        const connected = await this.stateQueryClient.isConnected();
        if (!connected) {
            console.log('Query state not connected yet, so connect first');
            
            await this.stateQueryClient.createClient(point);
        }
        if (point && connected) {
            await this.stateQueryClient.acquire(point);
        }
    }



    private async rollForward({ block, tip }: { block: Block; tip: TipOrOrigin }, requestNext: () => void) {
        //   await db.insert(block)
        console.log('network:', this.network);
        console.log(`Chain extended, new tip: ${JSON.stringify(tip)}`);
        // console.log(`Chain extended, block: ${JSON.stringify(block, (_, value) => typeof value == 'bigint' ? value.toString() : value )}`);
        let event = '';
        try {
            if (this.events.has('block')) {
                event = 'block';
                const { block: _block, txs } = await this.buildBlock(block);
                this.subscriptions.get('block').callback(null, _block, OGMIOS_SOURCE);
                if (this.events.has('transaction')) {
                    event = 'transaction';
                    // console.log('---------------------- Mapping result ----------------------');
                    // console.log(`New block:`, JSON.stringify(bBlock));
                    // console.log('------------------------------------------------------------');
                    // console.log(`New txs:`, JSON.stringify(txs));

                    // console.log(`Querying the node...`);
                    // console.log(JSON.stringify(await this.getEraSummaries()));
                    this.notifyTransactions(txs, _block);
                }
            } else if (this.events.has('transaction')) {
                event = 'transaction';
                const { block: bBlock, txs } = await this.buildBlock(block);
                this.notifyTransactions(txs, bBlock);
            }
        } catch (err) {
            this.subscriptions.get(event).callback(err, null, OGMIOS_SOURCE);
        }

        await sleep(1000);
        requestNext()
    }

    private notifyTransactions(txs: { transaction: TransactionDto; inputs?: UtxoDto[] | { hash: string; index: number; }[]; outputs?: UtxoDto[]; }[], bBlock: BlockDto) {
        for (const { transaction, inputs, outputs } of txs) {
            try {
                const payment: Payment = { transaction: { ...transaction, block: bBlock }, inputs, outputs }
                this.subscriptions.get('payment').callback(null, payment, OGMIOS_SOURCE);
            } catch (err) {
                this.subscriptions.get('payment').callback(err, null, OGMIOS_SOURCE);
            }
        }
    }

    async buildBlock(block: Block) {
        const result: { block?: BlockDto, txs?: { transaction: TransactionDto, inputs?: UtxoDto[] | { hash: string, index: number }[], outputs?: UtxoDto[] }[] } = {};
        let blockInfo = this.getCommonBlockInfo(block);
        // if (isBabbageBlock(block)) {
        //     const { babbage } = block;
        //     blockInfo = this.getCommonBlockInfo(babbage);
        // } else if (isAlonzoBlock(block)) {
        //     const { alonzo } = block;
        //     blockInfo = this.getCommonBlockInfo(alonzo);
        // } else if (isMaryBlock(block)) {
        //     const { mary } = block;
        //     blockInfo = this.getCommonBlockInfo(mary);
        // } else if (isAllegraBlock(block)) {
        //     const { allegra } = block;
        //     blockInfo = this.getCommonBlockInfo(allegra);
        // } else if (isShelleyBlock(block)) {
        //     const { shelley } = block;
        //     blockInfo = this.getCommonBlockInfo(shelley);
        // } else if (isByronStandardBlock(block)) { // Byron block
        //     const { byron } = block;
        //     const header = byron.header;
        //     blockInfo = {
        //         header,
        //         txBlocks: byron.body.txPayload,
        //         hash: byron.hash,
        //         poolId: getPoolHash(header.signature.dlgCertificate.issuerVk),
        //         time: slotToTime(header.slot, this.network),
        //         epochNo: slotToEpoch(header.slot, this.network),
        //         slotNoInEpoch: slotInEpoch(header.slot, this.network),
        //     }
        // } else if (isByronEpochBoundaryBlock(block)) {
        //     const { byron } = block;
        //     blockInfo = {
        //         header: byron.header,
        //         txBlocks: [],
        //         hash: byron.hash,
        //         epochNo: byron.header.epoch
        //     }
        //     console.log('EPOCH BOUNDARY ALERT!!!', JSON.stringify(block));
        // } else { // invalid block???
        //     console.log('invalid bock..................?????????????', JSON.stringify(block));
        //     return;
        // }

        // let { header, txBlocks, hash, poolId, time, epochNo, slotNoInEpoch } = blockInfo;
        let { blockNo, hash, txBlocks } = blockInfo;
        // offchain fecth
        let fees = 0;
        let out_sum = 0;
        const txs: { transaction: TransactionDto, inputs?: UtxoDto[] | { hash: string, index: number }[], outputs?: UtxoDto[] }[] = [];
        // console.log('Block txs:', txBlocks);
        for (const tx of txBlocks) {
            const t = this.buildTransaction(tx)
            fees += t.transaction.fee;
            out_sum += t.transaction.out_sum;
            txs.push(t);
        }

        // onchain fecht
        // console.log('Pool Id:', poolId);
        // const pool = await this.dbClient.getPool(poolId);
        // console.log('Pool', pool);
        result.block = {
            hash: hash,
            epoch_no: blockInfo.epochNo,
            slot_no: blockInfo.slot,
            epoch_slot_no: blockInfo.slotNoInEpoch,
            block_no: blockNo,
            previous_block: blockInfo.blockNo ? blockInfo.blockNo - 1 : null,
            next_block: blockInfo.blockNo ? blockInfo.blockNo + 1: null,
            slot_leader: blockInfo.poolId,
            out_sum: out_sum,
            fees: fees,
            confirmations: 1,
            size: blockInfo.blockSize,
            time: blockInfo.time,
            tx_count: txBlocks.length,
            proto_major: blockInfo.protocolVersion?.major,
            proto_minor: blockInfo.protocolVersion?.minor,
            vrf_key: blockInfo.vrfKey, // see how to build it
            // op_cert: header.opCert?.sigma, // see how to build it
            // pool: pool
        }
        result.txs = txs;
        return result;
    }

    private getCommonBlockInfo(block: Block): BlockInfo {
        if (isEBBBlock(block)) {
            const _block = block as BlockEBB;
            return {
                blockNo: _block.height,
                hash: _block.id,
                txBlocks: [],

            }
        } else if (isBFTBlock(block)) {
            const _block = block as BlockBFT;
            return {
                blockNo: _block.height,
                epochNo: slotToEpoch(_block.slot, this.network),
                slotNoInEpoch:  slotInEpoch(_block.slot, this.network),
                time: slotToTime(_block.slot, this.network),
                poolId: getPoolHash(_block.issuer.verificationKey),
                hash: _block.id,
                txBlocks: _block.transactions,
                slot: _block.slot,
                blockSize: _block.size.bytes,
            }
        } else if (isPraosBlock(block)) {
            const _block = block as BlockPraos;
            return {
                blockNo: _block.height,
                epochNo: slotToEpoch(_block.slot, this.network),
                slotNoInEpoch:  slotInEpoch(_block.slot, this.network),
                time: slotToTime(_block.slot, this.network),
                poolId: getPoolHash(_block.issuer.verificationKey),
                hash: _block.id,
                txBlocks: _block.transactions,
                slot: _block.slot,
                blockSize: _block.size.bytes,
                protocolVersion: _block.protocol.version,
                opCert: _block.issuer.operationalCertificate,
                vrfKey: _block.issuer.vrfVerificationKey
            }
        } else {
            throw new Error(`Invalid block: ${JSON.stringify(block)}`);
        }
        // const header = block.header;
        // const txBlocks = block.body;
        // const hash = block.headerHash;
        // const poolId = getPoolHash(header.issuerVk);
        // const time = slotToTime(header.slot, this.network);
        // const epochNo = slotToEpoch(header.slot, this.network);
        // const slotNoInEpoch = slotInEpoch(header.slot, this.network);
        // return { header, txBlocks, hash, poolId, time, epochNo, slotNoInEpoch };
    }

    buildTransaction(tx: Transaction): { transaction: TransactionDto, inputs?: UtxoDto[] | { hash: string, index: number }[], outputs?: UtxoDto[] } {
        let t: TransactionDto = {
            hash: tx.id,
            out_sum: 0,
            fee: 0,
            size: 0,
        }
        const inputs = [], outputs = [];
        const transaction = SerializationTransaction.from_bytes(Buffer.from(tx.cbor, 'hex'));
        t.size = transaction.to_bytes().byteLength;
        // NOTE: we cannot map the entire tx because some JSON mapping issues: e.g. UTxO PlutusData Serialization error: JsValue("Integer 22152711609524722000000 too big for our JSON support")
        // console.log('TX:', JSON.stringify(transaction.to_json(), null, 2));

        const auxiliaryData = transaction.auxiliary_data();
        if (auxiliaryData) {
            const metadata = auxiliaryData.metadata();
            if (metadata) {
                t.metadata = this.buildMetadata(metadata.to_js_value())
                // console.log('TX METADATA ALERT!!!', JSON.stringify(t.metadata));
                metadata.free();
            }
            auxiliaryData.free();
        }
        const body = transaction.body();
        const witnessSet = transaction.witness_set();
        const txPlutusData = witnessSet.plutus_data();
        let plutusDataMap: { [key: string]: { value_raw: string, value: any } } = {};
        if (txPlutusData) {
            plutusDataMap = buildPlutusDataMap(txPlutusData);
            txPlutusData.free();
        }
        witnessSet.free();
        transaction.free();

        const fee = body.fee()
        t.fee = Number(fee.to_str());
        fee.free();
        const mint = body.mint();
        if (mint) {
            t.mint = this.buildMintData(mint.to_js_value());
            // console.log('TX MINT ALERT!!!', JSON.stringify(t.mint));
            mint.free();
        }
        const txInputs = body.inputs();
        const inputLength = txInputs.len();
        for (let i = 0; i < inputLength; i++) {
            const txInput = txInputs.get(i);
            const txIn = txInput.to_js_value();
            txInput.free();
            const input: any = {
                hash: txIn.transaction_id,
                index: txIn.index
            }
            inputs.push(input);
        }
        txInputs.free();

        const txOutputs = body.outputs();
        body.free();
        const outputLength = txOutputs?.len() || 0;
        for (let i = 0; i < outputLength; i++) {
            const txOut = txOutputs.get(i);
            const txAmount = txOut.amount();
            const txAddress = txOut.address();
            const plutusData = txOut.plutus_data();
            const amount = txAmount.to_js_value();
            txAmount.free();
            const address = getAddress(txAddress);
            txAddress.free();
            const value = Number(amount.coin);
            t.out_sum += value;
            let datum: { hash?: string, value_raw?: string, value?: any } = null;
            if (plutusData) {
                // NOTE: this is one place where the issue try to get tx in json format is coming from
                // const value = JSON.parse(plutusData.to_json(0));
                const value = plutusDataToJson(plutusData);
                const hashValue = plutusData.to_hex();
                const dataHash = hash_plutus_data(plutusData);
                plutusData.free();
                const hash = dataHash.to_hex();
                dataHash.free()
                datum = { hash, value_raw: hashValue, value }
            } else {
                const plutusDataHash = txOut.data_hash();
                if (plutusDataHash) {
                    const hash = plutusDataHash.to_hex();
                    plutusDataHash.free();
                    datum = { hash };
                    if (plutusDataMap[hash]) {
                        const { value, value_raw } = plutusDataMap[hash];
                        datum.value_raw = value_raw;
                        datum.value = value;
                    }
                }
            }
            txOut.free();
            const output: UtxoDto = {
                hash: t.hash,
                index: i,
                address: address,
                value: value
            }
            if (amount.multiasset) {
                output.assets = this.buildAssets(amount.multiasset, address);
                // console.log('TX UTxO ASSETS ALERT!!!', JSON.stringify(output.assets));
            }
            if (datum) {
                output.datum = datum;
            }
            outputs.push(output);
        }
        txOutputs?.free();
        return { transaction: t, inputs, outputs };
    }

    buildMetadata(metadata: { [k: string]: string }): { label: string, json: any }[] {
        const m: any = metadata || new Map();
        let result: { label: string, json: any }[] = []
        for (let [key, value] of Array.from<any>(m.entries())) {
            result.push({ label: key, json: reverseMetadataObject(JSON.parse(value)) })
        }
        return result
    }

    buildMintData(mint: MintJSON): any {
        return Array.from<any>(new Map(mint).entries()).reduce((dict, [policy_id, value]) => {
            for (const [asset_name, quantity] of Array.from<any>(value.entries())) {
                const fingerprint = assetFingerprint(policy_id, asset_name);
                if (dict[fingerprint]) {
                    dict[fingerprint].quantity += Number(quantity)
                } else {
                    dict[fingerprint] = {
                        policy_id,
                        ...convertAssetName(asset_name),
                        quantity: Number(quantity)
                    }
                }
            }
            return dict;
        }, {});
    }

    buildAssets(multiassets: { [k: string]: AssetsJSON; }, address: string): AssetDto[] {
        const m: any = multiassets || new Map();
        return Array.from<any>(m.entries()).flatMap(([policy_id, assets]) => {
            const massets: any = assets || new Map();
            return Array.from<any>(massets.entries()).map(([asset_name, quantity]) => ({
                policy_id,
                ...convertAssetName(asset_name),
                fingerprint: assetFingerprint(policy_id, asset_name),
                quantity: Number(quantity),
                owner: getStakeAddress(address) || address,
                address
            }));
        });
    }


    private async rollBackward({ point, tip }: { point: PointOrOrigin, tip: TipOrOrigin }, requestNext: () => void) {
        //   await db.rollback(point)
        console.log(`Rollback tip: ${JSON.stringify(tip)}, point: ${JSON.stringify(point)}`);
        requestNext()
    }

}

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(() => resolve(true), ms));
}