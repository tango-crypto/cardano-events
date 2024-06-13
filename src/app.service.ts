import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class AppService {

  constructor(
    @Inject("WEBHOOK_SERVICE") private readonly kafkaClient: ClientKafka
  ) {}  

  sendMessage(topic: string, payload: any) {
    this.kafkaClient.emit(topic, payload);
  }

  getHello(): string {
    return 'Hello World!';
  }
}
