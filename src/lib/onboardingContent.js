// Order of the cards in the mandatory first-login onboarding. The saved
// `onboarding.step` is an index into this list, so only ever append or
// reorder together with a plan for what an in-progress index should map to.
export const STEP_IDS = ['role', 'intro', 'artists', 'labels', 'genres', 'frequency', 'why', 'sync', 'done'];

export const MIN_ARTISTS = 3;
export const MIN_LABELS = 2;
export const MIN_GENRES = 2;

export const ROLE_OPTIONS = [
  { value: 'dj', title: 'DJ / Producer', description: "I play out or make music. I dig hard — for tracks that fit my sets, and for artists and labels I don't know yet." },
  { value: 'digger', title: 'Music Digger', description: "I don't play out, but I hunt for music all the time and I want to find the next record I'll love." },
  { value: 'listener', title: 'Music Listener', description: 'Music is my hobby. I love listening, and I want to find more of what I already like — fast.' },
];

export const FREQUENCY_OPTIONS = [
  { value: 'daily', title: 'Daily', description: 'I dig every day. Go deeper and more niche — and always give me plenty.' },
  { value: 'weekly', title: 'Weekly', description: 'A steady flow of fresh finds, every week.' },
  { value: 'biweekly', title: 'Every 14 days', description: 'A fortnightly batch that is worth sitting down for.' },
  { value: 'monthly', title: 'Monthly', description: "I'm short on time. Give me the essentials and the month's new releases, ready to play." },
  { value: 'random', title: 'Whenever I have time', description: 'No schedule. Keep it light and easy to jump into.' },
];

export const WHY_POINTS = [
  { title: 'Your favourites set the starting point', text: 'Artists, labels and genres tell WaxTree what your taste sounds like, so suggestions start close to home.' },
  { title: 'Your pace sets the depth', text: "Dig daily and you get deeper, more niche picks — and plenty of them. Check in monthly and you get the essentials, plus a month of new releases ready to play." },
  { title: 'Your library keeps it fresh', text: "Knowing what you already own lets WaxTree tag it while you dig, so your time goes to music that's new to you." },
];
