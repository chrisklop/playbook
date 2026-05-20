import type { PhaseId } from '../game/types';

export interface PhaseCopy {
  headline: string[];      // multi-line big text
  unlocks: string[];       // 2-4 bullet points
  hint: string;            // small italic tip
}

export const PHASE_COPY: Partial<Record<PhaseId, PhaseCopy>> = {
  blog: {
    headline: ['YOU SPIN UP', 'A FAKE NEWS SITE'],
    unlocks: [
      'Facebook unlocked — engagement era begins',
      'Real ad money trickles in',
      'New patrons are watching',
    ],
    hint: 'The next phase needs engagement, not attention. Watch for the cap-raisers.',
  },
  social: {
    headline: ['YOUR BLOG GOES VIRAL', 'THE ALGORITHM SERVES YOU NOW'],
    unlocks: [
      'TikTok unlocked',
      'YouTube unlocked',
      'Conspiracy tree gains ×1.7 amp on YouTube',
    ],
    hint: 'Heat compounds across platforms now. Mind your throttle.',
  },
  influencer: {
    headline: ['PAYWALLED CREDIBILITY', 'COORDINATION OFF-PLATFORM'],
    unlocks: [
      'Telegram unlocked — direct-line ops channel',
      'Substack unlocked — long-form authority',
      'A new tier of patrons appears',
    ],
    hint: 'Credibility is the gate to Cable. Plan accordingly.',
  },
  cable: {
    headline: ['BOOKINGS LAND', 'YOU ENTER THE CHYRON ROTATION'],
    unlocks: [
      'Podcast networks unlocked',
      'Narrative dominance compounds harder',
      'The Mebro Index climbs faster — they are noticing',
    ],
    hint: 'You are now too big to ignore. Mebro is preparing a response.',
  },
  aisaturation: {
    headline: ['AI SATURATION', 'EVERY PLATFORM POSTS FOR YOU NOW'],
    unlocks: [
      'Synthetic Reality unlocked',
      'Every asset multiplies',
      'The endgame begins — push for prestige',
    ],
    hint: 'There is no Phase 6. This is what wins look like — for now.',
  },
};
