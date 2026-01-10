/**
 * HD Key derivation for Bitcoin xpub/ypub/zpub
 * Uses @scure/bip32 for BIP32 derivation and @scure/btc-signer for address encoding
 */

import { HDKey } from "@scure/bip32";
import { p2pkh, p2sh, p2wpkh } from "@scure/btc-signer";
import { base58check as base58checkCreate } from "@scure/base";
import { sha256 } from "@noble/hashes/sha2.js";

// Create base58check codec with double SHA256 (Bitcoin standard)
const base58check = base58checkCreate(sha256);

// Helper to convert Uint8Array to hex (browser-compatible)
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export type XpubType = "legacy" | "p2sh-segwit" | "native-segwit";

export interface DerivedAddress {
  index: number;
  address: string;
  type: "external" | "change";
  path: string;
}

// SLIP-132 version bytes (4 bytes each)
const VERSION_BYTES: Record<string, { prefix: string; type: XpubType; testnet: boolean }> = {
  // Mainnet
  "0488b21e": { prefix: "xpub", type: "legacy", testnet: false },
  "049d7cb2": { prefix: "ypub", type: "p2sh-segwit", testnet: false },
  "04b24746": { prefix: "zpub", type: "native-segwit", testnet: false },
  // Testnet
  "043587cf": { prefix: "tpub", type: "legacy", testnet: true },
  "044a5262": { prefix: "upub", type: "p2sh-segwit", testnet: true },
  "045f1cf6": { prefix: "vpub", type: "native-segwit", testnet: true },
};

// Standard xpub/tpub version bytes that HDKey understands
const XPUB_VERSION = new Uint8Array([0x04, 0x88, 0xb2, 0x1e]);
const TPUB_VERSION = new Uint8Array([0x04, 0x35, 0x87, 0xcf]);

/**
 * Detect address type and network from xpub prefix
 */
export function detectXpubInfo(xpub: string): { type: XpubType; testnet: boolean } {
  try {
    const decoded = base58check.decode(xpub);
    const versionHex = toHex(decoded.slice(0, 4));
    const info = VERSION_BYTES[versionHex];
    if (info) {
      return { type: info.type, testnet: info.testnet };
    }
  } catch {
    // Fall back to prefix detection
  }

  // Fallback to prefix detection
  if (xpub.startsWith("xpub")) return { type: "legacy", testnet: false };
  if (xpub.startsWith("ypub")) return { type: "p2sh-segwit", testnet: false };
  if (xpub.startsWith("zpub")) return { type: "native-segwit", testnet: false };
  if (xpub.startsWith("tpub")) return { type: "legacy", testnet: true };
  if (xpub.startsWith("upub")) return { type: "p2sh-segwit", testnet: true };
  if (xpub.startsWith("vpub")) return { type: "native-segwit", testnet: true };

  throw new Error(`Unknown xpub format: ${xpub.slice(0, 4)}...`);
}

/**
 * Convert any extended public key (xpub/ypub/zpub/tpub/upub/vpub) to standard xpub/tpub format
 * that HDKey can parse
 */
function convertToStandardXpub(extendedKey: string): { standardKey: string; info: { type: XpubType; testnet: boolean } } {
  const decoded = base58check.decode(extendedKey);
  const versionHex = toHex(decoded.slice(0, 4));
  const info = VERSION_BYTES[versionHex];

  if (!info) {
    throw new Error(`Unknown extended key version: ${versionHex}`);
  }

  // If already standard format, return as-is
  if (info.prefix === "xpub" || info.prefix === "tpub") {
    return { standardKey: extendedKey, info: { type: info.type, testnet: info.testnet } };
  }

  // Convert to standard xpub/tpub format
  const newVersion = info.testnet ? TPUB_VERSION : XPUB_VERSION;
  const newData = new Uint8Array(decoded.length);
  newData.set(newVersion, 0);
  newData.set(decoded.slice(4), 4);

  const standardKey = base58check.encode(newData);
  return { standardKey, info: { type: info.type, testnet: info.testnet } };
}

/**
 * Convert public key to address based on type
 */
