// A favourite artist/label is either a Discogs pick ({ name, discogsId }, the
// shape the profile has always stored) or a Bandcamp-only one
// ({ name, bcUrl, source: 'bandcamp' }) for acts Discogs doesn't list.
// discogsId alone can't identify the second kind, hence one shared key.
export const favoriteKey = favorite => (favorite.discogsId ? `d:${favorite.discogsId}` : `bc:${favorite.bcUrl}`);

export const hasFavorite = (list, candidate) => list.some(item => favoriteKey(item) === favoriteKey(candidate));

export const discogsFavorite = result => ({ name: result.title, discogsId: result.id });

export const bandcampFavorite = result => ({ name: result.title, bcUrl: result.bcUrl, source: 'bandcamp' });
