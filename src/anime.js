import { fetchHTML } from "./http.js";
import { cheerio, absoluteUrl, parseCardsIn } from "./utils.js";

function parseInfo($) {
  const info = {};
  $("dl div").each((_, el) => {
    const dt = $(el).find("dt").first();
    const dd = $(el).find("dd").first();
    if (!dt.length || !dd.length) return;
    const label = dt.text().trim();
    const hrefs = dd
      .find("a")
      .map((__, a) => $(a).text().trim())
      .get()
      .filter(Boolean);
    info[label] = hrefs.length ? hrefs : dd.text().trim();
  });
  return {
    status: info["Status"] || null,
    type: info["Tipe"] || null,
    year: info["Tahun"] ? Number(info["Tahun"]) || info["Tahun"] : null,
    season: info["Musim"] || null,
    totalEpisodes: info["Episode"] ? Number(info["Episode"]) || info["Episode"] : null,
    duration: info["Durasi"] || null,
    subtitle: info["Subtitle"] || null,
    fansub: info["Fansub"] || null,
    studio: info["Studio"] || null,
    director: info["Sutradara"] || null,
  };
}

function section($, re) {
  const h2 = $("h2").filter((_, el) => re.test($(el).text())).first();
  return h2.length ? h2.parent().parent() : null;
}

function parseEpisodeList($) {
  const sec = section($, /Daftar Episode/i);
  if (!sec) return [];
  const list = [];
  const seen = new Set();
  sec.find('a[href*="-subtitle-indonesia/"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr("href");
    const slug = href.replace(/^\//, "").replace(/\/$/, "");
    if (seen.has(slug)) return;
    seen.add(slug);
    list.push({
      slug,
      url: absoluteUrl(href),
      title: $a.text().replace(/\s+/g, " ").trim() || slug,
      episodeNumber: slug.match(/-episode-(\d+)-/)?.[1] ? Number(slug.match(/-episode-(\d+)-/)[1]) : null,
    });
  });
  return list;
}

function parseCast($) {
  const sec = section($, /Pemeran/i);
  if (!sec) return [];
  return sec
    .find('a[href^="/cast/"]')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
}

function parseRelated($) {
  const sec = section($, /Anime Terkait/i);
  return sec ? parseCardsIn($, sec) : [];
}

export async function scrapeAnime(slug) {
  const path = slug.startsWith("/anime/") ? slug : `/anime/${slug.replace(/\/$/, "")}/`;
  const html = await fetchHTML(path.endsWith("/") ? path : path + "/");
  const $ = cheerio.load(html);

  let ld = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const d = JSON.parse($(el).text());
      if (d["@type"] === "TVSeries") ld = d;
    } catch {}
  });

  const title = $("h1").first().text().trim() || ld?.name || null;
  const score = $("span.text-2xl").first().text().trim() || ld?.aggregateRating?.ratingValue || null;
  const poster =
    ld?.image || absoluteUrl($('meta[property="og:image"]').attr("content"));
  const genres = $('a[href^="/genre/"]')
    .filter((_, el) => $(el).closest("nav").length === 0)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((g) => g && g !== "Genre");
  const synopsis =
    ld?.description ||
    $("h2")
      .filter((_, el) => /Sinopsis/.test($(el).text()))
      .parent()
      .parent()
      .find("p")
      .first()
      .text()
      .trim() ||
      null;

  return {
    slug: path.replace(/^\/anime\//, "").replace(/\/$/, ""),
    url: absoluteUrl(path),
    title,
    altTitles: ld?.alternateName || null,
    poster,
    score: score ? Number(score) || score : null,
    synopsis,
    genres: [...new Set(genres.length ? genres : ld?.genre || [])],
    ...parseInfo($),
    cast: parseCast($),
    episodes: parseEpisodeList($),
    related: parseRelated($),
  };
}
