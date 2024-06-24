import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mapping, types } from "cassandra-driver";
import { ScyllaService } from "../scylla/scylla.service";
import { BlockDto } from "src/models/block";
import { StreamCacheService } from "src/redis/stream-cache.service";

@Injectable()
export class RecoveryService {
    prefix: string = 'recovery-points';
    // ttl: number = 43200; // 12 hours
    ttl: number = 60;
    recoveryPointMapper: mapping.ModelMapper<BlockDto>;
    getRecoveryPoints: (doc: any, executionOptions?: string | mapping.MappingExecutionOptions) => Promise<mapping.Result<BlockDto>>;

    constructor(private readonly configService: ConfigService, private streamCacheService: StreamCacheService) { 
    }

    async insert(network: string, block: BlockDto) {
       await this.streamCacheService.insert(`${this.prefix}-${network}`, block, this.ttl);
    }

    async findAll(network: string): Promise<BlockDto[]> {
        const result = await this.streamCacheService.getAll(`${this.prefix}-${network}`);
        return result;
    }
}
