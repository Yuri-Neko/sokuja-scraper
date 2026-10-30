import { fetchJSON, BASE_URL } from "./http.js";

export async function search(query) {
  const data = await fetchJSON(`/api/search/?q=${encodeURIComponent(query)}`);
  const results = (data?.results || []).map((r) => {
    const rawThumb = r.thumbnailUrl || r.coverUrl || null;
    const thumb = rawThumb ? (rawThumb.startsWith("http") ? rawThumb : BASE_URL + rawThumb) : null;
    return {
      id: r.id,
      slug: r.slug,
      title: r.title?.trim(),
      thumbnail: thumb,
      type: r.type,
      status: r.status,
      year: r.year,
      score: r.score,
      viewCount: r.viewCount,
    };
  });
  return { query, total: results.length, results };
}
