import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientOptions, ClientProviderOptions, ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScyllaService } from './scylla/scylla.service';
import { RecoveryService } from './scylla/recovery.service';

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
  providers: [AppService, ScyllaService, RecoveryService],
})
export class AppModule {}
