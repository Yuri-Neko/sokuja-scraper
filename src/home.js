import { fetchHTML, BASE_URL } from "./http.js";
import {
  cheerio,
  sectionByTitle,
  parseCardsIn,
  parseCard,
  decodeNextImage,
} from "./utils.js";

function parseLatest($, container) {
  const out = [];
  const seen = new Set();
  container.find('a[href*="-episode-"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr("href") || "";
    if (!href || seen.has(href)) return;
    seen.add(href);
    const badges = $a.find("span").map((__, s) => $(s).text().trim()).get();
    const img = $a.find("img").first();
    const slug = href.replace(/^\//, "").replace(/\/$/, "");
    const card = parseCard($, el);
    out.push({
      slug,
      url: BASE_URL + href,
      title: $a.find("h3,h4").first().text().trim() || img.attr("alt") || card.title,
      cover: decodeNextImage(img.attr("srcset")) || card.cover,
      episodeNumber: Number(badges.find((b) => /^EP\s*\d+/i.test(b))?.match(/\d+/)?.[0]) || null,
      type: badges.find((b) => /^(TV|Movie|OVA|ONA|Special)$/.test(b)) || null,
      status: badges.find((b) => /^(Ongoing|Completed)$/i.test(b)) || null,
      timeAgo: badges.find((b) => /jam lalu|hari lalu|menit lalu|detik lalu/i.test(b)) || null,
    });
  });
  return out;
}

export async function scrapeHome() {
  const html = await fetchHTML("/");
  const $ = cheerio.load(html);

  const grab = (re) => {
    const sec = sectionByTitle($, re);
    return sec ? parseCardsIn($, sec) : [];
  };

  const latestSec = sectionByTitle($, /Update Terbaru/i);

  return {
    ongoing: grab(/Ongoing Series/i),
    completed: grab(/Anime Completed/i),
    popularWeekly: grab(/Populer Mingguan/i),
    popularMonthly: grab(/Populer Bulanan/i),
    popularAllTime: grab(/Populer Sepanjang Masa/i),
    latestEpisodes: latestSec ? parseLatest($, latestSec) : [],
  };
}
