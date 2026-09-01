import { restoreCredits } from './credits';
import { CreditWallet, GenerationJob } from './types';

export function settleFailedGeneration(job: GenerationJob, wallet: CreditWallet) {
  if (job.refunded) return { job, wallet, refundAmount: 0 };
  return {
    job: { ...job, status: 'failed' as const, refunded: true, error: 'Generation failed. Your credits were restored.' },
    wallet: restoreCredits(wallet, job.creditCost),
    refundAmount: job.creditCost,
  };
}
