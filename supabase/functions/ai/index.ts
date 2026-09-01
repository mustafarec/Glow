import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import {
  isOwnedServerPath,
  isSupportedServerFocus,
  isSupportedServerGoal,
  type ServerAIRequest,
  type ServerGlowProfile,
  type ServerRecommendation,
  type ServerRecommendationCategory,
  type ServerRecommendRequest,
  type ServerSelfieRef,
} from '../../../src/services/ai-contract.ts';
import { getServerGenerationCreditCost } from '../../../src/services/generation-job.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SELFIE_BUCKET = 'glow-selfies';
const GENERATED_BUCKET = 'glow-generated';
const GENERATED_SIGNED_URL_TTL_SECONDS = 60 * 60;
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OPENAI_IMAGE_EDITS_URL = 'https://api.openai.com/v1/images/edits';
const OPENAI_ANALYSIS_MODEL = 'gpt-5.6-luna';
const OPENAI_IMAGE_MODEL = 'gpt-image-2';
const MAX_INPUT_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_IMAGE_BYTES = 30 * 1024 * 1024;

type StorageClient = ReturnType<typeof createClient>;
type ImagePayload = { bytes: Uint8Array; contentType: string; dataUrl: string; extension: string };

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

function requireProductionMode(): void {
  if (Deno.env.get('AI_MODE')?.trim().toUpperCase() !== 'PRODUCTION') {
    throw new HttpError(503, 'production_not_configured', 'Production AI is not configured.');
  }
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

function readStringArray(value: unknown, field: string, maxItems: number, maxItemLength: number): string[] {
  if (!Array.isArray(value) || value.length > maxItems || value.some((item) => typeof item !== 'string' || !item.trim() || item.length > maxItemLength)) {
    throw new HttpError(400, 'invalid_request', `Invalid ${field}.`);
  }
  return value.map((item) => (item as string).trim());
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

function readProfile(value: unknown): ServerGlowProfile {
  if (typeof value !== 'object' || value === null) throw new HttpError(400, 'invalid_request', 'Invalid Glow Profile.');
  const record = value as Record<string, unknown>;
  const undertone = record.undertone;
  if (undertone !== 'warm' && undertone !== 'cool' && undertone !== 'neutral') throw new HttpError(400, 'invalid_request', 'Invalid profile undertone.');
  return {
    displayName: readString(record.displayName, 'profile display name', 80),
    faceShape: readString(record.faceShape, 'face shape', 120),
    undertone,
    colorSeason: readString(record.colorSeason, 'color season', 120),
    currentHairColor: readString(record.currentHairColor, 'current hair color', 120),
    currentHairLength: readString(record.currentHairLength, 'current hair length', 120),
    preferredAesthetic: readString(record.preferredAesthetic, 'preferred aesthetic', 160),
    makeupIntensity: readString(record.makeupIntensity, 'makeup intensity', 160),
    bestHairDirections: readStringArray(record.bestHairDirections, 'hair directions', 8, 120),
    hairColors: readStringArray(record.hairColors, 'hair colors', 8, 120),
    makeupDirection: readStringArray(record.makeupDirection, 'makeup direction', 8, 120),
    metals: readStringArray(record.metals, 'metals', 8, 80),
    createdAt: readString(record.createdAt, 'profile created at', 80),
    updatedAt: readString(record.updatedAt, 'profile updated at', 80),
  };
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
  if (record.action === 'recommend') {
    const goal = record.goal;
    const focus = record.focus;
    if (!isSupportedServerGoal(goal) || !isSupportedServerFocus(focus)) throw new HttpError(400, 'invalid_request', 'Invalid recommendation context.');
    return { action: 'recommend', profile: readProfile(record.profile), goal, focus } satisfies ServerRecommendRequest;
  }
  if (record.action === 'generate') {
    const recommendationCategory = record.recommendationCategory;
    if (recommendationCategory !== 'hairstyle' && recommendationCategory !== 'hair-color' && recommendationCategory !== 'makeup' && recommendationCategory !== 'complete-glow') {
      throw new HttpError(400, 'invalid_request', 'Invalid recommendation category.');
    }
    return {
      action: 'generate',
      clientRequestId: readString(record.clientRequestId, 'client request id', 120),
      recommendationId: readString(record.recommendationId, 'recommendation id', 120),
      recommendationTitle: readString(record.recommendationTitle, 'recommendation title', 160),
      recommendationCategory,
      ...(record.sourceStoragePath === undefined ? {} : { sourceStoragePath: readString(record.sourceStoragePath, 'source storage path', 300) }),
    };
  }
  if (record.action === 'get-job') {
    return { action: 'get-job', jobId: readString(record.jobId, 'job id', 120) };
  }
  throw new HttpError(400, 'invalid_request', 'Unsupported AI action.');
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

async function verifyOwnerPaths(client: StorageClient, userId: string, paths: string[]): Promise<void> {
  const uniquePaths = [...new Set(paths)];
  if (uniquePaths.some((path) => !isOwnedServerPath(userId, path))) throw new HttpError(403, 'forbidden_path', 'A selfie path is outside the current account.');
  if (!uniquePaths.length) return;

  const { data, error } = await client.from('selfies').select('storage_path').eq('user_id', userId).in('storage_path', uniquePaths);
  if (error) throw new HttpError(500, 'owner_lookup_failed', 'The selfie ownership check failed.');
  const owned = new Set((data ?? []).map((row) => row.storage_path));
  if (uniquePaths.some((path) => !owned.has(path))) throw new HttpError(403, 'forbidden_path', 'A selfie path is not available to the current account.');
}

function normalizeImageType(value: string | undefined): { contentType: string; extension: string } {
  const contentType = value?.split(';')[0].trim().toLowerCase() ?? '';
  const types: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const extension = types[contentType];
  if (!extension) throw new HttpError(415, 'unsupported_image_type', 'Use a JPEG, PNG, or WebP selfie for AI processing.');
  return { contentType, extension };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new HttpError(502, 'provider_invalid_response', 'The AI provider returned an invalid image.');
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function downloadPrivateImage(client: StorageClient, storagePath: string): Promise<ImagePayload> {
  const { data, error } = await client.storage.from(SELFIE_BUCKET).download(storagePath);
  if (error || !data) throw new HttpError(502, 'selfie_read_failed', 'The private selfie could not be read.');
  if (data.size > MAX_INPUT_IMAGE_BYTES) throw new HttpError(413, 'selfie_too_large', 'The selfie is too large for AI processing.');
  const { contentType, extension } = normalizeImageType(data.type);
  const bytes = new Uint8Array(await data.arrayBuffer());
  return { bytes, contentType, extension, dataUrl: `data:${contentType};base64,${bytesToBase64(bytes)}` };
}

function requireOpenAIKey(): string {
  const key = Deno.env.get('OPENAI_API_KEY')?.trim();
  if (!key) throw new HttpError(503, 'provider_not_configured', 'The production AI provider is not configured.');
  return key;
}

function getUpstreamErrorCode(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const error = (value as Record<string, unknown>).error;
  if (typeof error !== 'object' || error === null) return undefined;
  const code = (error as Record<string, unknown>).code;
  return typeof code === 'string' ? code : undefined;
}

async function openAIJson(url: string, init: RequestInit): Promise<Record<string, unknown>> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${requireOpenAIKey()}`);
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch {
    console.error('openai_request_failed:network');
    throw new HttpError(503, 'provider_unavailable', 'The AI provider could not be reached.');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const upstreamCode = getUpstreamErrorCode(body);
    console.error(`openai_request_failed:${response.status}:${upstreamCode ?? 'unknown'}`);
    if (upstreamCode === 'moderation_blocked') throw new HttpError(422, 'moderation_blocked', 'This request did not meet safety requirements.');
    throw new HttpError(response.status === 429 ? 503 : 502, 'provider_unavailable', 'The AI provider could not complete the request.');
  }
  if (typeof body !== 'object' || body === null) throw new HttpError(502, 'provider_invalid_response', 'The AI provider returned an invalid response.');
  return body as Record<string, unknown>;
}

function readResponseOutputText(response: Record<string, unknown>): string {
  if (typeof response.output_text === 'string' && response.output_text.trim()) return response.output_text;
  const output = response.output;
  if (Array.isArray(output)) {
    const text = output.flatMap((item) => {
      if (typeof item !== 'object' || item === null) return [];
      const content = (item as Record<string, unknown>).content;
      if (!Array.isArray(content)) return [];
      return content.flatMap((part) => {
        if (typeof part !== 'object' || part === null) return [];
        const record = part as Record<string, unknown>;
        return record.type === 'output_text' && typeof record.text === 'string' ? [record.text] : [];
      });
    }).join('');
    if (text.trim()) return text;
  }
  throw new HttpError(502, 'provider_invalid_response', 'The AI provider returned no text output.');
}

function parseModelJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(502, 'provider_invalid_response', 'The AI provider returned invalid structured data.');
  }
}

function readModelString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) throw new HttpError(502, 'provider_invalid_response', `The AI provider returned an invalid ${field}.`);
  return value.trim();
}

function readModelStringArray(value: unknown, field: string, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems || value.some((item) => typeof item !== 'string' || !item.trim() || item.length > maxLength)) {
    throw new HttpError(502, 'provider_invalid_response', `The AI provider returned an invalid ${field}.`);
  }
  return value.map((item) => (item as string).trim());
}

const profileSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    faceShape: { type: 'string' },
    undertone: { type: 'string', enum: ['warm', 'cool', 'neutral'] },
    colorSeason: { type: 'string' },
    currentHairColor: { type: 'string' },
    currentHairLength: { type: 'string' },
    preferredAesthetic: { type: 'string' },
    makeupIntensity: { type: 'string' },
    bestHairDirections: { type: 'array', items: { type: 'string' } },
    hairColors: { type: 'array', items: { type: 'string' } },
    makeupDirection: { type: 'array', items: { type: 'string' } },
    metals: { type: 'array', items: { type: 'string' } },
  },
  required: ['faceShape', 'undertone', 'colorSeason', 'currentHairColor', 'currentHairLength', 'preferredAesthetic', 'makeupIntensity', 'bestHairDirections', 'hairColors', 'makeupDirection', 'metals'],
} as const;

function normalizeProfile(value: unknown, displayName: string): ServerGlowProfile {
  if (typeof value !== 'object' || value === null) throw new HttpError(502, 'provider_invalid_response', 'The AI provider returned an invalid Glow Profile.');
  const record = value as Record<string, unknown>;
  const undertone = record.undertone;
  if (undertone !== 'warm' && undertone !== 'cool' && undertone !== 'neutral') throw new HttpError(502, 'provider_invalid_response', 'The AI provider returned an invalid undertone.');
  const now = new Date().toISOString();
  return {
    displayName,
    faceShape: readModelString(record.faceShape, 'face shape', 120),
    undertone,
    colorSeason: readModelString(record.colorSeason, 'color season', 120),
    currentHairColor: readModelString(record.currentHairColor, 'current hair color', 120),
    currentHairLength: readModelString(record.currentHairLength, 'current hair length', 120),
    preferredAesthetic: readModelString(record.preferredAesthetic, 'preferred aesthetic', 160),
    makeupIntensity: readModelString(record.makeupIntensity, 'makeup intensity', 160),
    bestHairDirections: readModelStringArray(record.bestHairDirections, 'hair directions', 6, 120),
    hairColors: readModelStringArray(record.hairColors, 'hair colors', 6, 120),
    makeupDirection: readModelStringArray(record.makeupDirection, 'makeup direction', 6, 120),
    metals: readModelStringArray(record.metals, 'metals', 6, 80),
    createdAt: now,
    updatedAt: now,
  };
}

async function analyzeWithOpenAI(client: StorageClient, displayName: string, goal: string, selfies: ServerSelfieRef[]): Promise<ServerGlowProfile> {
  if (!selfies.length) throw new HttpError(400, 'selfie_required', 'At least one consented selfie is required for production analysis.');
  const images = await Promise.all(selfies.map((selfie) => downloadPrivateImage(client, selfie.storagePath)));
  const content = [
    {
      type: 'input_text',
      text: `Create a private Glow Profile for the user's ${goal} styling goal. Analyze only visible, non-sensitive styling signals from the reference selfies. Do not rate attractiveness, infer age, ethnicity, gender, health, or personality, and do not make medical claims. Return practical hair, color, makeup, and metal directions. The profile must be respectful, identity-preserving, and suitable for a styling app.`,
    },
    ...images.map((image) => ({ type: 'input_image', image_url: image.dataUrl, detail: 'high' })),
  ];
  const response = await openAIJson(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_ANALYSIS_MODEL,
      store: false,
      max_output_tokens: 1200,
      input: [{ role: 'user', content }],
      text: { format: { type: 'json_schema', name: 'glow_profile', strict: true, schema: profileSchema } },
    }),
  });
  return normalizeProfile(parseModelJson(readResponseOutputText(response)), displayName);
}

const recommendationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          subtitle: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string', enum: ['hairstyle', 'hair-color', 'makeup', 'complete-glow'] },
          impact: { type: 'string', enum: ['biggest-impact', 'high-impact', 'explore'] },
          tag: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['id', 'title', 'subtitle', 'description', 'category', 'impact', 'tag', 'explanation'],
      },
    },
  },
  required: ['recommendations'],
} as const;

function safeRecommendationId(value: string, index: number): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  return `ai-${index + 1}-${slug || 'glow-direction'}`;
}

function normalizeRecommendations(value: unknown, goal: ServerRecommendRequest['goal']): ServerRecommendation[] {
  if (typeof value !== 'object' || value === null || !Array.isArray((value as Record<string, unknown>).recommendations)) {
    throw new HttpError(502, 'provider_invalid_response', 'The AI provider returned invalid recommendations.');
  }
  const source = (value as Record<string, unknown>).recommendations as unknown[];
  if (source.length < 3) throw new HttpError(502, 'provider_invalid_response', 'The AI provider returned too few recommendations.');
  const ids = new Set<string>();
  return source.slice(0, 5).map((item, index) => {
    if (typeof item !== 'object' || item === null) throw new HttpError(502, 'provider_invalid_response', 'The AI provider returned an invalid recommendation.');
    const record = item as Record<string, unknown>;
    const category = record.category;
    const impact = record.impact;
    if (category !== 'hairstyle' && category !== 'hair-color' && category !== 'makeup' && category !== 'complete-glow') throw new HttpError(502, 'provider_invalid_response', 'The AI provider returned an invalid recommendation category.');
    if (impact !== 'biggest-impact' && impact !== 'high-impact' && impact !== 'explore') throw new HttpError(502, 'provider_invalid_response', 'The AI provider returned an invalid recommendation impact.');
    const baseId = safeRecommendationId(readModelString(record.id, 'recommendation id', 80), index);
    const id = ids.has(baseId) ? `${baseId}-${index + 1}` : baseId;
    ids.add(id);
    return {
      id,
      title: readModelString(record.title, 'recommendation title', 160),
      subtitle: readModelString(record.subtitle, 'recommendation subtitle', 160),
      description: readModelString(record.description, 'recommendation description', 400),
      category,
      impact,
      tag: readModelString(record.tag, 'recommendation tag', 60),
      explanation: readModelString(record.explanation, 'recommendation explanation', 400),
      creditCost: getServerGenerationCreditCost(id, category),
      goalFit: goal,
    };
  });
}

