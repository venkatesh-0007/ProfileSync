import { NextRequest, NextResponse } from "next/server";

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="#09090b"/><circle cx="50" cy="40" r="20" fill="#27272a"/><path d="M20 90 C 20 70, 80 70, 80 90" fill="#27272a"/></svg>`;

interface CacheEntry {
  buffer: Buffer | null;
  contentType: string;
  isEmpty: boolean;
  isFallback: boolean;
  imageUrl: string | null;
  timestamp: number;
}

const IMAGE_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 1000; // 1 minute

async function fetchLeetCodeAvatar(username: string, refresh = false): Promise<string | null> {
  try {
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          profile {
            userAvatar
          }
        }
      }
    `;

    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        query,
        variables: { username },
      }),
    };
    if (refresh) fetchOptions.cache = "no-store";
    else fetchOptions.next = { revalidate: 300 };

    const res = await fetch("https://leetcode.com/graphql", fetchOptions);

    if (!res.ok) return null;
    const json = await res.json();
    const avatar = json?.data?.matchedUser?.profile?.userAvatar;
    if (avatar) {
      if (avatar.startsWith("/")) {
        return `https://leetcode.com${avatar}`;
      }
      return avatar;
    }
    return null;
  } catch (e) {
    console.error("Error fetching LeetCode avatar:", e);
    return null;
  }
}

async function fetchCodeforcesAvatar(username: string, refresh = false): Promise<string | null> {
  try {
    const fetchOptions: RequestInit = { headers: { "User-Agent": USER_AGENT } };
    if (refresh) fetchOptions.cache = "no-store";
    else fetchOptions.next = { revalidate: 300 };

    const res = await fetch(`https://codeforces.com/api/user.info?handles=${username}`, fetchOptions);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status === "OK" && json.result && json.result.length > 0) {
      const user = json.result[0];
      // Prefer avatar (1:1 square crop) if valid, fallback to titlePhoto
      let avatarUrl = user.avatar || user.titlePhoto;
      if (avatarUrl && isDefaultAvatar(avatarUrl) && user.titlePhoto && !isDefaultAvatar(user.titlePhoto)) {
        avatarUrl = user.titlePhoto;
      }
      if (avatarUrl) {
        let fullUrl = avatarUrl.startsWith("//") ? `https:${avatarUrl}` : avatarUrl;
        // Fix userpic.codeforces.org returning Cloudflare 503 by rewriting to codeforces.com/userpic/
        fullUrl = fullUrl
          .replace(/^https?:\/\/userpic\.codeforces\.org\//, "https://codeforces.com/userpic/")
          .replace(/^\/\/userpic\.codeforces\.org\//, "https://codeforces.com/userpic/");
        return fullUrl;
      }
    }
    return null;
  } catch (e) {
    console.error("Error fetching Codeforces avatar:", e);
    return null;
  }
}

function isDefaultAvatar(url: string | null): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes("default_avatar") || // LeetCode default
    lower.includes("leetcode_avatar") || // LeetCode default alternative
    lower.includes("no-avatar") ||      // Codeforces default
    lower.includes("no-title") ||       // Codeforces default alternative
    lower.includes("user_default") ||   // CodeChef default
    lower.includes("default_thumb") ||  // CodeChef default alt
    lower.includes("identicon")         // GitHub default identicon
  );
}

function isRasterImage(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 16) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  // GIF: GIF87a / GIF89a
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return true;
  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return true;
  // AVIF / HEIC container: ftyp
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return true;
  return false;
}

function isFallbackBuffer(buffer: Buffer, contentType: string): boolean {
  if (!buffer || buffer.length < 50) return true;
  const ct = contentType.toLowerCase();
  if (ct.includes("svg") || ct.includes("xml") || ct.includes("html") || ct.includes("text")) {
    return true;
  }
  // If not valid raster image magic bytes, treat as fallback/non-image
  if (!isRasterImage(buffer)) {
    return true;
  }
  // Check if buffer contains text-based fallback cues
  const startStr = buffer.subarray(0, 200).toString("utf-8").toLowerCase();
  if (
    startStr.startsWith("<") ||
    startStr.includes("<!doctype") ||
    startStr.includes("<html") ||
    startStr.includes("<svg") ||
    startStr.includes("unavatar")
  ) {
    return true;
  }
  return false;
}

