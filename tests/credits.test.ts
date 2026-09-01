import { describe, expect, it } from 'vitest';

import { grantCredits, reserveCredits, restoreCredits } from '../src/domain/credits';
import { settleFailedGeneration } from '../src/domain/generation';
import { CreditWallet, GenerationJob } from '../src/domain/types';

const wallet: CreditWallet = { balance: 15, lifetimeGranted: 15, lifetimeSpent: 0 };
const job: GenerationJob = { id: 'job-1', recommendationId: 'rec-1', status: 'processing', creditCost: 5, refunded: false, createdAt: 'now', updatedAt: 'now' };

describe('credit economy', () => {
  it('reserves only when the wallet can cover the cost', () => {
    expect(reserveCredits(wallet, 5)).toEqual({ ok: true, wallet: { balance: 10, lifetimeGranted: 15, lifetimeSpent: 5 } });
    expect(reserveCredits(wallet, 20)).toEqual({ ok: false, reason: 'insufficient-credits', wallet });
  });

  it('restores a failed generation exactly once', () => {
    const reserved = reserveCredits(wallet, 5);
    if (!reserved.ok) throw new Error('fixture should reserve');
    const first = settleFailedGeneration(job, reserved.wallet);
    expect(first.refundAmount).toBe(5);
    expect(first.wallet).toEqual(wallet);
    const second = settleFailedGeneration(first.job, first.wallet);
    expect(second.refundAmount).toBe(0);
    expect(second.wallet).toEqual(wallet);
  });

  it('grants purchased credits without changing spent history', () => {
    expect(grantCredits(wallet, 25)).toEqual({ balance: 40, lifetimeGranted: 40, lifetimeSpent: 0 });
    expect(restoreCredits({ ...wallet, balance: 10, lifetimeSpent: 5 }, 5)).toEqual(wallet);
  });
});
