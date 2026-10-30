import axios from "axios";
import { SocksProxyAgent } from "socks-proxy-agent";
import "dotenv/config";

const UA =
  process.env.UA ||
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";

export const BASE_URL = process.env.BASE_URL || "https://x6.sokuja.uk";
export const SCRAPINGANT_KEY = process.env.SCRAPINGANT_API_KEY || "";
const DELAY_MS = Number(process.env.DELAY_MS || 1200);
const RETRIES = Number(process.env.RETRIES || 2);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 30000);

const PROXY_LIST = (process.env.PROXY_LIST || process.env.PROXY_URL || "")
  .split(/[\s,]+/)
  .map((s) => s.trim())
  .filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isProxyDead = (e) =>
  ["ECONNREFUSED", "EPROTO", "ECONNRESET", "EHOSTUNREACH", "ETIMEDOUT"].includes(e.code) ||
  e.message === "Request failed with status code 403" === false ||
  (e.message?.includes("timeout") && !e.response);

function parseProxy(p) {
  try {
    const u = new URL(p.startsWith("http") ? p : `http://${p}`);
    return { protocol: u.protocol.replace(":", ""), host: u.hostname, port: Number(u.port) };
  } catch {
    return null;
  }
}

let lastReq = 0;
async function throttle() {
  const gap = Date.now() - lastReq;
  if (gap < DELAY_MS) await sleep(DELAY_MS - gap);
  lastReq = Date.now();
}

function buildInstance(proxyUrl) {
  const cfg = {
    timeout: TIMEOUT_MS,
    headers: {
      "User-Agent": UA,
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      Referer: BASE_URL + "/",
    },
  };
  if (proxyUrl) {
    const raw = proxyUrl.startsWith("http") || proxyUrl.includes("://") ? proxyUrl : `http://${proxyUrl}`;
    const proto = new URL(raw).protocol.replace(":", "");
    if (proto.startsWith("socks")) {
      const agent = new SocksProxyAgent(raw);
      cfg.httpAgent = agent;
      cfg.httpsAgent = agent;
      cfg.proxy = false;
    } else {
      const proxy = parseProxy(raw);
      if (!proxy) throw new Error(`PROXY tidak valid: ${proxyUrl}`);
      cfg.proxy = proxy;
    }
  }
  return axios.create(cfg);
}

async function scrapingant(url) {
  const { data } = await axios.get("https://api.scrapingant.com/v2/general", {
    params: { url, "x-api-key": SCRAPINGANT_KEY },
    timeout: 90000,
  });
  return typeof data === "string" ? data : JSON.stringify(data);
}

async function tryCandidates(fn, url, attempts) {
  let lastErr;
  for (const attempt of attempts) {
    try {
      await throttle();
      return await fn(attempt);
    } catch (e) {
      lastErr = e;
      const status = e.response?.status;
      if (status === 404) throw new Error(`404 Not Found: ${url}`);
      if (status === 403 && !attempt.proxy) break; // blokir CF tanpa proxy -> fallback
      if (!attempt.proxy && isProxyDead(e)) break;
      await sleep(1500);
    }
  }
  if (SCRAPINGANT_KEY) {
    for (let i = 0; i < 2; i++) {
      try {
        return await scrapingant(url);
      } catch (e) {
        lastErr = e;
        await sleep(3000);
      }
    }
  }
  const status = lastErr?.response?.status;
  if (status === 403)
    throw new Error(
      `403 diblokir Cloudflare: ${url}\nSolusi: 1) jalankan dari ISP rumah tanpa proxy, ` +
        `2) isi PROXY_LIST / SCRAPINGANT_API_KEY di .env`
    );
  throw lastErr;
}

const attempts = PROXY_LIST.map((p) => ({ proxy: p })).concat([{}]);

export async function fetchHTML(path) {
  const url = path.startsWith("http") ? path : BASE_URL + path;
  return tryCandidates(
    (a) => buildInstance(a.proxy).get(url, { responseType: "text" }).then((r) => r.data),
    url,
    attempts
  );
}

export async function fetchJSON(path) {
  const url = path.startsWith("http") ? path : BASE_URL + path;
  const raw = await tryCandidates(
    (a) => buildInstance(a.proxy).get(url).then((r) => r.data),
    url,
    attempts
  );
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(`Respon bukan JSON: ${url}`);
    }
  }
  return raw;
}
