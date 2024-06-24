import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientOptions, ClientProviderOptions, ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RecoveryService } from './scylla/recovery.service';
import { StreamCacheService } from './redis/stream-cache.service';
import { CacheExpiresProvider } from './redis/cache-expires.provider';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClientsModule.registerAsync([
      {
        name: 'WEBHOOK_SERVICE',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService): Promise<ClientOptions> => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get<string>('KAFKA_CLIENT'),
              brokers: [`${configService.get<string>('KAFKA_HOST')}:${configService.get<string>('KAFKA_PORT')}`],
            },
            consumer: {
              groupId: configService.get<string>('KAFKA_CONSUMER_GROUP'),
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService, StreamCacheService, RecoveryService, CacheExpiresProvider],
})
export class AppModule {}