async function recommendWithOpenAI(request: ServerRecommendRequest): Promise<ServerRecommendation[]> {
  const response = await openAIJson(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_ANALYSIS_MODEL,
      store: false,
      max_output_tokens: 1800,
      input: [{
        role: 'user',
        content: [{
          type: 'input_text',
          text: `Create five ranked, non-judgmental styling directions for this Glow Profile. Focus on the requested ${request.goal} goal and ${request.focus} focus. Do not rate attractiveness or make medical, demographic, or personality claims. Each direction must be actionable for hair, hair color, makeup, or a complete look. Profile JSON: ${JSON.stringify(request.profile)}`,
        }],
      }],
      text: { format: { type: 'json_schema', name: 'glow_recommendations', strict: true, schema: recommendationSchema } },
    }),
  });
  return normalizeRecommendations(parseModelJson(readResponseOutputText(response)), request.goal);
}

const generationJobColumns = 'id,status,provider_job_id,generated_look_id,recommendation_id,recommendation_title,recommendation_category,source_storage_path,result_storage_path,error_code,credits_refunded,created_at,updated_at';

type GenerationJobRow = {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  provider_job_id: string | null;
  generated_look_id: string | null;
  recommendation_id: string | null;
  recommendation_title: string | null;
  recommendation_category: ServerRecommendationCategory | null;
  source_storage_path: string | null;
  result_storage_path: string | null;
  error_code: string | null;
  credits_refunded: boolean;
  created_at: string;
  updated_at: string;
};

