import { CreditWallet } from './types';

export interface CreditResult {
  ok: boolean;
  wallet: CreditWallet;
  reason?: 'insufficient-credits';
}

export function reserveCredits(wallet: CreditWallet, amount: number): CreditResult {
  if (amount <= 0) return { ok: true, wallet };
  if (wallet.balance < amount) return { ok: false, wallet, reason: 'insufficient-credits' };
  return {
    ok: true,
    wallet: {
      ...wallet,
      balance: wallet.balance - amount,
      lifetimeSpent: wallet.lifetimeSpent + amount,
    },
  };
}

export function restoreCredits(wallet: CreditWallet, amount: number): CreditWallet {
  return {
    ...wallet,
    balance: wallet.balance + Math.max(0, amount),
    lifetimeSpent: Math.max(0, wallet.lifetimeSpent - Math.max(0, amount)),
  };
}

export function grantCredits(wallet: CreditWallet, amount: number): CreditWallet {
  return {
    ...wallet,
    balance: wallet.balance + amount,
    lifetimeGranted: wallet.lifetimeGranted + amount,
  };
}
