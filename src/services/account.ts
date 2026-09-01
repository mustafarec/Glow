import type { SupabaseClient } from '@supabase/supabase-js';

import type { CreditTransaction, CreditWallet } from '@/domain/types';

export interface CreditAccount {
  wallet: CreditWallet;
  creditTransactions: CreditTransaction[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readInteger(value: unknown, field: string, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum) throw new Error(`The account returned an invalid ${field}.`);
  return value;
}

function readWallet(value: unknown): CreditWallet {
  const row = Array.isArray(value) ? value[0] : value;
  const record = asRecord(row);
  if (!record) throw new Error('The account returned no credit balance.');
  return {
    balance: readInteger(record.balance, 'credit balance'),
    lifetimeGranted: readInteger(record.lifetime_granted, 'granted credit total'),
    lifetimeSpent: readInteger(record.lifetime_spent, 'spent credit total'),
  };
}

function readTransactions(value: unknown): CreditTransaction[] {
  if (!Array.isArray(value)) throw new Error('The account returned invalid credit history.');
  return value.map((item) => {
    const record = asRecord(item);
    const type = record?.type;
    if (!record || (type !== 'grant' && type !== 'purchase' && type !== 'reservation' && type !== 'refund')) {
      throw new Error('The account returned invalid credit history.');
    }
    if (typeof record.id !== 'string' || typeof record.label !== 'string' || typeof record.created_at !== 'string') {
      throw new Error('The account returned invalid credit history.');
    }
    if (typeof record.amount !== 'number' || !Number.isInteger(record.amount)) throw new Error('The account returned invalid credit history.');
    return {
      id: record.id,
      type,
      amount: record.amount,
      label: record.label,
      createdAt: record.created_at,
    };
  });
}

export async function loadCreditAccount(client: SupabaseClient): Promise<CreditAccount> {
  const { data: walletData, error: walletError } = await client.rpc('ensure_credit_wallet');
  if (walletError) throw new Error('The account credit balance is unavailable.');

  const { data: transactionData, error: transactionError } = await client
    .from('credit_transactions')
    .select('id, type, amount, label, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (transactionError) throw new Error('The account credit history is unavailable.');

  return { wallet: readWallet(walletData), creditTransactions: readTransactions(transactionData) };
}