async function fetchCodeChefAvatar(username: string, refresh = false): Promise<string | null> {
  try {
    const fetchOptions: RequestInit = { headers: { "User-Agent": USER_AGENT } };
    if (refresh) fetchOptions.cache = "no-store";
    else fetchOptions.next = { revalidate: 300 };

    const res = await fetch(`https://www.codechef.com/users/${username}`, fetchOptions);
    if (!res.ok) return null;
    const html = await res.text();
    
    // Search using the profileImage class in either src first or class first order
    const matchProfile = html.match(/<img[^>]*class=[\x27\"]profileImage[\x27\"][^>]*src=[\x27\"]([^\x27\"]+)[\x27\"]/i) ||
                         html.match(/<img[^>]*src=[\x27\"]([^\x27\"]+)[\x27\"][^>]*class=[\x27\"]profileImage[\x27\"]/i);
    let matchedUrl = matchProfile && matchProfile[1] ? matchProfile[1] : null;

    if (!matchedUrl) {
      // Legacy fallback regex matches
      const match = html.match(/(https?:\/\/cdn\.codechef\.com\/images\/profile\/[^"\s]+)/);
      if (match && match[1]) {
        matchedUrl = match[1];
      }
    }

    if (!matchedUrl) {
      const matchAlt = html.match(/src="([^"]*codechef\.com\/images\/profile\/[^"]+)"/);
      if (matchAlt && matchAlt[1]) {
        matchedUrl = matchAlt[1];
      }
    }

    if (matchedUrl) {
      if (matchedUrl.startsWith("//")) {
        return `https:${matchedUrl}`;
      } else if (matchedUrl.startsWith("/")) {
        return `https://www.codechef.com${matchedUrl}`;
      }
      return matchedUrl;
    }

    return null;
  } catch (e) {
    console.error("Error scraping CodeChef avatar:", e);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const username = searchParams.get("username");
  const email = searchParams.get("email");
  const returnJson = searchParams.get("json") === "true";
  const refresh = searchParams.get("refresh") === "true";

  if (!platform || !username) {
    return NextResponse.json({ error: "Missing platform or username parameter" }, { status: 400 });
  }

  // Strip trailing slashes and clean username
  let cleanUsername = username.trim().replace(/\/+$/, "");

  // Strip leading '@' if present
  if (cleanUsername.startsWith("@")) {
    cleanUsername = cleanUsername.substring(1);
  }

  // If cleanUsername is a URL or contains slash/domain indicators, parse it
  if (cleanUsername.includes("/") || cleanUsername.includes(".")) {
    try {
      let urlString = cleanUsername;
      if (!cleanUsername.startsWith("http://") && !cleanUsername.startsWith("https://")) {
        urlString = `https://${cleanUsername}`;
      }
      const url = new URL(urlString);
      const pathSegments = url.pathname.split("/").filter(Boolean);
      
      if (url.hostname.includes("github.com")) {
        cleanUsername = pathSegments[0] || cleanUsername;
      } else if (url.hostname.includes("linkedin.com")) {
        if (pathSegments[0] === "in" && pathSegments[1]) {
          cleanUsername = pathSegments[1];
        } else {
          cleanUsername = pathSegments[0] || cleanUsername;
        }
      } else if (url.hostname.includes("leetcode.com")) {
        if (pathSegments[0] === "u" && pathSegments[1]) {
          cleanUsername = pathSegments[1];
        } else {
          cleanUsername = pathSegments[0] || cleanUsername;
        }
      } else if (url.hostname.includes("codechef.com")) {
        if (pathSegments[0] === "users" && pathSegments[1]) {
          cleanUsername = pathSegments[1];
        } else {
          cleanUsername = pathSegments[0] || cleanUsername;
        }
      } else if (url.hostname.includes("codeforces.com")) {
        if ((pathSegments[0] === "profile" || pathSegments[0] === "ratings") && pathSegments[1]) {
          cleanUsername = pathSegments[1];
        } else {
          cleanUsername = pathSegments[0] || cleanUsername;
        }
      }
    } catch (e) {
      console.error("Failed to parse username URL:", e);
    }
  }

  // LinkedIn name-to-handle parsing (convert "First Last" to "first-last")
  if (platform === "linkedin" && cleanUsername.includes(" ")) {
    cleanUsername = cleanUsername.toLowerCase().replace(/\s+/g, "-");
  }

  const cacheKey = `${platform}:${cleanUsername}:${email || ""}`;
  const cached = IMAGE_CACHE.get(cacheKey);
  const now = Date.now();

  if (!refresh && cached && (now - cached.timestamp < CACHE_TTL)) {
    if (returnJson) {
      return NextResponse.json({
        platform,
        username: cleanUsername,
        imageUrl: cached.imageUrl,
        isEmpty: cached.isEmpty,
        isFallback: cached.isFallback
      });
    }

    if (cached.isFallback || !cached.buffer) {
      return new NextResponse(DEFAULT_SVG, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=300",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new NextResponse(new Uint8Array(cached.buffer), {
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  let imageUrl: string | null = null;

  // Resolve image URL based on platform
  if (platform === "github") {
    // GitHub provides direct access with size parameter for crisp resolution
    imageUrl = `https://github.com/${cleanUsername}.png?size=400`;
  } else if (platform === "linkedin") {
    // For linkedin we use unavatar. We append cache-buster on refresh to bypass unavatar cache.
    imageUrl = `https://unavatar.io/linkedin/${cleanUsername}${refresh ? `?t=${Date.now()}` : ""}`;
  } else if (platform === "leetcode") {
    imageUrl = await fetchLeetCodeAvatar(cleanUsername, refresh);
  } else if (platform === "codeforces") {
    imageUrl = await fetchCodeforcesAvatar(cleanUsername, refresh);
  } else if (platform === "codechef") {
    imageUrl = await fetchCodeChefAvatar(cleanUsername, refresh);
  }

  const isCodingPlatform = platform === "leetcode" || platform === "codeforces" || platform === "codechef";

  // If a coding platform has no image URL, it is an empty or non-existent profile
  if (!imageUrl && (isCodingPlatform || platform === "github")) {
    IMAGE_CACHE.set(cacheKey, {
      buffer: null,
      contentType: "image/svg+xml",
      isEmpty: true,
      isFallback: false,
      imageUrl: null,
      timestamp: now,
    });

    if (returnJson) {
      return NextResponse.json({
        platform,
        username: cleanUsername,
        imageUrl: null,
        isEmpty: true,
        isFallback: false,
      });
    }

    return new NextResponse(DEFAULT_SVG, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // If general lookup yields nothing and not a specialized platform, try general unavatar fallback
  if (!imageUrl) {
    imageUrl = `https://unavatar.io/${cleanUsername}`;
  }

  let finalUrl = imageUrl;
  let isEmpty = isDefaultAvatar(finalUrl);
  let isFallback = false;
  let buffer: Buffer | null = null;
  let contentType = "image/png";

  try {
    const fetchOptions: RequestInit = refresh
      ? { headers: { "User-Agent": USER_AGENT }, cache: "no-store" }
      : { headers: { "User-Agent": USER_AGENT }, next: { revalidate: 300 } };

    let res = await fetch(finalUrl, fetchOptions);

    let isValidFetch = res.ok;

    if (isValidFetch) {
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      contentType = res.headers.get("content-type") || "image/png";
      if (isFallbackBuffer(buffer, contentType)) {
        isValidFetch = false;
        buffer = null;
      }
    }

    // Only fallback to general unavatar if not a dedicated coding network or github
    if (!isCodingPlatform && platform !== "github") {
      const unavatarFallbackUrl = `https://unavatar.io/${cleanUsername}`;
      if (!isValidFetch && finalUrl !== unavatarFallbackUrl && !finalUrl.startsWith(`https://unavatar.io/${cleanUsername}`)) {
        finalUrl = unavatarFallbackUrl;
        isEmpty = isDefaultAvatar(finalUrl);
        res = await fetch(finalUrl, fetchOptions);
        isValidFetch = res.ok;
        if (isValidFetch) {
          const arrayBuffer = await res.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
          contentType = res.headers.get("content-type") || "image/png";
          if (isFallbackBuffer(buffer, contentType)) {
            isValidFetch = false;
            buffer = null;
          }
        }
      }

      // If still failing, try email Gravatar fallback if email provided
      if (!isValidFetch && email) {
        finalUrl = `https://unavatar.io/${email}`;
        isEmpty = isDefaultAvatar(finalUrl);
        res = await fetch(finalUrl, fetchOptions);
        isValidFetch = res.ok;
        if (isValidFetch) {
          const arrayBuffer = await res.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
          contentType = res.headers.get("content-type") || "image/png";
          if (isFallbackBuffer(buffer, contentType)) {
            isValidFetch = false;
            buffer = null;
          }
        }
      }
    }

    if (!isValidFetch || !buffer) {
      isFallback = true;
    } else {
      if (!isEmpty) {
        isEmpty = isDefaultAvatar(res.url || finalUrl);
      }
    }

    // Cache the resolved result
    IMAGE_CACHE.set(cacheKey, {
      buffer,
      contentType,
      isEmpty: isEmpty || isFallback,
      isFallback,
      imageUrl: isFallback ? null : finalUrl,
      timestamp: now
    });

    if (returnJson) {
      return NextResponse.json({
        platform,
        username: cleanUsername,
        imageUrl: isFallback ? null : finalUrl,
        isEmpty: isEmpty || isFallback, // Fallback/failure counts as empty
        isFallback
      });
    }

    if (isFallback || !buffer) {
      return new NextResponse(DEFAULT_SVG, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=300",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Error proxying avatar image:", err);
    if (returnJson) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({
        platform,
        username: cleanUsername,
        imageUrl: null,
        isEmpty: true,
        isFallback: true,
        error: errMsg
      });
    }
    return new NextResponse(DEFAULT_SVG, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
