import { Transaction, Utxo } from '@tangocrypto/tango-ledger';
import { TransactionDto, UtxoDto } from './transaction';
export interface Payment {
	transaction: Transaction | TransactionDto;
	inputs: Utxo[] | UtxoDto[] | { hash: string, index: number }[];
	outputs: Utxo[] | UtxoDto[];
}