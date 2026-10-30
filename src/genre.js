import { fetchHTML } from "./http.js";
import { cheerio, parseCard } from "./utils.js";

export async function scrapeGenre(genre, page = 1) {
  const path = `/genre/${encodeURIComponent(genre)}/${page > 1 ? `?page=${page}` : ""}`;
  const html = await fetchHTML(path);
  const $ = cheerio.load(html);

  const seen = new Set();
  const cards = [];
  $('a[href^="/anime/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href === "/anime/list-mode/" || seen.has(href)) return;
    seen.add(href);
    const card = parseCard($, el);
    if (card.cover) cards.push(card);
  });

  let totalPages = null;
  $('a[href*="page="]').each((_, el) => {
    const n = Number($(el).attr("href").match(/page=(\d+)/)?.[1]);
    if (n && (!totalPages || n > totalPages)) totalPages = n;
  });

  return { genre, page, totalPages, total: cards.length, results: cards };
}
