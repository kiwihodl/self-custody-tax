/**
 * Bitcoin wallet descriptor parsing and address derivation
 * Supports multisig descriptors (wsh, sh-wsh) for watch-only tracking
 *
 * Uses @bitcoinerlab/descriptors for parsing and address generation
 */

import { DescriptorsFactory } from "@bitcoinerlab/descriptors";
import * as secp256k1 from "@bitcoinerlab/secp256k1";
import { networks } from "bitcoinjs-lib";

// Initialize the descriptors factory with secp256k1
const { Output } = DescriptorsFactory(secp256k1);

// Types
export interface ParsedDescriptor {
  descriptor: string;
  checksum: string;
  scriptType: "p2wsh" | "p2sh-p2wsh" | "p2sh" | "p2wpkh" | "p2pkh";
  isMultisig: boolean;
  quorum?: {
    required: number;
    total: number;
  };
  xpubs: XpubInfo[];
  network: "mainnet" | "testnet";
}

export interface XpubInfo {
  fingerprint: string;
  derivationPath: string;
  xpub: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  parsed?: ParsedDescriptor;
}

export interface MultisigConfig {
  descriptor: string;
  quorum_required: number;
  total_keys: number;
  address_type: string;
  xpubs: XpubInfo[];
}

// Descriptor checksum character set
const CHECKSUM_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

/**
 * Calculate descriptor checksum (BIP-380)
 */
function calculateChecksum(descriptor: string): string {
  const INPUT_CHARSET =
    "0123456789()[],'/*abcdefgh@:$%{}IJKLMNOPQRSTUVWXYZ&+-.;<=>?!^_|~ijklmnopqrstuvwxyzABCDEFGH`#\"\\ ";

  function polymod(c: number, v: number): number {
    const c0 = c >> 35;
    c = ((c & 0x7ffffffff) << 5) ^ v;
    if (c0 & 1) c ^= 0xf5dee51989;
    if (c0 & 2) c ^= 0xa9fdca3312;
    if (c0 & 4) c ^= 0x1bab10e32d;
    if (c0 & 8) c ^= 0x3706b1677a;
    if (c0 & 16) c ^= 0x644d626ffd;
    return c;
  }

  let c = 1;
  let cls = 0;
  let clscount = 0;

  for (const ch of descriptor) {
    const pos = INPUT_CHARSET.indexOf(ch);
    if (pos === -1) return "";
    c = polymod(c, pos & 31);
    cls = cls * 3 + (pos >> 5);
    clscount++;
    if (clscount === 3) {
      c = polymod(c, cls);
      cls = 0;
      clscount = 0;
    }
  }

  if (clscount > 0) c = polymod(c, cls);
  for (let i = 0; i < 8; i++) c = polymod(c, 0);
  c ^= 1;

  let checksum = "";
  for (let i = 0; i < 8; i++) {
    checksum = CHECKSUM_CHARSET[(c >> (5 * (7 - i))) & 31] + checksum;
  }

  return checksum.split("").reverse().join("");
}

/**
 * Extract key origin info from a key string
 * Format: [fingerprint/path]xpub...
 */
function parseKeyOrigin(keyStr: string): XpubInfo | null {
  // Match [fingerprint/derivation/path]xpub...
  const match = keyStr.match(/\[([a-fA-F0-9]{8})([^\]]*)\]([xyz]pub[a-zA-Z0-9]+)/);
  if (!match) {
    // Try without brackets (bare xpub)
    const xpubMatch = keyStr.match(/([xyz]pub[a-zA-Z0-9]+)/);
    if (xpubMatch) {
      return {
        fingerprint: "00000000",
        derivationPath: "",
        xpub: xpubMatch[1],
      };
    }
    return null;
  }

  return {
    fingerprint: match[1].toLowerCase(),
    derivationPath: match[2] || "",
    xpub: match[3],
  };
}

/**
 * Parse a wallet descriptor and extract all information
 */
