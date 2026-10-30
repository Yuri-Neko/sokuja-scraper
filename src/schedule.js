import { fetchHTML } from "./http.js";
import { cheerio, parseCardsIn } from "./utils.js";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export async function scrapeSchedule() {
  const html = await fetchHTML("/jadwal-rilis-anime/");
  const $ = cheerio.load(html);

  const schedule = {};
  for (const day of DAYS) {
    const h2 = $("h2").filter((_, el) => $(el).text().trim() === day).first();
    if (!h2.length) continue;
    const grid = h2.parent().next("div.grid");
    schedule[day] = (grid.length ? parseCardsIn($, grid) : []).map((c) => ({
      slug: c.slug,
      url: c.url,
      title: c.title,
      cover: c.cover,
      time: c.type,
    }));
  }
  return { url: "jadwal-rilis-anime", days: schedule };
}
