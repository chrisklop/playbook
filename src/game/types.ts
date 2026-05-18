export type PhaseId =
  | 'grassroots'
  | 'blog'
  | 'social'
  | 'influencer'
  | 'cable'
  | 'aisaturation';

export const PHASE_ORDER: PhaseId[] = [
  'grassroots',
  'blog',
  'social',
  'influencer',
  'cable',
  'aisaturation',
];

export type ResourceId =
  | 'attention'
  | 'engagement'
  | 'followers'
  | 'credibility'
  | 'narrativeDominance'
  | 'syntheticReality';

export const RESOURCE_IDS: ResourceId[] = [
  'attention',
  'engagement',
  'followers',
  'credibility',
  'narrativeDominance',
  'syntheticReality',
];

export type PlatformId =
  | 'facebook'
  | 'x'
  | 'tiktok'
  | 'youtube'
  | 'telegram'
  | 'substack'
  | 'podcast';

export const PLATFORM_IDS: PlatformId[] = [
  'facebook',
  'x',
  'tiktok',
  'youtube',
  'telegram',
  'substack',
  'podcast',
];

export type DepictId =
  | 'discrediting'
  | 'emotional'
  | 'polarization'
  | 'impersonation'
  | 'conspiracy'
  | 'trolling';

export const DEPICT_IDS: DepictId[] = [
  'discrediting',
  'emotional',
  'polarization',
  'impersonation',
  'conspiracy',
  'trolling',
];

export interface PlatformState {
  unlocked: boolean;
  burned: boolean;
  burnedUntil: number;
  heat: number;
  presence: number;
  reach: number;
  chargeProgress: number;  // 0..1, fills over time, fires a post at 1
  postRate: number;        // 0..1, scales charge fill speed (per-platform dial)
}

export interface ReturnBuff {
  until: number;
  mult: number;
}

export interface ActiveEvent {
  id: string;
  until: number;
  mult: number;
  resourceId: ResourceId;
}

export interface RevealState {
  active: boolean;
  triggeredAt: number;
}

export interface OfflineSummary {
  awaySec: number;
  gains: Partial<Record<ResourceId, number>>;
  buffActive: boolean;
}

export interface GameState {
  version: number;
  phase: PhaseId;
  resources: Record<ResourceId, number>;
  caps: Record<ResourceId, number>;
  assets: Record<string, number>;
  upgrades: Record<string, number>;
  flags: Record<string, boolean>;
  completedProjects: Record<string, true>;
  platforms: Record<PlatformId, PlatformState>;
  cure: number;
  defections: number;
  reveal: RevealState;
  log: string[];
  startedAt: number;
  lastTick: number;
  lastSave: number;
  peakResources: Record<ResourceId, number>;
  returnBuff: ReturnBuff | null;
  event: ActiveEvent | null;
  lastEventAt: number;
  // Pending offline summary to show on next render. Cleared by UI after display.
  pendingOfflineSummary?: OfflineSummary | null;
}

export const SAVE_VERSION = 9;
