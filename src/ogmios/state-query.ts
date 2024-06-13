import { Connection, ConnectionConfig, createConnectionObject, createInteractionContext, getServerHealth, InteractionContext } from '@cardano-ogmios/client'
import { createLedgerStateQueryClient, LedgerStateQueryClient } from '@cardano-ogmios/client/dist/LedgerStateQuery';
import { EraSummary, PointOrOrigin } from '@cardano-ogmios/schema';
import { OgmiosMiniProtocol } from '../models/ogmios/mini-protocol';

export class OgmiosStateQueryClient implements OgmiosMiniProtocol<PointOrOrigin> {
    connection: Connection;
    connectionConfig: ConnectionConfig;
    context: InteractionContext;
    client: LedgerStateQueryClient;

    constructor(connectionConfig: ConnectionConfig) {
        this.connectionConfig = connectionConfig;
        // console.log('Connection:', this.connectionConfig);
        this.connection = createConnectionObject(this.connectionConfig);

    }

    async createClient(point?: PointOrOrigin): Promise<void> {
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
        let options: any = null;
        if (point) {
            options = { point };
        }
        console.log('Conection with options:', options);
        this.client = await createLedgerStateQueryClient(this.context, options);
    }


    async isConnected(): Promise<boolean> {
        return !!this.context && ((await getServerHealth({ connection: this.connection })) as any).connectionStatus == "connected";
    }

    async close() {
        this.client.shutdown();
    }

    async acquire(point: PointOrOrigin): Promise<OgmiosStateQueryClient> {
        await this.client.acquireLedgerState(point);
        return this;
    }

    async getChainTip(): Promise<PointOrOrigin> {
        return this.client.ledgerTip()
    }

    async getEraSummaries(): Promise<EraSummary[]> {
        return this.client.eraSummaries();
    }
}