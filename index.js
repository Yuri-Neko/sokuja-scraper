#!/usr/bin/env node
import { scrapeHome } from "./src/home.js";
import { scrapeAnime } from "./src/anime.js";
import { getEpisode } from "./src/episode.js";
import { getPlaylist } from "./src/playlist.js";
import { resolveMirrors, getVideoMirrors } from "./src/video.js";
import { search } from "./src/search.js";
import { scrapeGenre } from "./src/genre.js";
import { scrapeSchedule } from "./src/schedule.js";

const HELP = `Sokuja Scraper (axios + cheerio)

Pemakaian:
  node index.js home                              halaman depan (ongoing, completed, populer, terbaru)
  node index.js anime <slug>                      detail anime (slug dengan/prefix /anime/)
  node index.js episode <slug-episode>            data episode: ID, playlist, video mirror
  node index.js episodes <slug-episode>           daftar semua episode anime (playlist API)
  node index.js mirrors <episodeId>               raw JSON /api/video-mirrors/?e=<id>
  node index.js video <slug-episode>              rantai lengkap: halaman ep -> episodeId -> mirror siap pakai
  node index.js search <query>                    pencarian anime
  node index.js genre <slug> [page]               daftar anime per genre
  node index.js jadwal                            jadwal rilis per hari

Env (.env):
  BASE_URL=https://x6.sokuja.uk
  PROXY_URL=            # http proxy opsional
  SCRAPINGANT_API_KEY=  # fallback bila terblokir Cloudflare
`;

const args = process.argv.slice(2);
const cmd = args[0];
const out = (data) => process.stdout.write(JSON.stringify(data, null, 2) + "\n");

async function main() {
  const a1 = args[1];
  switch (cmd) {
    case "home":
      return out(await scrapeHome());
    case "anime": {
      if (!a1) return console.error(HELP);
      return out(await scrapeAnime(a1));
    }
    case "episode":
      if (!a1) return console.error(HELP);
      return out(await getEpisode(a1));
    case "episodes":
      if (!a1) return console.error(HELP);
      return out(await getPlaylist(a1));
    case "mirrors":
      if (!a1) return console.error(HELP);
      return out(await getVideoMirrors(a1));
    case "video": {
      if (!a1) return console.error(HELP);
      const { episodeId, title, playlist, video } = await getEpisode(a1);
      return out({
        slug: a1,
        title,
        episodeId,
        playlist: { prev: playlist.prev, next: playlist.next, total: playlist.total },
        video,
      });
    }
    case "search":
      if (!a1) return console.error(HELP);
      return out(await search(args.slice(1).join(" ")));
    case "genre":
      if (!a1) return console.error(HELP);
      return out(await scrapeGenre(a1, Number(args[2] || 1)));
    case "jadwal":
      return out(await scrapeSchedule());
    default:
      console.log(HELP);
  }
}

main().catch((e) => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});