async function stableGenerationJobId(userId: string, clientRequestId: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${userId}:${clientRequestId}`)));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes.slice(0, 16)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function toServerJob(client: StorageClient, row: GenerationJobRow): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {
    id: row.id,
    status: row.status,
    ...(row.provider_job_id ? { providerJobId: row.provider_job_id } : {}),
    ...(row.error_code ? { error: row.error_code } : {}),
  };
  if (row.result_storage_path) {
    const { data, error } = await client.storage.from(GENERATED_BUCKET).createSignedUrl(row.result_storage_path, GENERATED_SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) throw new HttpError(500, 'result_url_failed', 'The generated preview URL could not be created.');
    result.resultUri = data.signedUrl;
    result.resultStoragePath = row.result_storage_path;
  }
  return result;
}

async function findOwnedGenerationJob(client: StorageClient, userId: string, jobId: string): Promise<GenerationJobRow | null> {
  const { data, error } = await client
    .from('generation_jobs')
    .select(generationJobColumns)
    .eq('id', jobId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'job_lookup_failed', 'The generation job lookup failed.');
  return data as GenerationJobRow | null;
}

async function createGenerationJob(client: StorageClient, userId: string, request: Extract<ServerAIRequest, { action: 'generate' }>): Promise<GenerationJobRow> {
  const id = await stableGenerationJobId(userId, request.clientRequestId);
  const existing = await findOwnedGenerationJob(client, userId, id);
  if (existing) return existing;

  const { error } = await client.rpc('reserve_generation_credits', {
    p_job_id: id,
    p_recommendation_id: request.recommendationId,
    p_recommendation_title: request.recommendationTitle,
    p_recommendation_category: request.recommendationCategory,
    p_source_storage_path: request.sourceStoragePath ?? null,
  });
  if (error) {
    if (error.message === 'INSUFFICIENT_CREDITS') throw new HttpError(402, 'insufficient_credits', 'There are not enough Glow credits for this preview.');
    throw new HttpError(500, 'credit_reservation_failed', 'The preview credit reservation could not be completed.');
  }

  const reserved = await findOwnedGenerationJob(client, userId, id);
  if (reserved) return reserved;
  throw new HttpError(500, 'job_create_failed', 'The generation job could not be created.');
}

async function claimProductionJob(client: StorageClient, userId: string, row: GenerationJobRow): Promise<{ row: GenerationJobRow; claimed: boolean }> {
  if (row.status !== 'queued') return { row, claimed: false };
  const { data, error } = await client
    .from('generation_jobs')
    .update({ status: 'processing', provider_job_id: `glow-openai-${row.id}` })
    .eq('id', row.id)
    .eq('user_id', userId)
    .eq('status', 'queued')
    .select(generationJobColumns)
    .maybeSingle();
  if (error) throw new HttpError(500, 'job_update_failed', 'The generation job could not be claimed.');
  if (data) return { row: data as GenerationJobRow, claimed: true };
  return { row: (await findOwnedGenerationJob(client, userId, row.id)) ?? row, claimed: false };
}

function failureCode(error: unknown): string {
  return error instanceof HttpError ? error.code : 'provider_failed';
}

async function markProductionJobFailed(client: StorageClient, userId: string, row: GenerationJobRow, error: unknown): Promise<GenerationJobRow> {
  const { error: updateError } = await client.rpc('fail_generation_job_and_refund', {
    p_job_id: row.id,
    p_error_code: failureCode(error),
  });
  if (updateError) throw new HttpError(500, 'job_update_failed', 'The failed generation job and credit refund could not be recorded.');
  return (await findOwnedGenerationJob(client, userId, row.id)) ?? { ...row, status: 'failed', error_code: failureCode(error), credits_refunded: true };
}

function buildGenerationPrompt(row: GenerationJobRow): string {
  return `Create a realistic, respectful styling preview from this reference selfie. Keep the same person's identity, facial structure, skin texture, age, natural expression, body proportions, framing, and lighting. Apply only this non-medical styling direction: ${row.recommendation_title ?? 'a natural personalized glow direction'}. Preserve the face as the source of truth. Do not change identity, body shape, skin tone, or facial features. Do not add text, logos, watermarks, beauty-filter smoothing, or unrelated accessories.`;
}

