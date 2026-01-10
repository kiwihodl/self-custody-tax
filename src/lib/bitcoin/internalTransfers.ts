/**
 * Internal Transfer Detection
 *
 * Detects and links transactions that are transfers between
 * the user's own wallets (not taxable events).
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { deriveAddressesFromXpub } from "./derivation";
import { deriveAddressesFromDescriptor } from "./descriptors";
import type { Wallet, Transaction } from "@/types";

const DERIVATION_DEPTH = 20; // Check first 20 addresses per wallet

/**
 * Get all addresses owned by a user across all their wallets
 */
export async function getAllUserAddresses(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const addresses = new Set<string>();

  // Get all user's wallets
  const { data: wallets } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .eq("is_deleted", false);

  if (!wallets) return addresses;

  for (const wallet of wallets as Wallet[]) {
    // Single address
    if (wallet.address) {
      addresses.add(wallet.address.toLowerCase());
    }

    // xpub - derive addresses
    if (wallet.xpub && !wallet.multisig_config) {
      try {
        const derived = deriveAddressesFromXpub(wallet.xpub, DERIVATION_DEPTH, true);
        derived.forEach(addr => addresses.add(addr.toLowerCase()));
      } catch (err) {
        console.warn(`Failed to derive addresses from xpub for wallet ${wallet.id}:`, err);
      }
    }

    // Multisig descriptor - derive addresses
    if (wallet.multisig_config?.descriptor) {
      try {
        const derived = deriveAddressesFromDescriptor(
          wallet.multisig_config.descriptor,
          DERIVATION_DEPTH,
          true
        );
        derived.forEach(addr => addresses.add(addr.toLowerCase()));
      } catch (err) {
        console.warn(`Failed to derive addresses from descriptor for wallet ${wallet.id}:`, err);
      }
    }
  }

  return addresses;
}

/**
 * Check if a transaction is an internal transfer
 * (all inputs and relevant outputs belong to user)
 */
export function isInternalTransfer(
  tx: Transaction,
  userAddresses: Set<string>
): boolean {
  // For Bitcoin transactions with UTXO data
  if (tx.inputs && tx.outputs) {
    // Check if ALL inputs are from user's addresses
    const allInputsOurs = tx.inputs.every(
      (input: { address?: string }) =>
        input.address && userAddresses.has(input.address.toLowerCase())
    );

    if (!allInputsOurs) return false;

    // If all inputs are ours and all outputs are ours, it's internal
    const allOutputsOurs = tx.outputs.every(
      (output: { address?: string }) =>
        output.address && userAddresses.has(output.address.toLowerCase())
    );

    if (allOutputsOurs) return true;

    // If inputs are ours but some outputs aren't, it's a send (not internal)
    // Unless ALL non-user outputs are dust (< 546 sats), treat as internal
    return false;
  }

  // For Ethereum transactions
  if (tx.from_address && tx.to_address) {
    const fromOurs = userAddresses.has(tx.from_address.toLowerCase());
    const toOurs = userAddresses.has(tx.to_address.toLowerCase());
    return fromOurs && toOurs;
  }

  return false;
}

/**
 * Find matching receive transaction for a send transaction
 * (Same blockchain txid, different wallet)
 */
export async function findLinkedTransaction(
  supabase: SupabaseClient,
  userId: string,
  txid: string,
  excludeWalletId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("txid", txid)
    .neq("wallet_id", excludeWalletId)
    .limit(1)
    .single();

  return data?.id || null;
}

/**
 * Detect and mark internal transfers for a user
 * Returns count of transfers detected
 */
export async function detectInternalTransfers(
  supabase: SupabaseClient,
  userId: string
): Promise<{ detected: number; linked: number }> {
  // Get all user addresses
  const userAddresses = await getAllUserAddresses(supabase, userId);

  if (userAddresses.size === 0) {
    return { detected: 0, linked: 0 };
  }

  // Get all user transactions that aren't already marked as internal
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_internal_transfer", false);

  if (!transactions || transactions.length === 0) {
    return { detected: 0, linked: 0 };
  }

  let detected = 0;
  let linked = 0;

  for (const tx of transactions as Transaction[]) {
    if (isInternalTransfer(tx, userAddresses)) {
      // Mark as internal transfer
      await supabase
        .from("transactions")
        .update({
          is_internal_transfer: true,
          category: "internal",
        })
        .eq("id", tx.id);

      detected++;

      // Try to find and link the matching transaction
      const linkedTxId = await findLinkedTransaction(
        supabase,
        userId,
        tx.txid,
        tx.wallet_id
      );

      if (linkedTxId) {
        // Link both transactions to each other
        await supabase
          .from("transactions")
          .update({ linked_transaction_id: linkedTxId })
          .eq("id", tx.id);

        await supabase
          .from("transactions")
          .update({
            linked_transaction_id: tx.id,
            is_internal_transfer: true,
            category: "internal",
          })
          .eq("id", linkedTxId);

        linked++;
      }
    }
  }

  return { detected, linked };
}

/**
 * Manually link two transactions as internal transfer pair
 */
export async function linkTransactions(
  supabase: SupabaseClient,
  userId: string,
  txId1: string,
  txId2: string
): Promise<boolean> {
  // Verify both transactions belong to user
  const { data: txs } = await supabase
    .from("transactions")
    .select("id, txid, user_id")
    .eq("user_id", userId)
    .in("id", [txId1, txId2]);

  if (!txs || txs.length !== 2) {
    return false;
  }

  // Link them to each other
  await supabase
    .from("transactions")
    .update({
      linked_transaction_id: txId2,
      is_internal_transfer: true,
      category: "internal",
    })
    .eq("id", txId1);

  await supabase
    .from("transactions")
    .update({
      linked_transaction_id: txId1,
      is_internal_transfer: true,
      category: "internal",
    })
    .eq("id", txId2);

  return true;
}

/**
 * Unlink a transaction pair and restore original category
 */
export async function unlinkTransactions(
  supabase: SupabaseClient,
  userId: string,
  txId: string
): Promise<boolean> {
  // Get the transaction and its linked partner
  const { data: tx } = await supabase
    .from("transactions")
    .select("id, linked_transaction_id, user_id")
    .eq("id", txId)
    .eq("user_id", userId)
    .single();

  if (!tx) return false;

  // Clear link and reset category
  await supabase
    .from("transactions")
    .update({
      linked_transaction_id: null,
      is_internal_transfer: false,
      category: "send", // Will need manual recategorization
    })
    .eq("id", txId);

  // Clear the partner's link too
  if (tx.linked_transaction_id) {
    await supabase
      .from("transactions")
      .update({
        linked_transaction_id: null,
        is_internal_transfer: false,
        category: "receive",
      })
      .eq("id", tx.linked_transaction_id);
  }

  return true;
}
