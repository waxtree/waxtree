// Runs worker(item, index) over items with at most `limit` in flight at once.
// The dashboard uses it to keep Discogs searches to a couple at a time.
export const mapLimit = async (items, limit, worker) => {
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
};
