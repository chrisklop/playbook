// DEPICT synergies — combo upgrades that unlock when TWO trees both pass a
// threshold (per PLAN.md §4.2). Each is a one-shot project with a real-world
// named technique; effect is a permanent multiplier flag.

import type { GameState, ResourceId, DepictId } from '../types';
import { treeTotalLevel } from './catalog';

export interface SynergyDef {
  id: string;
  name: string;
  trees: [DepictId, DepictId];
  threshold: number;
  cost: Partial<Record<ResourceId, number>>;
  blurb: string;
  precedent?: string;
  effect: (s: GameState) => void;
  // Convenience helpers (computed from threshold + trees).
}

function bothAtLeast(s: GameState, [a, b]: [DepictId, DepictId], n: number): boolean {
  return treeTotalLevel(s, a) >= n && treeTotalLevel(s, b) >= n;
}

export const SYNERGIES: SynergyDef[] = [
  {
    id: 'syn-wedge-content',
    name: 'Wedge Content',
    trees: ['emotional', 'polarization'],
    threshold: 8,
    cost: { engagement: 50_000 },
    blurb: 'Emotional + Polarization compound. Posts that split AND enrage get cross-platform multipliers.',
    precedent: 'IRA "Heart of Texas" + "United Muslims of America" model — engineered both-sides outrage at the same target audience. (Senate Intel Vol. II, 2019)',
    effect: (s) => {
      s.flags['syn:wedge-content'] = true;
      s.log.unshift('▸ Synergy: Wedge Content. Emotional + Polarization compounding.');
    },
  },
  {
    id: 'syn-fake-whistleblower',
    name: 'Fake Whistleblower',
    trees: ['impersonation', 'conspiracy'],
    threshold: 8,
    cost: { engagement: 80_000 },
    blurb: '"Insider speaks out!" A fabricated leaker with a fabricated cache. Credibility for the price of nothing.',
    precedent: 'Steele Dossier amplification arc (DOJ IG Horowitz report, 2019); various "DOD whistleblower" QAnon-adjacent personas; Cambridge Analytica whistleblower-as-counter framing.',
    effect: (s) => {
      s.flags['syn:fake-whistleblower'] = true;
      s.log.unshift('▸ Synergy: Fake Whistleblower. Impersonation + Conspiracy compounding.');
    },
  },
  {
    id: 'syn-flood-the-zone',
    name: 'Flood the Zone',
    trees: ['discrediting', 'trolling'],
    threshold: 8,
    cost: { engagement: 60_000 },
    blurb: 'Many channels, all loud, all contradictory. The fact-checkers cannot keep up; their decay rate increases.',
    precedent: 'Steve Bannon: "The Democrats don\'t matter. The real opposition is the media. And the way to deal with them is to flood the zone with shit." (Frontline interview, 2018; Lewis, 2018.)',
    effect: (s) => {
      s.flags['syn:flood-the-zone'] = true;
      s.log.unshift('▸ Synergy: Flood the Zone. Discrediting + Trolling compounding; heat decays faster.');
    },
  },
  {
    id: 'syn-mob-surge',
    name: 'Mob Surge',
    trees: ['polarization', 'trolling'],
    threshold: 8,
    cost: { engagement: 100_000 },
    blurb: 'A polarization post lands; the trolls pile on. The reach amplifies for 60s after each post.',
    precedent: 'Documented coordinated quote-tweet / mass-report patterns. K-pop stan armies, LibsOfTikTok targeting, anti-IDF/pro-IDF mass-reporting — cross-spectrum.',
    effect: (s) => {
      s.flags['syn:mob-surge'] = true;
      s.log.unshift('▸ Synergy: Mob Surge. Polarization + Trolling compounding.');
    },
  },
  {
    id: 'syn-moral-panic',
    name: 'Moral Panic',
    trees: ['emotional', 'conspiracy'],
    threshold: 10,
    cost: { engagement: 200_000 },
    blurb: '"Save the children!" A genuine concern gets weaponized into an unfalsifiable belief system.',
    precedent: '1980s Satanic Panic (McMartin Preschool, repressed-memory therapy fraud). QAnon\'s 2020 weaponization of "Save the Children" anti-trafficking branding. Cross-spectrum: both flanks have done versions.',
    effect: (s) => {
      s.flags['syn:moral-panic'] = true;
      s.log.unshift('▸ Synergy: Moral Panic. Emotional + Conspiracy compounding hard.');
    },
  },
  {
    id: 'syn-reverse-smear',
    name: 'Reverse-Smear',
    trees: ['discrediting', 'impersonation'],
    threshold: 8,
    cost: { engagement: 120_000 },
    blurb: 'When fact-checked, accuse the fact-checkers of being the disinfo. Discrediting also nudges cure back.',
    precedent: 'KGB Operation Denver pattern: when challenged, the operation rotated to attacking the messengers. Russian Doppelganger ops use the same reverse-attribution technique.',
    effect: (s) => {
      s.flags['syn:reverse-smear'] = true;
      s.log.unshift('▸ Synergy: Reverse-Smear. Each discrediting hit nudges cure back.');
    },
  },
  {
    id: 'syn-false-document-leak',
    name: 'False Document Leak',
    trees: ['conspiracy', 'impersonation'],
    threshold: 10,
    cost: { engagement: 250_000 },
    blurb: 'A "leaked" cache of "internal documents." Engagement spikes once; the fact-checkers spike too.',
    precedent: 'Steele Dossier (2016, never fully verified); "Hunter Biden laptop" (2020, suppressed then authenticated then politicized); IRA-published fake DCCC files. Cross-spectrum — both flanks have run versions.',
    effect: (s) => {
      s.flags['syn:false-document-leak'] = true;
      // One-shot bump that mirrors the real engagement-with-blowback pattern.
      s.resources.engagement = Math.min(
        s.caps.engagement || s.resources.engagement,
        s.resources.engagement + 500_000,
      );
      s.cure = Math.min(1, s.cure + 0.05);
      s.log.unshift('▸ Synergy: False Document Leak. Engagement +500K; cure +5%.');
    },
  },
  {
    id: 'syn-tribal-trojan',
    name: 'Tribal Trojan',
    trees: ['polarization', 'impersonation'],
    threshold: 12,
    cost: { engagement: 400_000 },
    blurb: 'Run a fake "leader of your team." Polarization platforms gain a credible insider asset.',
    precedent: 'IRA "Blacktivist," "Heart of Texas," "Being Patriotic" Facebook pages — fake American activist personas with hundreds of thousands of followers. (Senate Intel Vol. II, 2019.)',
    effect: (s) => {
      s.flags['syn:tribal-trojan'] = true;
      s.log.unshift('▸ Synergy: Tribal Trojan. Polarization + Impersonation compounding.');
    },
  },
];

