import AssetFingerprint from '@emurgo/cip14-js';
import * as blake2b from 'blake2b';
import { bech32 } from 'bech32';
import { Address, BaseAddress, ByronAddress, hash_plutus_data, PlutusData, PlutusList, RewardAddress } from '@emurgo/cardano-serialization-lib-nodejs';
import * as crypto from 'crypto';
import { Block, Delegation, Epoch, Transaction } from '@tangocrypto/tango-ledger';
import { Payment } from '../models/payment';

export type EventType = 'epoch' | 'block' | 'delegation' | 'transaction' | 'payment';
export type Message = Transaction | Payment | Delegation | Block | Epoch;

const BLAKE2B_CARDANO_HASH_LENGTH = 28;
const SHELLEY_ERA_POSIX_TIME = 1596491091;
const SHELLEY_ERA_SLOT = 4924800; // why is this 432000 sec bigger than the transiction slot (epoch 209)? 
const SHELLEY_ERA_TRANS_EPOCH = 208;
const SHELLEY_ERA_START_SLOT = 4492800;
const SHELLEY_ERA_SLOT_PER_EPOCH = 432000; // 1 sec slot duration
const BYRON_ERA_SLOT_PER_EPOCH = 21600; // 20 sec slot duration
// const SHELLEY_ERA_POSIX_TIME_TESTNET = 1595967616;
// const SHELLEY_ERA_SLOT_TESTNET = 1598400;
// const SHELLEY_ERA_SLOT_PER_EPOCH_TESTNET = 432000;
// const BYRON_ERA_SLOT_PER_EPOCH_TESTNET = 21600;
const SHELLEY_ERA_POSIX_TIME_TESTNET = 1655769600; // preprod
const SHELLEY_ERA_SLOT_TESTNET = 86400;// preprod
const SHELLEY_ERA_TRANS_EPOCH_TESTNET = 4;
const SHELLEY_ERA_START_SLOT_TESTNET = 86400;
const SHELLEY_ERA_SLOT_PER_EPOCH_TESTNET = 432000; // preprod
const BYRON_ERA_SLOT_PER_EPOCH_TESTNET = 21600; // preprod

const CIP68_REFERENCE_PREFIX = '000643b0';
const CIP68_NFT_PREFIX = '000de140';
const CIP68_FT_PREFIX = '0014de40';
const CIP68_STANDARD: { [key: string]: number } = {
  [CIP68_REFERENCE_PREFIX]: 100, // Reference Token
  [CIP68_NFT_PREFIX]: 222, // NFT Token
  [CIP68_FT_PREFIX]: 333, // FT token
}
const UNPRINTABLE_CHARACTERS_REGEXP = /[\p{Cc}\p{Cn}\p{Cs}]+/gu;

export function getPoolHash(issuerVk: string, bech = true): string {
  const id = blake2b(BLAKE2B_CARDANO_HASH_LENGTH).update(Buffer.from(issuerVk, 'hex')).digest('hex')
  return bech ? bech32.encode('pool', bech32.toWords(Buffer.from(id, 'hex'))) : id;
}

export function slotToTime(slot: number, network = 'mainnet'): Date {
  const startTime = network == 'testnet' ? SHELLEY_ERA_POSIX_TIME_TESTNET : SHELLEY_ERA_POSIX_TIME;
  const startSlot = network == 'testnet' ? SHELLEY_ERA_SLOT_TESTNET : SHELLEY_ERA_SLOT;
  return new Date((startTime + (slot - startSlot)) * 1000)
}

