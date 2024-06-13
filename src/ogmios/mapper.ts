import { BlockDto } from "../models/block";
import { Block, PointOrOrigin, TipOrOrigin } from '@cardano-ogmios/schema';

export class Mapper {
    mappings: { [key:string]: MapperBuilder };

    constructor() {
        this.mappings = {};
    }

    createMap<T>(source: any, destination: any): MapperBuilder {
        const builder = new MapperBuilder(source, destination);
        this.mappings[`${source.name}->${destination.name}`] = builder;
        return builder;
    }

    map(source: any, destination: any, obj: any) {
        const builder = this.mappings[`${source.name}->${destination.name}`];
        if (!builder) return null;
        let result: any = Reflect.construct(destination, []);
        const dest = Reflect.ownKeys(result).reduce((dict: any, prop: any) => {
            dict[prop] = prop;
            return dict;
        }, {});
        builder.mapInstructions.forEach(({ selector, memberMapFunction }) => {
            const srcValue = memberMapFunction(obj);
            const propName = selector(dest);
            result[`${propName}`] = srcValue;
        });

        return result;
    }

    mapArray(source: any, destination: any, items: any[]) {
        return items.map(obj => this.map(source, destination, obj));
    }
}

class MapperBuilder {
    src: any;
    dest: any;
    mapInstructions: any[];

    constructor(src: any, dest: any) {
        this.src = src;
        this.dest = dest;
        this.mapInstructions = [];
    }

    forMember(selector: any, memberMapFunction: any) {
        this.mapInstructions.push({selector, memberMapFunction});
        return this;
    }
}

function mapFrom(lambda: (attr: any) => void) {
    return (src: any) => lambda(src);
}

function fromValue(v: any) {
    return () => v;
}

function ignore() {
    return () => {};
}

function mapDefer(lambda: (attr: any) => (args: any) => void) {
    return (src: any) => lambda(src)(src);
}


class BlockMappingProfile {
    mapProfile(mapper: Mapper) {
        // mapper.createMap(BlockBabbage, BlockDto)
        // .forMember(dest => dest.account_id, mapFrom(src => src.account_id))
        // .forMember(dest => dest.subscription_id, mapFrom(src => src.subscription_id))
        // .forMember(dest => dest.name, mapFrom(src => src.name))
        // .forMember(dest => dest.available, mapFrom(src => src.available))
        // .forMember(dest => dest.currency, mapFrom(src => src.currency))
        // .forMember(dest => dest.price, mapFrom(src => Number(src.price)))
        // .forMember(dest => dest.tier, mapFrom(src => src.tier))
        // .forMember(dest => dest.api_key_hash, ignore())
        // .forMember(dest => dest.applications_count, mapFrom(src => Number(src.applications_count)))
        // .forMember(dest => dest.webhook_auth_token, mapFrom(src => src.webhook_auth_token))
        // .forMember(dest => dest.webhooks_active, mapFrom(src => src.webhooks_active))
        // .forMember(dest => dest.webhooks_count, mapFrom(src => Number(src.webhooks_count)))
        // .forMember(dest => dest.end_date, mapFrom(src => Number(src.end_date)))
        // .forMember(dest => dest.start_date, mapFrom(src => new Date(Number(src.start_date)).toISOString()));
    }
}