import { PointOrOrigin } from '@cardano-ogmios/schema';
import { PostgresClient } from '@tangocrypto/tango-ledger';
import { OgmiosChainSyncClient } from './ogmios/chain-sync';
import { OgmiosManager } from './ogmios/manager';
import { RecoveryService } from './scylla/recovery.service';

export class NotificationManager {
	config: any;
	dbClient: PostgresClient;
	ogmiosManager: OgmiosManager;
	subscriptions: Map<string, { callback: (error: any, data: any, source?: string) => void }>;
	ogmiosEvents: Map<string, boolean>;

	constructor(config: any, recoveryService: RecoveryService) {
		this.config = config;
		this.subscriptions = new Map<string, { callback: (error: any, data: any) => void }>();

		// Ogmios Manager initialization
		this.ogmiosEvents = new Map()
		if (this.config.ogmios) {
			for(const event of this.config.ogmios.events.trim().split(',')) {
				this.ogmiosEvents.set(event, true);
			}
			this.ogmiosManager = new OgmiosManager(this.config.ogmios, recoveryService, this.dbClient);
		}
	}

	async start(points?: PointOrOrigin[], inFlight?: number) {
		if (this.ogmiosManager) {
			await this.ogmiosManager.startChainSync(this.ogmiosEvents, this.subscriptions, points, inFlight);
		}
	}

	subscribe(event: string, callback: (error: any, data: any, source?: string) => void) {
		this.subscriptions.set(event, { callback: callback });
	}
}
