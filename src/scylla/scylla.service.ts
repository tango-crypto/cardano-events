import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, mapping, auth } from 'cassandra-driver';

@Injectable()
export class ScyllaService {
    client: Client;
    mapper: mapping.Mapper;
    config: any;

    constructor(private configService: ConfigService) {
        this.config = {};
        const keyspace = this.configService.get<string>("SCYLLA_KEYSPACE");
        const contactPoints = this.configService.get<string>("SCYLLA_CONTACT_POINTS");
        const localDataCenter = this.configService.get<string>("SCYLLA_LOCAL_DATA_CENTER");
        if (contactPoints) {
            this.config.contactPoints = JSON.parse(contactPoints);
        }

        if (keyspace) {
            this.config.keyspace = keyspace;
        }

        if (localDataCenter) {
            this.config.localDataCenter = localDataCenter;
        }
    }

    private createClient() {
        this.client = new Client(this.config);
    }

    getClient() {
        return this.client;
    }

    createMapper(mappingOptions: mapping.MappingOptions) {
        if (this.client == undefined) {
            this.createClient();
        }
        return new mapping.Mapper(this.client, mappingOptions);
    }
}