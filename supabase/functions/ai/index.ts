import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import {
  isOwnedServerPath,
  isSupportedServerGoal,
  type ServerAIRequest,
  type ServerGlowProfile,
  type ServerSelfieRef,
} from '../../../src/services/ai-contract.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function readBearerToken(request: Request): string {
  const value = request.headers.get('Authorization') ?? '';
  const [scheme, token] = value.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) throw new HttpError(401, 'missing_auth', 'Authentication is required.');
  return token;
}

function readString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new HttpError(400, 'invalid_request', `Invalid ${field}.`);
  }
  return value.trim();
}

function readSelfies(value: unknown): ServerSelfieRef[] {
  if (!Array.isArray(value) || value.length > 3) throw new HttpError(400, 'invalid_request', 'Invalid selfie references.');
  return value.map((item) => {
    if (typeof item !== 'object' || item === null) throw new HttpError(400, 'invalid_request', 'Invalid selfie reference.');
    const record = item as Record<string, unknown>;
    const storagePath = readString(record.storagePath, 'storage path', 300);
    const angle = record.angle;
    if (angle !== 'front' && angle !== 'side' && angle !== 'unknown') throw new HttpError(400, 'invalid_request', 'Invalid selfie angle.');
    return { storagePath, angle };
  });
}

function readRequest(value: unknown): ServerAIRequest {
  if (typeof value !== 'object' || value === null) throw new HttpError(400, 'invalid_request', 'A JSON request is required.');
  const record = value as Record<string, unknown>;
  if (record.action === 'analyze') {
    const goal = record.goal;
    if (!isSupportedServerGoal(goal)) throw new HttpError(400, 'invalid_request', 'Invalid goal.');
    return {
      action: 'analyze',
      displayName: readString(record.displayName, 'display name', 80),
      goal,
      selfies: readSelfies(record.selfies),
    };
  }
  if (record.action === 'generate') {
    return {
      action: 'generate',
      recommendationId: readString(record.recommendationId, 'recommendation id', 120),
      recommendationTitle: readString(record.recommendationTitle, 'recommendation title', 160),
      ...(record.sourceStoragePath === undefined ? {} : { sourceStoragePath: readString(record.sourceStoragePath, 'source storage path', 300) }),
    };
  }
  if (record.action === 'get-job') {
    return { action: 'get-job', jobId: readString(record.jobId, 'job id', 120) };
  }
  throw new HttpError(400, 'invalid_request', 'Unsupported AI action.');
}

function createStagingProfile(displayName: string, goal: string): ServerGlowProfile {
  const now = new Date().toISOString();
  const aestheticByGoal: Record<string, string> = {
    natural: 'fresh and effortless',
    'soft-glam': 'softly polished',
    elegant: 'quietly refined',
    clean: 'clean and luminous',
    professional: 'considered and confident',
    'date-night': 'softly magnetic',
    'wedding-guest': 'romantic and refined',
    summer: 'sunlit and warm',
    birthday: 'playful with polish',
  };
  return {
    displayName,
    faceShape: 'Soft oval',
    undertone: 'warm',
    colorSeason: 'Soft Autumn',
    currentHairColor: 'Medium brunette',
    currentHairLength: 'Shoulder length',
    preferredAesthetic: aestheticByGoal[goal] ?? aestheticByGoal['soft-glam'],
    makeupIntensity: goal === 'natural' || goal === 'clean' ? 'light and skin-led' : 'softly defined',
    bestHairDirections: ['Long layers', 'Face-framing pieces', 'Curtain bangs'],
    hairColors: ['Warm chocolate', 'Chestnut', 'Soft caramel'],
    makeupDirection: ['Peach blush', 'Warm nude lips', 'Soft brown liner'],
    metals: ['Gold', 'Warm mixed metals'],
    createdAt: now,
    updatedAt: now,
  };
}

async function authorize(request: Request) {
  const token = readBearerToken(request);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!url || !key) throw new HttpError(500, 'server_config', 'The AI boundary is not configured.');

  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'invalid_auth', 'Authentication is required.');
  return { client, userId: data.user.id };
}

async function verifyOwnerPaths(client: ReturnType<typeof createClient>, userId: string, paths: string[]): Promise<void> {
  const uniquePaths = [...new Set(paths)];
  if (uniquePaths.some((path) => !isOwnedServerPath(userId, path))) throw new HttpError(403, 'forbidden_path', 'A selfie path is outside the current account.');
  if (!uniquePaths.length) return;

  const { data, error } = await client.from('selfies').select('storage_path').eq('user_id', userId).in('storage_path', uniquePaths);
  if (error) throw new HttpError(500, 'owner_lookup_failed', 'The selfie ownership check failed.');
  const owned = new Set((data ?? []).map((row) => row.storage_path));
  if (uniquePaths.some((path) => !owned.has(path))) throw new HttpError(403, 'forbidden_path', 'A selfie path is not available to the current account.');
}

function createStagingJobId(): string {
  return `glow-staging-${Date.now()}-${crypto.randomUUID()}`;
}

function stagingJob(jobId: string) {
  const match = /^glow-staging-(\d+)-[0-9a-f-]{36}$/.exec(jobId);
  if (!match) throw new HttpError(404, 'job_not_found', 'The generation job was not found.');
  // ponytail: encode staging timing in the id; persist generation_jobs when a real provider lands.
  return { id: jobId, status: Date.now() - Number(match[1]) < 900 ? 'processing' : 'completed' };
}

async function handle(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const { client, userId } = await authorize(request);
    const body = readRequest(await request.json().catch(() => null));

    if (body.action === 'analyze') {
      await verifyOwnerPaths(client, userId, body.selfies.map((selfie) => selfie.storagePath));
      return json({ action: 'analyze', provider: 'staging', model: 'contract-v1', profile: createStagingProfile(body.displayName, body.goal) });
    }

    if (body.action === 'generate') {
      if (body.sourceStoragePath) await verifyOwnerPaths(client, userId, [body.sourceStoragePath]);
      return json({ action: 'generate', job: { id: createStagingJobId(), status: 'queued' } });
    }

    return json({ action: 'get-job', job: stagingJob(body.jobId) });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.code, message: error.message }, error.status);
    console.error('ai_boundary_internal_error');
    return json({ error: 'internal_error', message: 'The AI boundary could not complete the request.' }, 500);
  }
}

Deno.serve(handle);
