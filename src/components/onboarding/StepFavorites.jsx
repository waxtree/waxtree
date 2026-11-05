import { FavoritePicker } from '@/components/onboarding/FavoritePicker';
import { StepHeading } from '@/components/onboarding/StepHeading';
import { favoriteKey, hasFavorite } from '@/lib/favorites';
import { MIN_ARTISTS, MIN_LABELS } from '@/lib/onboardingContent';

export const StepFavorites = ({ kind, state, actions }) => {
  const isLabel = kind === 'label';
  const min = isLabel ? MIN_LABELS : MIN_ARTISTS;
  const field = isLabel ? 'favoriteLabels' : 'favoriteArtists';

  // Computed from the live list inside mutateState, not a captured copy, so
  // two quick picks within one frame can't overwrite each other.
  const add = favorite => actions.mutateState(value => {
    if (!hasFavorite(value[field], favorite)) value[field] = [...value[field], favorite];
  });
  const remove = favorite => actions.mutateState(value => {
    value[field] = value[field].filter(item => favoriteKey(item) !== favoriteKey(favorite));
  });

  return (
    <>
      <StepHeading
        title={isLabel ? 'Your favourite labels' : 'Your favourite artists'}
        subtitle={isLabel
          ? `Same idea, now for labels. Add at least ${min} — from Discogs or Bandcamp.`
          : `Search any artist, from Discogs or Bandcamp. Add at least ${min} — the more you add, the better WaxTree gets to know you.`}
      />
      <FavoritePicker
        kind={kind}
        items={state[field]}
        artistFavs={state.favoriteArtists}
        labelFavs={state.favoriteLabels}
        actions={actions}
        onAdd={add}
        onRemove={remove}
      />
    </>
  );
};