export function slotToEpoch(slot: number, network = 'mainnet'): number {
  const shelleyStartSlot = network == 'testnet' ? SHELLEY_ERA_START_SLOT_TESTNET : SHELLEY_ERA_START_SLOT;
  const shelleySlotPerEpoch = network == 'testnet' ? SHELLEY_ERA_SLOT_PER_EPOCH_TESTNET : SHELLEY_ERA_SLOT_PER_EPOCH;
  const byronSlotPerEpoch = network == 'testnet' ? BYRON_ERA_SLOT_PER_EPOCH_TESTNET : BYRON_ERA_SLOT_PER_EPOCH;
  const shelleySlots = Math.max(slot - shelleyStartSlot, 0);
  const byronSlots = slot - shelleySlots;
  // let a = 208 + (84906565 - (208 * 21600)) / 432000
  return Math.floor(byronSlots / byronSlotPerEpoch) + Math.floor(shelleySlots / shelleySlotPerEpoch);
}

export function slotInEpoch(slot: number, network = 'mainnet'): number {
  const shelleyStartSlot = network == 'testnet' ? SHELLEY_ERA_START_SLOT_TESTNET : SHELLEY_ERA_START_SLOT;
  const shelleySlotPerEpoch = network == 'testnet' ? SHELLEY_ERA_SLOT_PER_EPOCH_TESTNET : SHELLEY_ERA_SLOT_PER_EPOCH;
  const byronSlotPerEpoch = network == 'testnet' ? BYRON_ERA_SLOT_PER_EPOCH_TESTNET : BYRON_ERA_SLOT_PER_EPOCH;
  return slot > shelleyStartSlot ? (slot - shelleyStartSlot) % shelleySlotPerEpoch : slot % byronSlotPerEpoch;
}

export function reverseMetadata(data: any, type = 'object'): any {
  if (!data) {
    return null;
  }
  const metadata: any = type == 'object' ? {} : [];
  const keys = Object.keys(data);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const index = parseInt(key);
    metadata[index] = reverseMetadataObject(data[key]);
  }
  return metadata;
}

export function reverseMetadataObject(data: any): any {
  const result = [];
  const keys = Object.keys(data);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = data[key];
    if (key == 'string') {
      result.push(value);
    } else if (key == 'int') {
      result.push(parseInt(BigInt(value).toString()));
    } else if (key == 'bytes') {
      result.push(value);
    } else if (key == 'list') {
      result.push(value.map((d: any) => reverseMetadataObject(d)));
    } else if (key == 'map') {
      const map = value.reduce((acc: any, obj: any) => {
        const k = reverseMetadataObject(obj['k']);
        const v = reverseMetadataObject(obj['v']);
        acc[k] = v;
        return acc;
      }, {});
      result.push(map);
    } else {
      result.push(null);
    }
  }
  return result.length == 1 ? result[0] : result;
}

export function plutusDataToJson(data: PlutusData): any {
  const kind = data.kind();
  if (kind === 0) { // constr
    const ctrData = data.as_constr_plutus_data();
    const alternative = ctrData.alternative();
    const ctrIndex = toNum(alternative.to_str());
    const plist = ctrData.data();
    const list = PlutusData.new_list(plist);
    const fields = plutusDataToJson(list);
    ctrData.free();
    alternative.free();
    plist.free();
    list.free()
    return {
      constructor: ctrIndex,
      fields: fields
    }
  } else if (kind === 1) { // map
    const map = data.as_map()!;
    const keys = map.keys();
    const length = map.len();
    const result: any = {};
    for (let i = 0; i < length; i++) {
      const key = keys.get(i)
      const value = map.get(key);
      result[plutusDataToJson(key)] = plutusDataToJson(value);
      key.free();
      value.free();
    }
    map.free();
    keys.free()
    return result;
  } else if (kind === 2) { // list
    const list = data.as_list();
    const length = list.len();
    const result = Array(length);
    for (let i = 0; i < length; i++) {
      const item = list.get(i);
      result[i] = plutusDataToJson(item);
      item.free();
    }
    list.free();
    return result;
  } else if (kind === 3) { // integer
    const bigInt = data.as_integer();
    const result = toNum(bigInt.to_str());
    bigInt.free();
    return result;
  } else if (kind === 4) { // string
    const strHex = toHex(data.as_bytes());
    const { text, utf8 } = isPrintableUtf8(strHex);
    return utf8 ? text : strHex;
  }
  throw new Error("Unsupported type");
}

