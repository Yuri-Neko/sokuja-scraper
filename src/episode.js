import { fetchHTML } from "./http.js";
import { extractRscNumber, absoluteUrl } from "./utils.js";
import { getPlaylist } from "./playlist.js";
import { resolveMirrors } from "./video.js";

export async function getEpisodePage(slug) {
  const path = slug.startsWith("http") ? slug : `/${slug.replace(/^\/|\/$/g, "")}/`;
  const html = await fetchHTML(path);

  const episodeId = extractRscNumber(html, "episodeId");
  const animeId = extractRscNumber(html, "animeId");

  let title = null;
  try {
    const { cheerio } = await import("./utils.js");
    const $c = cheerio.load(html);
    title = $c("h1").first().text().trim() || null;
  } catch {}

  return {
    slug: path.replace(/^\//, "").replace(/\/$/, ""),
    url: absoluteUrl(path),
    title,
    episodeId,
    animeId,
  };
}

export async function getEpisode(slug) {
  const page = await getEpisodePage(slug);
  if (!page.episodeId) {
    throw new Error(
      `episodeId tidak ditemukan di halaman ${page.slug} (kemungkinan 403/CF challenge atau halaman 404)`
    );
  }
  const [playlist, video] = await Promise.all([
    getPlaylist(page.slug),
    resolveMirrors(page.episodeId),
  ]);

  return { ...page, playlist, video };
}
