/**
 * Generates URL-safe slugs from fundraiser titles and ensures global uniqueness by appending numeric suffixes. Queries the Fundraiser collection to avoid collisions on create and update.
 * @name Shivum Arora
 * @date 2026-06-09
 */
export function slugifyTitle(title) {
  let base = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  if (!base) base = "fundraiser";
  return base;
}

/** Globally unique slug: `name`, `name_(1)`, `name_(2)`, … */
export async function uniqueSlug(Fundraiser, title, excludeId = null) {
  const base = slugifyTitle(title);
  let slug = base;
  let n = 1;
  while (true) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Fundraiser.findOne(query).select("_id").lean();
    if (!exists) return slug;
    slug = `${base}_(${n})`;
    n++;
  }
}
