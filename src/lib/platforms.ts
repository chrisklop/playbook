// Display metadata for platform cards. Game-mechanical data lives in game/types
// and core/platforms (Phase 3+). This is purely for the UI shell.

import type { PhaseId, PlatformId } from '../game/types';

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  unlocksAt: PhaseId;
  audience: string;
  tint: string; // CSS color for accent
}

export const PLATFORM_META: PlatformMeta[] = [
  { id: 'facebook', name: 'Facebook', unlocksAt: 'grassroots', audience: 'older · family-network', tint: 'hsl(220 60% 50%)' },
  { id: 'x',        name: 'X',        unlocksAt: 'grassroots', audience: 'news-junkie · polarized', tint: 'hsl(220 5% 25%)' },
  { id: 'tiktok',   name: 'TikTok',   unlocksAt: 'social',     audience: 'youngest · low-context', tint: 'hsl(330 80% 55%)' },
  { id: 'youtube',  name: 'YouTube',  unlocksAt: 'social',     audience: 'broad · long-form', tint: 'hsl(0 75% 50%)' },
  { id: 'telegram', name: 'Telegram', unlocksAt: 'influencer', audience: 'self-selected · low-mod', tint: 'hsl(200 70% 50%)' },
  { id: 'substack', name: 'Substack', unlocksAt: 'influencer', audience: 'educated · paying', tint: 'hsl(20 90% 55%)' },
  { id: 'podcast',  name: 'Podcast',  unlocksAt: 'cable',      audience: 'trust-laden · low fact-check', tint: 'hsl(280 50% 50%)' },
];
