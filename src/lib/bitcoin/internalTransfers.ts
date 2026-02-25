/**
 * Internal Transfer Detection — local-first (IndexedDB)
 */

import { db, type DBTransaction } from "@/lib/db";
import { deriveAddressesFromXpub } from "./derivation";
import { deriveAddressesFromDescriptor } from "./descriptors";

const DERIVATION_DEPTH = 20;

/**
 * Get all addresses across all user wallets
 */
export async function getAllUserAddresses(): Promise<Set<string>> {
  const addresses = new Set<string>();
  const wallets = await db.wallets.where("is_deleted").equals(0).toArray();

  for (const wallet of wallets) {
    if (wallet.address) addresses.add(wallet.address.toLowerCase());

    if (wallet.xpub && !wallet.multisig_config) {
      try {
        deriveAddressesFromXpub(wallet.xpub, DERIVATION_DEPTH, true)
          .forEach((a) => addresses.add(a.toLowerCase()));
      } catch { /* skip */ }
    }

    if (wallet.multisig_config) {
      const config = typeof wallet.multisig_config === "string"
        ? JSON.parse(wallet.multisig_config) : wallet.multisig_config;
      if (config?.descriptor) {
        try {
          deriveAddressesFromDescriptor(config.descriptor, DERIVATION_DEPTH, true)
            .forEach((a) => addresses.add(a.toLowerCase()));
        } catch { /* skip */ }
      }
    }
  }

  return addresses;
}

/**
 * Check if a transaction is internal (all inputs + outputs belong to user)
 */
export function isInternalTransfer(
  tx: DBTransaction,
  userAddresses: Set<string>
): boolean {
  try {
    const inputs = typeof tx.inputs === "string" ? JSON.parse(tx.inputs) : tx.inputs;
    const outputs = typeof tx.outputs === "string" ? JSON.parse(tx.outputs) : tx.outputs;

    if (inputs?.length && outputs?.length) {
      const allInputsOurs = inputs.every(
        (i: { address?: string }) => i.address && userAddresses.has(i.address.toLowerCase())
      );
      if (!allInputsOurs) return false;

      const allOutputsOurs = outputs.every(
        (o: { address?: string }) => o.address && userAddresses.has(o.address.toLowerCase())
      );
      return allOutputsOurs;
    }
  } catch { /* parse error */ }

  return false;
}

/**
 * Detect and mark internal transfers across all wallets
 */
export async function detectInternalTransfers(): Promise<{ detected: number; linked: number }> {
  const userAddresses = await getAllUserAddresses();
  if (userAddresses.size === 0) return { detected: 0, linked: 0 };

  const transactions = await db.transactions
    .filter((tx) => !tx.is_internal_transfer)
    .toArray();

  if (transactions.length === 0) return { detected: 0, linked: 0 };

  let detected = 0;
  let linked = 0;

  for (const tx of transactions) {
    if (isInternalTransfer(tx, userAddresses)) {
      await db.transactions.update(tx.id!, {
        is_internal_transfer: true,
        category: "internal",
        updated_at: new Date().toISOString(),
      });
      detected++;

      // Find linked transaction (same txid, different wallet)
      const linkedTx = await db.transactions
        .where("txid")
        .equals(tx.txid)
        .filter((t) => t.wallet_id !== tx.wallet_id)
        .first();

      if (linkedTx) {
        await db.transactions.update(tx.id!, { linked_transaction_id: linkedTx.id });
        await db.transactions.update(linkedTx.id!, {
          linked_transaction_id: tx.id,
          is_internal_transfer: true,
          category: "internal",
          updated_at: new Date().toISOString(),
        });
        linked++;
      }
    }
  }

  return { detected, linked };
}

/**
 * Manually link two transactions as internal transfer pair
 */
export async function linkTransactions(txId1: number, txId2: number): Promise<boolean> {
  const tx1 = await db.transactions.get(txId1);
  const tx2 = await db.transactions.get(txId2);
  if (!tx1 || !tx2) return false;

  const now = new Date().toISOString();
  await db.transactions.update(txId1, { linked_transaction_id: txId2, is_internal_transfer: true, category: "internal", updated_at: now });
  await db.transactions.update(txId2, { linked_transaction_id: txId1, is_internal_transfer: true, category: "internal", updated_at: now });
  return true;
}

/**
 * Unlink a transaction pair
 */
export async function unlinkTransactions(txId: number): Promise<boolean> {
  const tx = await db.transactions.get(txId);
  if (!tx) return false;

  const now = new Date().toISOString();
  await db.transactions.update(txId, { linked_transaction_id: undefined, is_internal_transfer: false, category: "send", updated_at: now });

  if (tx.linked_transaction_id) {
    await db.transactions.update(tx.linked_transaction_id, { linked_transaction_id: undefined, is_internal_transfer: false, category: "receive", updated_at: now });
  }
  return true;
}
