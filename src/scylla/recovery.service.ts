import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mapping, types } from "cassandra-driver";
import { ScyllaService } from "../scylla/scylla.service";
import { BlockDto } from "src/models/block";

@Injectable()
export class RecoveryService {
    table: string;
    recoveryPointMapper: mapping.ModelMapper<BlockDto>;
    getRecoveryPoints: (doc: any, executionOptions?: string | mapping.MappingExecutionOptions) => Promise<mapping.Result<BlockDto>>;

    constructor(private readonly configService: ConfigService, private scyllaService: ScyllaService) { 
        const mappingOptions: mapping.MappingOptions = {
            models: {
                'RecoveryPoint': {
                    tables: ['recoverypoints'],
                    mappings: new mapping.DefaultTableMappings,
                    // columns: {
                    //     network: 'network',
                    //     blockNo: 'block_no',
                    //     hash: 'hash',
                    //     txBlocks: 'tx_blocks',
                    //     slot: 'slot',
                    //     blockSize: 'block_size',
                    //     epochNo: 'epoch_no',
                    //     slotNoInEpoch: 'slot_no_in_epoch',
                    //     poolId: 'pool_id',
                    //     time: 'time',
                    //     protocolVersion: 'protocol_version',
                    //     opCert: 'op_cert',
                    //     vrfKey: 'vrf_key',
                    //     timestamp: 'timestamp'
                    // }
                },
            }
        }

        this.recoveryPointMapper = this.scyllaService.createMapper(mappingOptions).forModel('RecoveryPoint');
        this.getRecoveryPoints = this.recoveryPointMapper.mapWithQuery(`SELECT * FROM recoverypoints WHERE network = ? ORDER BY slot_no DESC LIMIT ?`, (params) => [params.network, params.limit]);
    }

    async insert(network: string, block: BlockDto) {
       await this.recoveryPointMapper.insert({ ...block, network, timestamp: new Date() });
    }

    async findAll(network: string, limit = 5): Promise<BlockDto[]> {
        const result = await this.getRecoveryPoints({ network, limit });
        return result.toArray();
    }
}
