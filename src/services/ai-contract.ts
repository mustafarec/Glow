export const AI_FUNCTION_NAME = 'ai';

export type ServerGoal =
  | 'natural'
  | 'soft-glam'
  | 'elegant'
  | 'clean'
  | 'professional'
  | 'date-night'
  | 'wedding-guest'
  | 'summer'
  | 'birthday';

export type ServerSelfieAngle = 'front' | 'side' | 'unknown';
export type ServerGenerationStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ServerSelfieRef {
  storagePath: string;
  angle: ServerSelfieAngle;
}

export interface ServerGlowProfile {
  displayName: string;
  faceShape: string;
  undertone: 'warm' | 'cool' | 'neutral';
  colorSeason: string;
  currentHairColor: string;
  currentHairLength: string;
  preferredAesthetic: string;
  makeupIntensity: string;
  bestHairDirections: string[];
  hairColors: string[];
  makeupDirection: string[];
  metals: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ServerAnalyzeRequest {
  action: 'analyze';
  displayName: string;
  goal: ServerGoal;
  selfies: ServerSelfieRef[];
}

export interface ServerGenerateRequest {
  action: 'generate';
  recommendationId: string;
  recommendationTitle: string;
  sourceStoragePath?: string;
}

export interface ServerGetJobRequest {
  action: 'get-job';
  jobId: string;
}

export type ServerAIRequest = ServerAnalyzeRequest | ServerGenerateRequest | ServerGetJobRequest;

export interface ServerJob {
  id: string;
  status: ServerGenerationStatus;
  resultUri?: string;
  error?: string;
}

export interface ServerAnalyzeResponse {
  action: 'analyze';
  profile: ServerGlowProfile;
  provider?: string;
  model?: string;
}

export interface ServerJobResponse {
  action: 'generate' | 'get-job';
  job: ServerJob;
}

export type ServerAIResponse = ServerAnalyzeResponse | ServerJobResponse;

const serverGoals = new Set<ServerGoal>([
  'natural',
  'soft-glam',
  'elegant',
  'clean',
  'professional',
  'date-night',
  'wedding-guest',
  'summer',
  'birthday',
]);

export function isSupportedServerGoal(value: unknown): value is ServerGoal {
  return typeof value === 'string' && serverGoals.has(value as ServerGoal);
}

export function isOwnedServerPath(userId: string, storagePath: string): boolean {
  const prefix = `${userId}/`;
  const objectName = storagePath.startsWith(prefix) ? storagePath.slice(prefix.length) : '';
  return Boolean(userId && objectName && !objectName.includes('/') && !objectName.includes('..'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isServerGlowProfile(value: unknown): value is ServerGlowProfile {
  if (!isRecord(value)) return false;
  const strings = ['displayName', 'faceShape', 'colorSeason', 'currentHairColor', 'currentHairLength', 'preferredAesthetic', 'makeupIntensity', 'createdAt', 'updatedAt'];
  if (strings.some((key) => typeof value[key] !== 'string')) return false;
  if (value.undertone !== 'warm' && value.undertone !== 'cool' && value.undertone !== 'neutral') return false;
  return ['bestHairDirections', 'hairColors', 'makeupDirection', 'metals'].every((key) => isStringArray(value[key]));
}

function isServerJob(value: unknown): value is ServerJob {
  if (!isRecord(value) || typeof value.id !== 'string') return false;
  if (value.status !== 'queued' && value.status !== 'processing' && value.status !== 'completed' && value.status !== 'failed') return false;
  return (value.resultUri === undefined || typeof value.resultUri === 'string')
    && (value.error === undefined || typeof value.error === 'string');
}

export function parseServerAIResponse(value: unknown): ServerAIResponse {
  if (!isRecord(value) || (value.action !== 'analyze' && value.action !== 'generate' && value.action !== 'get-job')) {
    throw new Error('The server AI boundary returned an invalid response.');
  }

  if (value.action === 'analyze') {
    if (!isServerGlowProfile(value.profile)) throw new Error('The server AI boundary returned an invalid profile.');
    return {
      action: 'analyze',
      profile: value.profile,
      provider: typeof value.provider === 'string' ? value.provider : undefined,
      model: typeof value.model === 'string' ? value.model : undefined,
    };
  }

  if (!isServerJob(value.job)) throw new Error('The server AI boundary returned an invalid job.');
  return { action: value.action, job: value.job };
}
