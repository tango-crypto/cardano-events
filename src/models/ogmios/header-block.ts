// import { BlockProof, BlockSignature, BlockSize, CertifiedVrf, DigestBlake2BBlockBody, OpCert, ProtocolVersion, SoftwareVersion, IssuerSignature, BlockNo, Slot, DigestBlake2BBlockHeader, VerificationKey, IssuerVrfVerificationKey, GenesisVerificationKey, ProtocolMagicId, Epoch } from "@cardano-ogmios/schema";

// export declare type HeaderBlock = BabbageHeader | AlonzoHeader | MaryHeader | AllegraHeader | ShelleyHeader | StandardHeader | EpochBoundaryHeader;

// export interface BabbageHeader {
//     blockHeight: BlockNo;
//     slot: Slot;
//     prevHash: DigestBlake2BBlockHeader;
//     issuerVk: VerificationKey;
//     issuerVrf: IssuerVrfVerificationKey;
//     blockSize: BlockSize;
//     blockHash: DigestBlake2BBlockBody;
//     opCert: OpCert;
//     protocolVersion: ProtocolVersion;
//     signature: IssuerSignature;
//     vrfInput: CertifiedVrf;
// }
// export interface AlonzoHeader {
//     blockHeight: BlockNo;
//     slot: Slot;
//     prevHash: DigestBlake2BBlockHeader;
//     issuerVk: VerificationKey;
//     issuerVrf: IssuerVrfVerificationKey;
//     nonce?: CertifiedVrf;
//     leaderValue: CertifiedVrf;
//     blockSize: BlockSize;
//     blockHash: DigestBlake2BBlockBody;
//     opCert: OpCert;
//     protocolVersion: ProtocolVersion;
//     signature: IssuerSignature;
// }
// export interface MaryHeader {
//     blockHeight: BlockNo;
//     slot: Slot;
//     prevHash: DigestBlake2BBlockHeader;
//     issuerVk: VerificationKey;
//     issuerVrf: IssuerVrfVerificationKey;
//     nonce?: CertifiedVrf;
//     leaderValue: CertifiedVrf;
//     blockSize: BlockSize;
//     blockHash: DigestBlake2BBlockBody;
//     opCert: OpCert;
//     protocolVersion: ProtocolVersion;
//     signature: IssuerSignature;
// }
// export interface AllegraHeader {
//     blockHeight: BlockNo;
//     slot: Slot;
//     prevHash: DigestBlake2BBlockHeader;
//     issuerVk: VerificationKey;
//     issuerVrf: IssuerVrfVerificationKey;
//     nonce?: CertifiedVrf;
//     leaderValue: CertifiedVrf;
//     blockSize: BlockSize;
//     blockHash: DigestBlake2BBlockBody;
//     opCert: OpCert;
//     protocolVersion: ProtocolVersion;
//     signature: IssuerSignature;
// }

// export interface ShelleyHeader {
//     blockHeight: BlockNo;
//     slot: Slot;
//     prevHash: DigestBlake2BBlockHeader;
//     issuerVk: VerificationKey;
//     issuerVrf: IssuerVrfVerificationKey;
//     nonce?: CertifiedVrf;
//     leaderValue: CertifiedVrf;
//     blockSize: BlockSize;
//     blockHash: DigestBlake2BBlockBody;
//     opCert: OpCert;
//     protocolVersion: ProtocolVersion;
//     signature: IssuerSignature;
// }

// export interface StandardHeader {
//     blockHeight: BlockNo;
//     genesisKey: GenesisVerificationKey;
//     prevHash: DigestBlake2BBlockHeader;
//     proof: BlockProof;
//     protocolMagicId: ProtocolMagicId;
//     protocolVersion: ProtocolVersion;
//     signature: BlockSignature;
//     slot: Slot;
//     softwareVersion: SoftwareVersion;
//     blockSize?: BlockSize;
//     opCert?: OpCert;
// }

// export interface EpochBoundaryHeader {
//     blockHeight: BlockNo;
//     epoch: Epoch;
//     prevHash: DigestBlake2BBlockHeader;
//     slot?: Slot;
//     blockSize?: BlockSize;
//     opCert?: OpCert;
//     protocolVersion?: ProtocolVersion;
// }