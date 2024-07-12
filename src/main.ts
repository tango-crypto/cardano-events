import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { NotificationManager } from './notification-manager';
import { Transaction, Delegation, Block, Epoch } from '@tangocrypto/tango-ledger';
import { Payment } from './models/payment';
import { RecoveryService } from './scylla/recovery.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);
  const appService = app.get(AppService);
  const recoveryService = app.get(RecoveryService);

  const notificationConfig: any = {};
  const useRecoveryPoints = configService.get<boolean>("USE_RECOVERY_POINTS") || false;
  
  if (configService.get<string>('NOTIFY_OGMIOS') == 'true') {
    notificationConfig.ogmios = {
      host: configService.get<string>('OGMIOS_HOST') || 'localhost',
      port: parseInt(configService.get<string>('OGMIOS_PORT')) || 1337,
      tls: configService.get<string>('OGMIOS_TLS') == 'true',
      events: configService.get<string>('OGMIOS_EVENTS'),
      network: configService.get<string>('NETWORK')
    }
  }

  notificationConfig.db = {
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    user: configService.get<string>('DB_USER'),
    password: configService.get<string>('DB_PWD'),
    name: configService.get<string>('DB_NAME'),
    debug: configService.get<string>('DB_DEBUG') == 'true',
    pool: {
      min: configService.get<number>('DB_POOL_MIN'),
      max: configService.get<number>('DB_POOL_MAX'),
    }
  }

  let notifications = new NotificationManager(notificationConfig, recoveryService, useRecoveryPoints);

  notifications.subscribe('epoch', async (err, epoch: Epoch, source: string = 'tango.jsonrpc-server') => {
    if (err) {
      console.error(`[${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ' UTC')}]: Epoch notification error building (${source})\n`, err);
      return;
    }
    try {
      appService.sendMessage('new_epoch', JSON.stringify(epoch));
    } catch (err) {
      console.error(`[${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ' UTC')}]: Epoch notification error (${source})\n`, err);
    }
  });

  notifications.subscribe('block', async (err, block: Block, source: string = 'tango.jsonrpc-server') => {
    if (err) {
      console.error(`[${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ' UTC')}]: Block notification error buidling (${source})\n`, err);
      return;
    }
    try {
      appService.sendMessage('new_block', JSON.stringify(block));
    } catch (err) {
      console.error(`[${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ' UTC')}]: Block notification error (${source})\n`, err);
    }
  });

  notifications.subscribe('delegation', async (err, delegation: Delegation, source: string = 'tango.jsonrpc-server') => {
    if (err) {
      console.error(`[${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ' UTC')}]: Delegation notification error building (${source})\n`, err);
      return;
    }
    try {
      appService.sendMessage('new_delegation', JSON.stringify(delegation));
    } catch (err) {
      console.error(`[${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ' UTC')}]: Delegation notification error (${source})\n`, err);
    }
  })

  notifications.subscribe('payment', async (err, payment: Payment, source: string = 'tango.jsonrpc-server') => {
    if (err) {
      console.error(`[${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ' UTC')}]: Payments notification error building (${source})\n`, err);
      return;
    }
    try {
      appService.sendMessage('new_payment', JSON.stringify(payment));
    } catch (err) {
      console.error(`[${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ' UTC')}]: Payments notification error (${source})\n`, err);
    }
  });

  notifications.subscribe('transaction', async (err, tx: Transaction, source: string = 'tango.jsonrpc-server') => {
    if (err) {
      console.error(`[${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ' UTC')}]: Transaction notification error building (${source})\n`, err);
      return;
    }
    try {
      appService.sendMessage('new_transaction', JSON.stringify(tx));
    } catch (err) {
      console.error(`[${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ' UTC')}]: Transaction notification error (${source})\n`, err);
    }
  });

  // const points = [{
  //   slot: 62343319,
  //   id: '502830cd35735d119875be39a05a6dea788629e4644caec56b720a8cb0739fa7'
  // }]

  const recoveryPoints = useRecoveryPoints ? await recoveryService.findAll(notificationConfig.ogmios.network) : [];
  const points = recoveryPoints.length > 0 ? recoveryPoints.map(p => ({ slot: p.slot_no, id: p.hash })).sort((a, b) => a.slot - b.slot) : undefined;
  console.log('Starting notifications from:', points || 'chain tip');
  await notifications.start(points);
}
bootstrap();
