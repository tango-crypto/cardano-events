import { BlockDto } from "./block";

export class EpochDto {
    no: number;
    start_time: Date;
    block: BlockDto;
}