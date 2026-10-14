type PublicListingSeo = {
  id: string;
  title: string;
  title_te: string | null;
  description: string | null;
  published_at: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getPublicListingsUrl(query: URLSearchParams) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;
  const url = new URL('/rest/v1/public_listings', supabaseUrl);
  url.search = query.toString();
  return {url, anonKey};
}

export async function getPublicListingSeo(id: string): Promise<PublicListingSeo | null> {
  if (!UUID_PATTERN.test(id)) return null;
  const query = new URLSearchParams({
    select: 'id,title,title_te,description,published_at',
    id: `eq.${id}`,
    limit: '1'
  });
  const config = getPublicListingsUrl(query);
  if (!config) return null;

  try {
    const response = await fetch(config.url, {
      headers: {apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}`},
      next: {revalidate: 3600}
    });
    if (!response.ok) {
      console.error(`Could not load public listing metadata (${response.status})`);
      return null;
    }
    const rows = await response.json() as PublicListingSeo[];
    return Array.isArray(rows) ? rows[0] ?? null : null;
  } catch (error) {
    console.error('Could not load public listing metadata:', error);
    return null;
  }
}

export async function getPublicListingSitemap(): Promise<PublicListingSeo[]> {
  const query = new URLSearchParams({
    select: 'id,title,title_te,description,published_at',
    order: 'published_at.desc'
  });
  const config = getPublicListingsUrl(query);
  if (!config) return [];

  try {
    const listings: PublicListingSeo[] = [];
    for (let from = 0; ; from += 1000) {
      const response = await fetch(config.url, {
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Range: `${from}-${from + 999}`,
          'Range-Unit': 'items'
        },
        next: {revalidate: 3600}
      });
      if (!response.ok) {
        console.error(`Could not load listings for sitemap (${response.status})`);
        return [];
      }
      const rows = await response.json() as PublicListingSeo[];
      if (!Array.isArray(rows)) return [];
      listings.push(...rows);
      if (rows.length < 1000) {
        return listings.filter(listing => UUID_PATTERN.test(listing.id));
      }
    }
  } catch (error) {
    console.error('Could not load listings for sitemap:', error);
    return [];
  }
}