export function synergyById(id: string): SynergyDef | undefined {
  return SYNERGIES.find((sn) => sn.id === id);
}

export function isSynergyVisible(s: GameState, sn: SynergyDef): boolean {
  return bothAtLeast(s, sn.trees, sn.threshold) && !s.flags[sn.id];
}

export function isSynergyTeased(s: GameState, sn: SynergyDef): boolean {
  if (s.flags[sn.id]) return false;
  if (isSynergyVisible(s, sn)) return false;
  const halfThreshold = Math.max(1, Math.floor(sn.threshold / 2));
  return bothAtLeast(s, sn.trees, halfThreshold);
}

export function canActivateSynergy(s: GameState, sn: SynergyDef): boolean {
  if (!isSynergyVisible(s, sn)) return false;
  for (const [res, amt] of Object.entries(sn.cost)) {
    if (s.resources[res as ResourceId] < (amt as number)) return false;
  }
  return true;
}

export function activateSynergy(s: GameState, id: string): boolean {
  const sn = synergyById(id);
  if (!sn) return false;
  if (!canActivateSynergy(s, sn)) return false;
  for (const [res, amt] of Object.entries(sn.cost)) {
    s.resources[res as ResourceId] -= amt as number;
  }
  sn.effect(s);
  s.flags[sn.id] = true;
  return true;
}
