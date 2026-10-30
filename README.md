# Sokuja Scraper

Scraper web untuk [SOKUJA](https://x6.sokuja.uk) (streaming & download anime subtitle Indonesia) menggunakan **axios + cheerio** (Node.js, ESM).

> ⚠️ Hanya untuk tujuan edukasi & riset pribadi. Dukung industri anime dengan streaming/watching di situs resmi.

## Fitur

- ✅ 9 command CLI lengkap: home, anime, episode, playlist, video, mirrors, search, genre, jadwal
- ✅ Ekstraksi otomatis `episodeId` dari payload RSC Next.js (tidak perlu ID manual)
- ✅ Direct URL video MP4 + deteksi host fallback otomatis
- ✅ Anti-Cloudflare berlapis: rotasi proxy (http/socks4/socks5) → fallback ScrapingAnt
- ✅ Output JSON terstruktur (contoh asli tersedia di [`examples/`](examples/))

## Instalasi

```bash
git clone https://github.com/Yuri-Neko/sokuja-scraper.git
cd sokuja-scraper
npm install
cp .env.example .env   # lalu sesuaikan bila perlu
```

## Konfigurasi (`.env`)

| Variabel | Default | Keterangan |
|---|---|---|
| `BASE_URL` | `https://x6.sokuja.uk` | Domain utama (ganti ke `sokuja.id` / `sokuja.net` saat domain utama berganti) |
| `UA` | UA iPhone | User-Agent terbukti lolos Cloudflare |
| `PROXY_LIST` | *(kosong)* | Proxy opsional, pisahkan dengan spasi/koma. Contoh: `http://ip:port socks4://ip:port`. Kosongkan bila dijalankan dari ISP rumah |
| `SCRAPINGANT_API_KEY` | *(kosong)* | API key fallback saat terblokir Cloudflare (free tier tersedia) |
| `DELAY_MS` | `1200` | Jeda antar request (rate limit) |
| `RETRIES` | `2` | Percobaan ulang per request |
| `TIMEOUT_MS` | `30000` | Timeout per request |

## Pemakaian

```bash
node index.js <command> [args]
```

| Command | Keterangan | Contoh |
|---|---|---|
| `home` | Homepage: ongoing, completed, populer, update terbaru | `node index.js home` |
| `anime <slug>` | Detail anime lengkap | `node index.js anime mairimashita-iruma-kun-season-3-subtitle-indonesia` |
| `episode <slug>` | Data episode: episodeId, playlist, video | `node index.js episode mairimashita-iruma-kun-season-3-episode-5-subtitle-indonesia` |
| `episodes <slug>` | Daftar semua episode anime + prev/next | `node index.js episodes <slug-episode>` |
| `video <slug>` | Rantai lengkap sampai direct URL MP4 | `node index.js video <slug-episode>` |
| `mirrors <id>` | Raw JSON `/api/video-mirrors/?e=<id>` | `node index.js mirrors 1807` |
| `search <query>` | Pencarian anime | `node index.js search "one piece"` |
| `genre <slug> [page]` | Daftar anime per genre + pagination | `node index.js genre action 2` |
| `jadwal` | Jadwal rilis 7 hari + jam tayang | `node index.js jadwal` |

## Peta Path / Endpoint

| Path / Endpoint | Metode | Data yang Diambil |
|---|---|---|
| `/` | HTML | Ongoing Series, Anime Completed, Populer (mingguan/bulanan/sepanjang masa), Update Terbaru |
| `/anime/{slug}-subtitle-indonesia/` | HTML | Judul, alt title, poster, skor, sinopsis, genre, status, tipe, tahun, musim, durasi, studio, sutradara, cast, daftar episode, anime terkait |
| `/{slug}-episode-{n}-subtitle-indonesia/` | HTML | `episodeId` (dari payload RSC), `animeId`, judul |
| `/api/playlist/?slug={slug}` | JSON | Semua episode (`slug`, `episodeNumber`) + prev/next |
| `/api/video-mirrors/?e={id}` | JSON | `mirrors[]` (serverName, embedUrl, embedType, quality), `videoHostFallbacks`, `videoHostFallbackGroups` |
| `/api/search/?q={query}` | JSON | id, slug, judul, thumbnail, type, status, year, score, viewCount |
| `/genre/{slug}/?page={n}` | HTML | Kartu anime per genre, totalPages |
| `/jadwal-rilis-anime/` | HTML | Jadwal 7 hari + jam tayang (WIB) |

## Contoh Output

```json
// node index.js video mairimashita-iruma-kun-season-3-episode-5-subtitle-indonesia
{
  "slug": "mairimashita-iruma-kun-season-3-episode-5-subtitle-indonesia",
  "episodeId": 1807,
  "playlist": { "total": 21, "prev": { "...": "..." }, "next": { "...": "..." } },
  "video": {
    "mirrors": [
      {
        "serverName": "SOKUJA",
        "quality": "720p",
        "embedType": "mp4",
        "embedUrl": "https://global.nontony.uk/video2/.../sokuja.iruma.kun.s3.5.720p.mp4",
        "directUrl": "https://global.nontony.uk/video2/.../sokuja.iruma.kun.s3.5.720p.mp4",
        "alternates": []
      }
    ],
    "videoHostFallbacks": ["storages.sokuja.uk", "..."]
  }
}
```

Output lengkap (hasil run asli): [`examples/`](examples/) — `home.json`, `anime.json`, `episode.json`, `episodes.json`, `video.json`, `mirrors.json`, `search.json`, `genre.json`, `jadwal.json`.

## Cara Kerja

1. **Halaman episode** (Next.js) diambil, lalu `episodeId` diekstrak dari payload RSC (`"episodeId":1807`) via regex — lihat [`src/episode.js`](src/episode.js)
2. `episodeId` → **`/api/video-mirrors/`** → dapat `embedUrl` + `embedType`
3. `embedType: "mp4"` → langsung dapat direct URL; bila HEAD check gagal, scraper coba ganti host sesuai `videoHostFallbackGroups`
4. Bila gagal 403 (Cloudflare), scraper otomatis: rotasi proxy berikutnya → fallback ScrapingAnt

## Struktur Project

```
├── index.js          # CLI
├── .env.example      # template konfigurasi
├── examples/         # output JSON asli tiap command
└── src/
    ├── http.js       # axios instance + retry + rotasi proxy + fallback ScrapingAnt
    ├── utils.js      # parser kartu, decode gambar Next.js, ekstraksi RSC
    ├── home.js       # homepage
    ├── anime.js      # detail anime (JSON-LD + DOM)
    ├── episode.js    # halaman episode → episodeId
    ├── playlist.js   # /api/playlist
    ├── video.js      # /api/video-mirrors + resolver fallback host
    ├── search.js     # /api/search
    ├── genre.js      # /genre/{slug}
    └── schedule.js   # /jadwal-rilis-anime
```

## Troubleshooting

| Masalah | Solusi |
|---|---|
| `403 diblokir Cloudflare` | Jalankan dari ISP rumah tanpa proxy, isi `PROXY_LIST` dengan proxy ID, atau isi `SCRAPINGANT_API_KEY` |
| Proxy mati (timeout) | Ambil proxy hidup dari proxyscrape (filter country=id), tambahkan ke `PROXY_LIST` |
| `404 Not Found` | Cek slug; slug anime selalu berakhiran `-subtitle-indonesia` |
| Domain utama berganti | Sokuja punya domain cadangan: `sokuja.id`, `sokuja.net` — update `BASE_URL` |

## License

MIT