export function parseDescriptor(descriptorInput: string): ParsedDescriptor {
  let descriptor = descriptorInput.trim();
  let checksum = "";

  // Handle checksum
  const hashIndex = descriptor.lastIndexOf("#");
  if (hashIndex !== -1) {
    checksum = descriptor.slice(hashIndex + 1);
    descriptor = descriptor.slice(0, hashIndex);
  }

  // Detect script type
  let scriptType: ParsedDescriptor["scriptType"] = "p2wpkh";
  if (descriptor.startsWith("wsh(")) {
    scriptType = "p2wsh";
  } else if (descriptor.startsWith("sh(wsh(")) {
    scriptType = "p2sh-p2wsh";
  } else if (descriptor.startsWith("sh(")) {
    scriptType = "p2sh";
  } else if (descriptor.startsWith("wpkh(")) {
    scriptType = "p2wpkh";
  } else if (descriptor.startsWith("pkh(")) {
    scriptType = "p2pkh";
  }

  // Detect multisig
  const isMultisig = descriptor.includes("multi(") || descriptor.includes("sortedmulti(");
  let quorum: ParsedDescriptor["quorum"] = undefined;

  if (isMultisig) {
    // Extract quorum: multi(2, ...) or sortedmulti(2, ...)
    const quorumMatch = descriptor.match(/(?:sorted)?multi\((\d+)/);
    if (quorumMatch) {
      const required = parseInt(quorumMatch[1], 10);
      // Count xpubs to get total
      const xpubMatches = descriptor.match(/\[[^\]]+\][xyz]pub[a-zA-Z0-9]+|[xyz]pub[a-zA-Z0-9]+/g);
      const total = xpubMatches ? xpubMatches.length : 0;
      quorum = { required, total };
    }
  }

  // Extract all xpubs
  const xpubRegex = /\[[^\]]+\][xyz]pub[a-zA-Z0-9]+|[xyz]pub[a-zA-Z0-9]+/g;
  const xpubMatches = descriptor.match(xpubRegex) || [];
  const xpubs: XpubInfo[] = [];

  for (const match of xpubMatches) {
    const parsed = parseKeyOrigin(match);
    if (parsed) {
      xpubs.push(parsed);
    }
  }

  // Detect network (mainnet vs testnet)
  const network = descriptor.includes("tpub") || descriptor.includes("vpub") || descriptor.includes("upub")
    ? "testnet"
    : "mainnet";

  return {
    descriptor: hashIndex !== -1 ? descriptorInput : `${descriptor}#${calculateChecksum(descriptor)}`,
    checksum: checksum || calculateChecksum(descriptor),
    scriptType,
    isMultisig,
    quorum,
    xpubs,
    network,
  };
}

/**
 * Validate a descriptor string
 */