async function processProductionJob(client: StorageClient, userId: string, row: GenerationJobRow): Promise<GenerationJobRow> {
  const claim = await claimProductionJob(client, userId, row);
  if (!claim.claimed) return claim.row;
  const processingRow = claim.row;
  try {
    if (!processingRow.source_storage_path) throw new HttpError(400, 'source_image_required', 'A consented selfie is required for production generation.');
    const source = await downloadPrivateImage(client, processingRow.source_storage_path);
    const form = new FormData();
    form.append('model', OPENAI_IMAGE_MODEL);
    form.append('image[]', new Blob([source.bytes], { type: source.contentType }), `selfie.${source.extension}`);
    form.append('prompt', buildGenerationPrompt(processingRow));
    form.append('size', '1024x1536');
    form.append('quality', 'low');

    const response = await openAIJson(OPENAI_IMAGE_EDITS_URL, { method: 'POST', body: form });
    const data = response.data;
    if (!Array.isArray(data) || typeof data[0] !== 'object' || data[0] === null || typeof (data[0] as Record<string, unknown>).b64_json !== 'string') {
      throw new HttpError(502, 'provider_invalid_response', 'The AI provider returned no generated image.');
    }
    const resultBytes = base64ToBytes((data[0] as Record<string, unknown>).b64_json as string);
    if (resultBytes.byteLength > MAX_OUTPUT_IMAGE_BYTES) throw new HttpError(502, 'provider_invalid_response', 'The generated image is too large to store.');
    const resultStoragePath = `${userId}/${processingRow.id}.png`;
    const { error: uploadError } = await client.storage.from(GENERATED_BUCKET).upload(resultStoragePath, resultBytes, {
      cacheControl: '3600',
      contentType: 'image/png',
      upsert: true,
    });
    if (uploadError) throw new HttpError(502, 'result_store_failed', 'The generated preview could not be stored privately.');

    const { data: completed, error: updateError } = await client
      .from('generation_jobs')
      .update({ status: 'completed', result_storage_path: resultStoragePath, error_code: null })
      .eq('id', processingRow.id)
      .eq('user_id', userId)
      .eq('status', 'processing')
      .select(generationJobColumns)
      .maybeSingle();
    if (updateError) throw new HttpError(500, 'job_update_failed', 'The completed generation job could not be recorded.');
    return (completed as GenerationJobRow | null) ?? (await findOwnedGenerationJob(client, userId, processingRow.id)) ?? processingRow;
  } catch (error) {
    return markProductionJobFailed(client, userId, processingRow, error);
  }
}

