import { BASE_URL } from "./http.js";
import * as cheerio from "cheerio";

export function absoluteUrl(src) {
  if (!src) return null;
  if (src.startsWith("http")) return src;
  return BASE_URL + (src.startsWith("/") ? src : "/" + src);
}

export function decodeNextImage(srcset) {
  if (!srcset) return null;
  const m = srcset.match(/url=([^&\s"]+)/);
  if (!m) return absoluteUrl(srcset.split(/\s/)[0]);
  return absoluteUrl(decodeURIComponent(m[1]));
}

export function extractRscNumber(html, key) {
  const m = html.match(new RegExp(`"?${key}"?\\s*:\\\\?"?(\\d+)`));
  if (!m) {
    const m2 = html.match(new RegExp(`\\\\\\"${key}\\\\\\":(\\d+)`));
    if (m2) return Number(m2[1]);
    return null;
  }
  return Number(m[1]);
}

export function slugToAnimePath(episodeSlug) {
  const s = episodeSlug.replace(/^-end-/, "-").replace(/^-/, "");
  const anime = s
    .replace(/-episode-\d+-subtitle-indonesia$/, "-subtitle-indonesia")
    .replace(/-subtitle-indonesia$/, "-subtitle-indonesia");
  return `/anime/${anime}/`;
}

export function parseEpisodeSlug(slug) {
  const anime = slug.replace(/-episode-\d+-subtitle-indonesia$/, "");
  const num = slug.match(/-episode-(\d+)-/)?.[1] || null;
  return { animeSlug: anime, episodeNumber: num ? Number(num) : null };
}

export function parseCard($, el) {
  const $c = $(el);
  const href = $c.attr("href") || "";
  const img = $c.find("img").first();
  const badges = $c.find("span").map((_, s) => $(s).text().trim()).get().filter(Boolean);
  let score = null;
  const scoreBadge = badges.find((b) => /^★/.test(b));
  if (scoreBadge) score = scoreBadge.replace(/^★\s*/, "") || null;
  const type = badges.find((b) => b !== scoreBadge) || null;
  const epBadge = $c.text().match(/(?:Episode|Ep\.?)\s*(\d+)/i)?.[1] || null;
  return {
    slug: href.replace(/^\/anime\//, "").replace(/\/$/, ""),
    url: absoluteUrl(href),
    title: $c.find("img").attr("alt") || $c.text().replace(/\s+/g, " ").trim().slice(0, 120),
    cover: decodeNextImage(img.attr("srcset")) || absoluteUrl(img.attr("src")),
    type,
    score,
    episode: epBadge ? Number(epBadge) : null,
  };
}

export function parseCardsIn($, container) {
  const out = [];
  const seen = new Set();
  container.find('a[href^="/anime/"]').each((_, el) => {
    const c = parseCard($, el);
    if (c.slug && !seen.has(c.slug) && c.cover) {
      seen.add(c.slug);
      out.push(c);
    }
  });
  return out;
}

export function sectionByTitle($, re) {
  const h2 = $("h2").filter((_, el) => re.test($(el).text())).first();
  if (!h2.length) return null;
  return h2.parent().parent();
}

export { cheerio };