export function validateDescriptor(descriptorInput: string): ValidationResult {
  try {
    const descriptor = descriptorInput.trim();

    // Check for empty
    if (!descriptor) {
      return { valid: false, error: "Descriptor is empty" };
    }

    // Check for valid script types
    const validPrefixes = ["wsh(", "sh(", "wpkh(", "pkh(", "tr("];
    if (!validPrefixes.some((p) => descriptor.startsWith(p))) {
      return { valid: false, error: "Invalid descriptor format. Must start with wsh(, sh(, wpkh(, pkh(, or tr(" };
    }

    // Check for checksum (we'll validate later with library, checksum is informational)
    const hashIndex = descriptor.lastIndexOf("#");

    // Parse and validate structure
    const parsed = parseDescriptor(descriptor);

    // For multisig, ensure we have the right number of keys
    if (parsed.isMultisig && parsed.quorum) {
      if (parsed.xpubs.length !== parsed.quorum.total) {
        return {
          valid: false,
          error: `Quorum mismatch: found ${parsed.xpubs.length} keys but descriptor specifies ${parsed.quorum.total}`,
        };
      }
      if (parsed.quorum.required > parsed.quorum.total) {
        return {
          valid: false,
          error: `Invalid quorum: ${parsed.quorum.required}-of-${parsed.quorum.total}`,
        };
      }
    }

    // Validate xpubs
    for (const xpub of parsed.xpubs) {
      if (!xpub.xpub.match(/^[xyz]pub[a-zA-Z0-9]{100,}$/)) {
        return { valid: false, error: `Invalid xpub format: ${xpub.xpub.slice(0, 20)}...` };
      }
    }

    // Try to create Output object to verify descriptor is fully valid
    try {
      let testDescriptor = hashIndex !== -1 ? descriptor.slice(0, hashIndex) : descriptor;

      // For ranged descriptors, replace wildcards with index 0 for validation
      // Handle multipath notation <0;1> and wildcard /*
      if (testDescriptor.includes("/<0;1>/*") || testDescriptor.includes("<0;1>")) {
        testDescriptor = testDescriptor.replace(/<0;1>/g, "0");
      }
      if (testDescriptor.includes("/*")) {
        testDescriptor = testDescriptor.replace(/\/\*/g, "/0");
      }

      const output = new Output({
        descriptor: testDescriptor,
        network: parsed.network === "testnet" ? networks.testnet : networks.bitcoin,
      });
      // Try to get first address
      output.getAddress();
    } catch (err) {
      return {
        valid: false,
        error: `Descriptor parsing failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      };
    }

    return { valid: true, parsed };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Invalid descriptor format",
    };
  }
}

/**
 * Derive addresses from a descriptor
 */
export function deriveAddressesFromDescriptor(
  descriptorInput: string,
  count: number = 20,
  includeChange: boolean = true
): string[] {
  const descriptor = descriptorInput.trim();
  const hashIndex = descriptor.lastIndexOf("#");
  const baseDescriptor = hashIndex !== -1 ? descriptor.slice(0, hashIndex) : descriptor;

  const parsed = parseDescriptor(descriptor);
  const addresses: string[] = [];

  // Determine network object for bitcoinjs-lib
  const network = parsed.network === "testnet" ? networks.testnet : networks.bitcoin;

  // Check if descriptor has wildcard derivation
  const hasWildcard = baseDescriptor.includes("/*");
  const hasMultipath = baseDescriptor.includes("/<0;1>/*") || baseDescriptor.includes("<0;1>");

  if (hasWildcard || hasMultipath) {
    // Handle multipath or wildcard descriptors
    let externalDesc = baseDescriptor;
    let changeDesc = baseDescriptor;

    if (hasMultipath) {
      // Replace <0;1> with specific path
      externalDesc = baseDescriptor.replace(/<0;1>/g, "0");
      changeDesc = baseDescriptor.replace(/<0;1>/g, "1");
    }

    // Derive external addresses
    for (let i = 0; i < count; i++) {
      try {
        // Replace ALL wildcards with the same index (multisig has multiple xpubs with /*)
        const indexDesc = externalDesc.replace(/\/\*/g, `/${i}`);
        const output = new Output({ descriptor: indexDesc, network });
        addresses.push(output.getAddress());
      } catch (err) {
        console.warn(`Failed to derive external address ${i}:`, err);
      }
    }

    // Derive change addresses
    if (includeChange) {
      for (let i = 0; i < count; i++) {
        try {
          // Replace ALL wildcards with the same index
          const indexDesc = changeDesc.replace(/\/\*/g, `/${i}`);
          const output = new Output({ descriptor: indexDesc, network });
          addresses.push(output.getAddress());
        } catch (err) {
          console.warn(`Failed to derive change address ${i}:`, err);
        }
      }
    }
  } else {
    // Static descriptor (no derivation) - just get the single address
    try {
      const output = new Output({ descriptor: baseDescriptor, network });
      addresses.push(output.getAddress());
    } catch (err) {
      console.warn(`Failed to get static address:`, err);
    }
  }

  return addresses;
}

/**
 * Get quorum info from descriptor
 */
export function getQuorumInfo(descriptorInput: string): { required: number; total: number } | null {
  const parsed = parseDescriptor(descriptorInput);
  return parsed.quorum || null;
}

/**
 * Extract MultisigConfig for database storage
 */
export function extractMultisigConfig(descriptorInput: string): MultisigConfig | null {
  const validation = validateDescriptor(descriptorInput);
  if (!validation.valid || !validation.parsed) {
    return null;
  }

  const parsed = validation.parsed;
  if (!parsed.isMultisig || !parsed.quorum) {
    return null;
  }

  return {
    descriptor: parsed.descriptor,
    quorum_required: parsed.quorum.required,
    total_keys: parsed.quorum.total,
    address_type: parsed.scriptType,
    xpubs: parsed.xpubs,
  };
}

/**
 * Format quorum for display (e.g., "2/3")
 */
export function formatQuorum(required: number, total: number): string {
  return `${required}/${total}`;
}

// ============================================
// JSON File Parsing (Coldcard, Caravan, etc.)
// ============================================

export interface ColdcardMultisigJSON {
  p2wsh_deriv?: string;
  p2sh_p2wsh_deriv?: string;
  p2sh_deriv?: string;
  xfp: string;  // Master fingerprint
  account: number;
  xpub: string;
  name?: string;
}

export interface CaravanWalletJSON {
  name: string;
  network: string;
  addressType: string;
  quorum: {
    requiredSigners: number;
    totalSigners: number;
  };
  extendedPublicKeys: {
    name: string;
    bip32Path: string;
    xpub: string;
    xfp: string;
  }[];
  startingAddressIndex?: number;
}

export interface MultisigWalletJSON {
  // Generic format that covers most exports
  name?: string;
  m?: number;  // Required signers
  n?: number;  // Total signers
  format?: string;  // p2wsh, p2sh-p2wsh, etc.
  derivation?: string;
  xpubs?: string[];
  keys?: {
    xfp?: string;
    deriv?: string;
    xpub?: string;
  }[];
}

/**
 * Parse Coldcard multisig JSON export
 */
export function parseColdcardJSON(json: ColdcardMultisigJSON): { xpubInfo: XpubInfo; derivPath: string } | null {
  try {
    // Determine derivation path
    let derivPath = "";
    if (json.p2wsh_deriv) {
      derivPath = json.p2wsh_deriv;
    } else if (json.p2sh_p2wsh_deriv) {
      derivPath = json.p2sh_p2wsh_deriv;
    } else if (json.p2sh_deriv) {
      derivPath = json.p2sh_deriv;
    }

    return {
      xpubInfo: {
        fingerprint: json.xfp.toLowerCase(),
        derivationPath: derivPath,
        xpub: json.xpub,
      },
      derivPath,
    };
  } catch {
    return null;
  }
}

/**
 * Parse Caravan/Unchained wallet JSON
 */
export function parseCaravanJSON(json: CaravanWalletJSON): MultisigConfig | null {
  try {
    // Map address type
    let addressType = "p2wsh";
    if (json.addressType === "P2SH-P2WSH" || json.addressType === "P2SH_P2WSH") {
      addressType = "p2sh-p2wsh";
    } else if (json.addressType === "P2SH") {
      addressType = "p2sh";
    }

    // Extract xpubs
    const xpubs: XpubInfo[] = json.extendedPublicKeys.map((key) => ({
      fingerprint: key.xfp.toLowerCase(),
      derivationPath: key.bip32Path,
      xpub: key.xpub,
    }));

    // Build descriptor
    const keysStr = xpubs
      .map((x) => `[${x.fingerprint}${x.derivationPath}]${x.xpub}/<0;1>/*`)
      .join(",");

    let descriptor = "";
    if (addressType === "p2wsh") {
      descriptor = `wsh(sortedmulti(${json.quorum.requiredSigners},${keysStr}))`;
    } else if (addressType === "p2sh-p2wsh") {
      descriptor = `sh(wsh(sortedmulti(${json.quorum.requiredSigners},${keysStr})))`;
    } else {
      descriptor = `sh(sortedmulti(${json.quorum.requiredSigners},${keysStr}))`;
    }

    // Add checksum
    descriptor = `${descriptor}#${calculateChecksum(descriptor)}`;

    return {
      descriptor,
      quorum_required: json.quorum.requiredSigners,
      total_keys: json.quorum.totalSigners,
      address_type: addressType,
      xpubs,
    };
  } catch {
    return null;
  }
}

/**
 * Parse generic multisig wallet JSON (covers most formats)
 */
export function parseGenericMultisigJSON(json: MultisigWalletJSON): MultisigConfig | null {
  try {
    const m = json.m || 2;
    const n = json.n || (json.xpubs?.length || json.keys?.length || 3);

    let xpubs: XpubInfo[] = [];

    if (json.keys && json.keys.length > 0) {
      xpubs = json.keys.map((key) => ({
        fingerprint: (key.xfp || "00000000").toLowerCase(),
        derivationPath: key.deriv || "",
        xpub: key.xpub || "",
      })).filter(x => x.xpub);
    } else if (json.xpubs && json.xpubs.length > 0) {
      xpubs = json.xpubs.map((xpub) => ({
        fingerprint: "00000000",
        derivationPath: json.derivation || "",
        xpub,
      }));
    }

    if (xpubs.length === 0) {
      return null;
    }

    // Determine address type
    let addressType = json.format || "p2wsh";
    addressType = addressType.toLowerCase().replace(/_/g, "-");

    // Build descriptor
    const keysStr = xpubs
      .map((x) => `[${x.fingerprint}${x.derivationPath}]${x.xpub}/<0;1>/*`)
      .join(",");

    let descriptor = "";
    if (addressType === "p2wsh" || addressType === "native-segwit") {
      descriptor = `wsh(sortedmulti(${m},${keysStr}))`;
    } else if (addressType === "p2sh-p2wsh" || addressType === "wrapped-segwit") {
      descriptor = `sh(wsh(sortedmulti(${m},${keysStr})))`;
    } else {
      descriptor = `sh(sortedmulti(${m},${keysStr}))`;
    }

    descriptor = `${descriptor}#${calculateChecksum(descriptor)}`;

    return {
      descriptor,
      quorum_required: m,
      total_keys: n,
      address_type: addressType,
      xpubs,
    };
  } catch {
    return null;
  }
}

/**
 * Auto-detect JSON format and parse accordingly
 */
export function parseMultisigJSON(jsonString: string): MultisigConfig | null {
  try {
    const json = JSON.parse(jsonString);

    // Detect Caravan format (has extendedPublicKeys array)
    if (json.extendedPublicKeys && Array.isArray(json.extendedPublicKeys)) {
      return parseCaravanJSON(json as CaravanWalletJSON);
    }

    // Detect generic format
    if (json.keys || json.xpubs || (json.m !== undefined && json.n !== undefined)) {
      return parseGenericMultisigJSON(json as MultisigWalletJSON);
    }

    // Couldn't detect format
    return null;
  } catch {
    return null;
  }
}
