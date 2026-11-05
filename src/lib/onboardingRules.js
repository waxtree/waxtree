import { MIN_ARTISTS, MIN_GENRES, MIN_LABELS } from '@/lib/onboardingContent';

// A library counts as linked from this device's scan, or — for someone who
// scanned on another device and is now on a fresh browser with empty local
// storage — from the track count kept in their account metadata.
export const hasLibrary = (state, session) =>
  state.ownedTracks.length > 0 || Number(session?.user?.user_metadata?.library_track_count) > 0;

// null when the card is complete; otherwise the short reason it isn't, which
// the gate shows next to the disabled Continue button.
export const stepBlocker = (stepId, state, session) => {
  switch (stepId) {
    case 'role':
      return state.onboarding.role ? null : 'Choose one to continue';
    case 'artists':
      return state.favoriteArtists.length >= MIN_ARTISTS ? null : `Add at least ${MIN_ARTISTS} artists (${state.favoriteArtists.length}/${MIN_ARTISTS})`;
    case 'labels':
      return state.favoriteLabels.length >= MIN_LABELS ? null : `Add at least ${MIN_LABELS} labels (${state.favoriteLabels.length}/${MIN_LABELS})`;
    case 'genres':
      return state.onboarding.genres.length >= MIN_GENRES ? null : `Pick at least ${MIN_GENRES} genres (${state.onboarding.genres.length}/${MIN_GENRES})`;
    case 'frequency':
      return state.onboarding.frequency ? null : 'Choose one to continue';
    case 'sync':
      return hasLibrary(state, session) || state.onboarding.noLocalLibrary ? null : "Link your music folder, or say you don't have one";
    default:
      return null;
  }
};