function publicKeyToAddress(pubkey: Uint8Array, type: XpubType, testnet: boolean): string {
  // Testnet network config (mainnet is undefined which uses defaults)
  const network = testnet
    ? { bech32: "tb", pubKeyHash: 0x6f, scriptHash: 0xc4, wif: 0xef }
    : undefined;

  switch (type) {
    case "legacy": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = p2pkh(pubkey, network as any);
      return result.address!;
    }
    case "p2sh-segwit": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wpkh = p2wpkh(pubkey, network as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = p2sh(wpkh, network as any);
      return result.address!;
    }
    case "native-segwit": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = p2wpkh(pubkey, network as any);
      return result.address!;
    }
  }
}

/**
 * Validate xpub format and derivability
 */
export function validateXpub(xpub: string): { valid: boolean; error?: string; addressCount?: number } {
  // Check basic format
  const validPrefixes = ["xpub", "ypub", "zpub", "tpub", "upub", "vpub"];
  const prefix = xpub.slice(0, 4);
  if (!validPrefixes.includes(prefix)) {
    return { valid: false, error: `Invalid prefix: ${prefix}. Expected one of: ${validPrefixes.join(", ")}` };
  }

  // Check length
  if (xpub.length < 100 || xpub.length > 120) {
    return { valid: false, error: `Invalid length: ${xpub.length}. Expected ~111 characters.` };
  }

  // Try to parse and derive
  try {
    const { standardKey, info } = convertToStandardXpub(xpub);
    const hdkey = HDKey.fromExtendedKey(standardKey);

    if (!hdkey.publicKey) {
      return { valid: false, error: "Could not extract public key from xpub" };
    }

    // Try deriving first address to verify it works
    const child = hdkey.deriveChild(0).deriveChild(0);
    if (!child.publicKey) {
      return { valid: false, error: "Could not derive child key" };
    }

    // Verify we can generate an address
    const testAddress = publicKeyToAddress(child.publicKey, info.type, info.testnet);
    if (!testAddress) {
      return { valid: false, error: "Could not generate address from derived key" };
    }

    return { valid: true, addressCount: 40 }; // 20 external + 20 change
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Invalid xpub format" };
  }
}

/**
 * Derive addresses from an xpub
 */
export function deriveAddressesFromXpub(
  xpub: string,
  gapLimit: number = 20,
  includeChange: boolean = true
): string[] {
  const { standardKey, info } = convertToStandardXpub(xpub);
  const hdkey = HDKey.fromExtendedKey(standardKey);
  const addresses: string[] = [];

  // External addresses (receiving) - path: m/0/i
  for (let i = 0; i < gapLimit; i++) {
    const child = hdkey.deriveChild(0).deriveChild(i);
    if (child.publicKey) {
      addresses.push(publicKeyToAddress(child.publicKey, info.type, info.testnet));
    }
  }

  // Change addresses - path: m/1/i
  if (includeChange) {
    for (let i = 0; i < gapLimit; i++) {
      const child = hdkey.deriveChild(1).deriveChild(i);
      if (child.publicKey) {
        addresses.push(publicKeyToAddress(child.publicKey, info.type, info.testnet));
      }
    }
  }

  return addresses;
}

/**
 * Derive addresses with detailed metadata
 */
export function deriveAddressesWithMetadata(
  xpub: string,
  gapLimit: number = 20,
  includeChange: boolean = true
): DerivedAddress[] {
  const { standardKey, info } = convertToStandardXpub(xpub);
  const hdkey = HDKey.fromExtendedKey(standardKey);
  const addresses: DerivedAddress[] = [];

  // External addresses (receiving)
  for (let i = 0; i < gapLimit; i++) {
    const child = hdkey.deriveChild(0).deriveChild(i);
    if (child.publicKey) {
      addresses.push({
        index: i,
        address: publicKeyToAddress(child.publicKey, info.type, info.testnet),
        type: "external",
        path: `m/0/${i}`,
      });
    }
  }

  // Change addresses
  if (includeChange) {
    for (let i = 0; i < gapLimit; i++) {
      const child = hdkey.deriveChild(1).deriveChild(i);
      if (child.publicKey) {
        addresses.push({
          index: i,
          address: publicKeyToAddress(child.publicKey, info.type, info.testnet),
          type: "change",
          path: `m/1/${i}`,
        });
      }
    }
  }

  return addresses;
}

/**
 * Get the actual derived address count for an xpub
 */
export function getDerivedAddressCount(xpub: string, gapLimit: number = 20, includeChange: boolean = true): number {
  try {
    const addresses = deriveAddressesFromXpub(xpub, gapLimit, includeChange);
    return addresses.length;
  } catch {
    return 0;
  }
}
