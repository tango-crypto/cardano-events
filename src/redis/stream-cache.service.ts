import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Cluster, RedisOptions, ClusterOptions, ClusterNode } from 'ioredis';
import { BlockDto } from 'src/models/block';
import { CacheExpiresProvider } from './cache-expires.provider';

@Injectable()
export class StreamCacheService implements OnModuleDestroy {
    scriptSrc: string;
    redis: Redis.Redis | Cluster;
    blockExpiresHandler: (slotNo: string, ...extra: any[]) => void;

    constructor(private readonly configService: ConfigService, private readonly cacheExpiresProvider: CacheExpiresProvider) {
        const config: { options: ClusterOptions | RedisOptions, nodes?: ClusterNode[] } = this.configService.get<string>('NODE_ENV') == 'development' ? {
            options: {
                host: this.configService.get<string>('REDIS_HOST'),
                port: this.configService.get<number>('REDIS_PORT')
            }
        } : {
            options: {
                redisOptions: {
                    password: this.configService.get<string>('REDIS_PWD'),
                }
            },
            nodes: JSON.parse(configService.get<string>('REDIS_CLUSTERS'))
        };
        this.redis = config.nodes ? new Cluster(config.nodes, config.options) : new Redis(config.options);
        this.blockExpiresHandler = async (blockKey: string, ...extra: any[]) => await this.onBlockExpires(extra[0], blockKey);
    }

    async insert(key: string, block: BlockDto, ttl: number): Promise<void> {
        const blockKey = `block-${block.slot_no}`;
        const result = await this.redis.pipeline()
                            .hset(key, blockKey, JSON.stringify(block))
                            .set(blockKey, '')
                            .expire(blockKey, ttl)
                            .exec();
        const errors: Error[] = result.reduce((arr: any, r: any) => {
            if (r[0]) {
                arr.push(r[0]);
            }
            return arr;
        }, []);
        if (errors.length == 0) {
            this.cacheExpiresProvider.addListener(blockKey, [key], this.blockExpiresHandler);
        } else {
            throw Error(errors.map(e => e.message).join('\n'));
        }

    }

    async getAll(key: string): Promise<BlockDto[]> {
        const result = await this.redis.hgetall(key);
        return Object.entries(result).map(([slotNo, block]) => JSON.parse(block));
    }

    private async onBlockExpires(key:string, blockKey: string): Promise<void> {
        await this.redis.hdel(key, blockKey);
    }

    onModuleDestroy() {
        this.redis?.disconnect(false);
    }
}