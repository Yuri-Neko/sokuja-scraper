import { fetchJSON } from "./http.js";

export async function getPlaylist(episodeSlug) {
  const slug = episodeSlug.replace(/^\/|\/$/g, "");
  const data = await fetchJSON(`/api/playlist/?slug=${encodeURIComponent(slug)}`);
  const episodes = (data?.episodes || []).map((e) => ({
    slug: e.slug,
    episodeNumber: Number(e.episodeNumber) || e.episodeNumber,
  }));
  const idx = episodes.findIndex((e) => e.slug === slug);
  return {
    current: slug,
    total: episodes.length,
    currentIndex: idx >= 0 ? idx + 1 : null,
    prev: idx > 0 ? episodes[idx - 1] : null,
    next: idx >= 0 && idx < episodes.length - 1 ? episodes[idx + 1] : null,
    episodes,
  };
}
