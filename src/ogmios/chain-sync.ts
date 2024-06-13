import { Connection, ConnectionConfig, createChainSynchronizationClient, createConnectionObject, createInteractionContext, getServerHealth, InteractionContext } from '@cardano-ogmios/client'
import { PointOrOrigin } from '@cardano-ogmios/schema';
import { OgmiosMiniProtocol } from '../models/ogmios/mini-protocol';
import { ChainSynchronizationClient, ChainSynchronizationMessageHandlers, Intersection } from '@cardano-ogmios/client/dist/ChainSynchronization';

export class OgmiosChainSyncClient implements OgmiosMiniProtocol<ChainSynchronizationMessageHandlers> {
    connection: Connection;
    connectionConfig: ConnectionConfig;
    context: InteractionContext;
    client: ChainSynchronizationClient;

    constructor(connectionConfig: ConnectionConfig) {
        this.connectionConfig = connectionConfig;
        // console.log('Connection:', this.connectionConfig);
        this.connection = createConnectionObject(this.connectionConfig);
    }

    async createClient(handler: ChainSynchronizationMessageHandlers): Promise<void> {
        this.context = await createInteractionContext(
            err => {
                this.context = null;
                console.error('Connection error', err);
            },
            (code: number, reason: string) => {
                this.context = null;
                console.log(`Connection closed. Code: ${code}, Reason: ${reason}`);
            },
            { connection: this.connectionConfig }
        );
        this.client = await createChainSynchronizationClient(this.context, handler);
    }

    async isConnected(): Promise<boolean> {
        return !!this.context && ((await getServerHealth({ connection: this.connection })) as any).connectionStatus == "connected";
    }

    async close(): Promise<void> {
        await this.client.shutdown();
    }
    
    async start(points?: PointOrOrigin[], inFlight?: number): Promise<Intersection> {
        return this.client.resume(points, inFlight);
    }
}