function toNum(data: string): number {
  return parseInt(BigInt(data).toString());
}

function toUtf8(data: string): string {
  return new TextDecoder(undefined, { fatal: true }).decode(
    fromHex(data),
  );
}

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

function fromHex(string: string): Buffer {
  return Buffer.from(string, 'hex');
}

export function assetFingerprint(policy: string, asset_name: string, encoding: BufferEncoding = 'hex'): string {
  return AssetFingerprint.fromParts(Buffer.from(policy, 'hex'), Buffer.from(asset_name, encoding)).fingerprint();
}

export function isPrintableUtf8(text: string, encoding: BufferEncoding = 'hex'): { utf8: boolean, text: string } {
  try {
    const t = Buffer.from(text, encoding).toString('utf8');
    return { utf8: !UNPRINTABLE_CHARACTERS_REGEXP.test(t), text: t };
  } catch (error) {
    return { utf8: false, text }
  }
}

export function convertAssetName(asset_name: string, encoding: BufferEncoding = 'hex'): { asset_name: string, asset_name_label: number } {
  const result: any = {};
  if (!asset_name) return result;
  const asset_name_label = CIP68_STANDARD[asset_name.substring(0, 8)];
  const real_asset_name = asset_name_label ? asset_name.substring(8) : asset_name;
  if (asset_name_label) {
    result.asset_name_label = asset_name_label;
  }
  const { utf8, text } = isPrintableUtf8(real_asset_name, encoding);
  result.asset_name = utf8 ? text : real_asset_name;
  return result;
}

export function getAddress(address: Address): string {
  try {
    return address.to_bech32();
  } catch (err) {
    // console.log('Error getting address bech32, trying byron base58:', err)
    const byronAddress = ByronAddress.from_address(address);
    const result = byronAddress.to_base58();
    byronAddress.free();
    return result;
  }
}

export function getStakeAddress(address: string): string | null {
  const resources = [];
  try {
    let stakeAddr = null;
    const addr = Address.from_bech32(address);
    resources.push(addr);
    const baseAddr = BaseAddress.from_address(addr);
    if (baseAddr) {
      resources.push(baseAddr);
      const stakeCredential = baseAddr.stake_cred();
      resources.push(stakeCredential);
      const reward = RewardAddress.new(addr.network_id(), stakeCredential);
      resources.push(reward);
      const address = reward.to_address();
      resources.push(address);
      stakeAddr = address.to_bech32();
    }
    return stakeAddr;
  } catch (err) {
    return null;
  } finally {
    for (const r of resources) {
      r.free();
    }
  }
}

export function buildPlutusDataMap(plutusData: PlutusList): { [key: string]: { value_raw: string, value: any } } {
  const map: { [key: string]: { value_raw: string, value: any } } = {};
  const length = plutusData.len();
  for (let i = 0; i < length; i++) {
    const data = plutusData.get(i);
    const value = plutusDataToJson(data);
    const hashValue = data.to_hex();
    const dataHash = hash_plutus_data(data);
    data.free();
    const hash = dataHash.to_hex();
    dataHash.free();
    map[hash] = { value_raw: hashValue, value };
  }
  return map;
}

export function getRandomUUID(replaceHyphen = true): string {
  const uuid = crypto.randomUUID();
  return replaceHyphen ? uuid.replace(/-/g, '') : uuid;
}

export const isEpochMessage = (m: Message): m is Epoch => (m as any).no != undefined
export const isBlockMessage = (m: Message): m is Block => (m as any).block_no != undefined
export const isDelegationMessage = (m: Message): m is Delegation => (m as any).pool_hash_id != undefined
export const isTransactionMessage = (m: Message): m is Transaction => (m as any).fee != undefined
export const isPaymentMessage = (m: Message): m is Payment => (m as any).fee != undefined
