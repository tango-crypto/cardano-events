import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'stream';
import Client from 'ioredis';
import * as Redis from 'ioredis';

@Injectable()
export class CacheExpiresProvider {
  redis: Redis.Redis | Redis.Cluster;
  emiter: LockResourceExpire;
  constructor(private readonly configService: ConfigService) {
    this.emiter = new LockResourceExpire();
    let client: Redis.Redis | Redis.Cluster;
    if (this.configService.get<string>('NODE_ENV') == 'development') {
      this.redis = new Client({
        host: this.configService.get<string>('REDIS_HOST'),
        port: this.configService.get<number>('REDIS_PORT'),
      });
      client = new Client({
        host: this.configService.get<string>('REDIS_HOST'),
        port: this.configService.get<number>('REDIS_PORT'),
      });
    } else {
      const clusterOptions: Redis.ClusterOptions = {
        redisOptions: {
          showFriendlyErrorStack: true,
          password: this.configService.get<string>('REDIS_PWD'),
        },
      };
      const nodes: Redis.ClusterNode[] = JSON.parse(
        configService.get<string>('REDIS_CLUSTERS'),
      );
      this.redis = new Redis.Cluster(nodes, clusterOptions);
      client = new Redis.Cluster(nodes, clusterOptions);
    }

    client.on('ready', () => {
      let nodes = [];
      if (client instanceof Redis.Cluster) {
        nodes = client.nodes();
      } else {
        nodes.push(client);
      }
      nodes.forEach((c) => {
        c.config('SET', 'notify-keyspace-events', 'Ex'); // config to enable listen key events and expirations. Set to subscriber mode.
        c.subscribe('__keyevent@0__:expired');
        c.on('message', async (_channel: any, key: string) => {
          const storageKey = `expires-${key}`;
          const result = await this.redis.pipeline()
                            .get(storageKey)
                            .del(storageKey)
                            .exec();
          const errors: Error[] = result.reduce((arr: any, r: any) => {
            if (r[0]) {
                arr.push(r[0]);
            }
            return arr;
          }, []);
          if (errors.length == 0 && result[0][1]) {
            this.emiter.emit(`${key}:expired`, key, ...JSON.parse(result[0][1]));
          }
        });
      });
    });
  }

  async addListener(
    key: string,
    extra: any[],
    listener: (...args: any[]) => void,
  ): Promise<void> {
    const ok = await this.redis.set(`expires-${key}`, JSON.stringify(extra));
    if (ok == "OK") {
      this.emiter.on(`${key}:expired`, listener);
    }
  }

  async removeListener(
    key: string,
    _extra: any[],
    listener: (...args: any[]) => void,
  ): Promise<void> {
    const deleted = await this.redis.del(`expires-${key}`);
    if (deleted == 1) {
      this.emiter.off(`${key}:expired`, listener);
    }
  }
}

class LockResourceExpire extends EventEmitter {
  constructor() {
    super();
  }
}
