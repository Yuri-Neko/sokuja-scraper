import { fetchJSON, BASE_URL } from "./http.js";

async function headOk(url) {
  try {
    const { default: axios } = await import("axios");
    await axios.head(url, { timeout: 15000, maxRedirects: 3 });
    return true;
  } catch (e) {
    const status = e.response?.status;
    return status && status < 400;
  }
}

export async function getVideoMirrors(episodeId) {
  return fetchJSON(`/api/video-mirrors/?e=${encodeURIComponent(episodeId)}`);
}

export async function resolveMirrors(episodeId) {
  const data = await getVideoMirrors(episodeId);
  const mirrors = data?.mirrors || [];
  const groups = data?.videoHostFallbackGroups || [];

  const out = [];
  for (const m of mirrors) {
    const entry = {
      serverName: m.serverName,
      quality: m.quality,
      embedType: m.embedType,
      embedUrl: m.embedUrl,
      directUrl: null,
      alternates: [],
    };

    if (m.embedType === "mp4") {
      entry.directUrl = m.embedUrl;
      if (!(await headOk(m.embedUrl))) {
        const u = new URL(m.embedUrl);
        const pathPart = u.pathname;
        for (const group of groups) {
          for (const host of group) {
            const alt = `https://${host}${pathPart}`;
            if (await headOk(alt)) {
              entry.alternates.push(alt);
              break;
            }
          }
          if (entry.alternates.length) break;
        }
      }
    }
    out.push(entry);
  }

  return {
    mirrors: out,
    videoHostFallbacks: data?.videoHostFallbacks || [],
    videoHostFallbackGroups: groups,
  };
}

export function toIframe(embedUrl) {
  return embedUrl.startsWith("http") ? embedUrl : BASE_URL + embedUrl;
}