async function handle(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const { client, userId } = await authorize(request);
    const body = readRequest(await request.json().catch(() => null));
    requireProductionMode();

    if (body.action === 'analyze') {
      await verifyOwnerPaths(client, userId, body.selfies.map((selfie) => selfie.storagePath));
      const profile = await analyzeWithOpenAI(client, body.displayName, body.goal, body.selfies);
      return json({ action: 'analyze', provider: 'openai', model: OPENAI_ANALYSIS_MODEL, profile });
    }

    if (body.action === 'recommend') {
      const recommendations = await recommendWithOpenAI(body);
      return json({ action: 'recommend', provider: 'openai', model: OPENAI_ANALYSIS_MODEL, recommendations });
    }

    if (body.action === 'generate') {
      if (body.sourceStoragePath) await verifyOwnerPaths(client, userId, [body.sourceStoragePath]);
      const job = await createGenerationJob(client, userId, body);
      const current = await processProductionJob(client, userId, job);
      return json({ action: 'generate', job: await toServerJob(client, current) });
    }

    const currentJob = await findOwnedGenerationJob(client, userId, body.jobId);
    if (!currentJob) throw new HttpError(404, 'job_not_found', 'The generation job was not found.');
    const job = await processProductionJob(client, userId, currentJob);
    return json({ action: 'get-job', job: await toServerJob(client, job) });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.code, message: error.message }, error.status);
    console.error('ai_boundary_internal_error');
    return json({ error: 'internal_error', message: 'The AI boundary could not complete the request.' }, 500);
  }
}

Deno.serve(handle);
