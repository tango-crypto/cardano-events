import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { NotificationManager } from './notification-manager';
import { Transaction, Delegation, Block, Epoch } from '@tangocrypto/tango-ledger';
import { Payment } from './models/payment';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);
  const appService = app.get(AppService);

  const notificationConfig: any = {};

  if (configService.get<string>('NOTIFY_OGMIOS') == 'true') {
    notificationConfig.ogmios = {
      host: configService.get<string>('OGMIOS_HOST') || 'localhost',
      port: parseInt(configService.get<string>('OGMIOS_PORT')) || 1337,
      tls: configService.get<string>('OGMIOS_TLS') == 'true',
      events: configService.get<string>('OGMIOS_EVENTS'),
      network: configService.get<string>('NETWORK')
    }
  }

  let notifications = new NotificationManager(notificationConfig);

  notifications.subscribe('epoch', async (err, epoch: Epoch, source: string = 'tango.jsonrpc-server') => {
    if (err) {
      console.error(`[${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ' UTC')}]: Epoch notification error building (${source})\n`, err);
      return;
    }
    try {
      // await publisher.send('epoch', epoch, source, network);
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
      console.log('Sending new block ...');
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
      // await publisher.send('delegation', delegation, source, network);
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
      // console.log('payment', JSON.stringify(payment, null, 2));

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
      console.log('New Transaction:', JSON.stringify(tx, null, 2));
    } catch (err) {
      console.error(`[${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ' UTC')}]: Transaction notification error (${source})\n`, err);
    }
  });

  // const points = [{
  //   slot: 62343319,
  //   id: '502830cd35735d119875be39a05a6dea788629e4644caec56b720a8cb0739fa7'
  // }]
  await notifications.start();
  console.log('Starting notifications...');
}
bootstrap();
