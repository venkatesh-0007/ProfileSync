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

async function fetchLeetCodeAvatar(username: string): Promise<string | null> {
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

    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        query,
        variables: { username },
      }),
      next: { revalidate: 300 }
    });

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

async function fetchCodeforcesAvatar(username: string): Promise<string | null> {
  try {
    const res = await fetch(`https://codeforces.com/api/user.info?handles=${username}`, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 300 }
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status === "OK" && json.result && json.result.length > 0) {
      const avatarUrl = json.result[0].titlePhoto || json.result[0].avatar;
      if (avatarUrl) {
        return avatarUrl.startsWith("//") ? `https:${avatarUrl}` : avatarUrl;
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
    lower.includes("no-avatar") ||      // Codeforces default
    lower.includes("no-title") ||       // Codeforces default alternative
    lower.includes("user_default") ||   // CodeChef default
    lower.includes("default_thumb") ||  // CodeChef default alt
    lower.includes("identicon")         // GitHub default identicon
  );
}

function isFallbackBuffer(buffer: Buffer, contentType: string): boolean {
  if (buffer.length === 1506 || buffer.length === 18906) {
    return true;
  }
  if (contentType.includes("svg")) {
    const content = buffer.toString("utf-8");
    if (content.includes("person-accent")) {
      return true;
    }
  }
  return false;
}

async function fetchCodeChefAvatar(username: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.codechef.com/users/${username}`, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 300 }
    });
    if (!res.ok) return null;
    const html = await res.text();
    
    // Search using the profileImage class in either src first or class first order
    const matchProfile = html.match(/<img[^>]*class=[\x27\"]profileImage[\x27\"][^>]*src=[\x27\"]([^\x27\"]+)[\x27\"]/i) ||
                         html.match(/<img[^>]*src=[\x27\"]([^\x27\"]+)[\x27\"][^>]*class=[\x27\"]profileImage[\x27\"]/i);
    if (matchProfile && matchProfile[1]) {
      return matchProfile[1];
    }

    // Legacy fallback regex matches
    const match = html.match(/(https?:\/\/cdn\.codechef\.com\/images\/profile\/[^"\s]+)/);
    if (match && match[1]) {
      return match[1];
    }
    
    const matchAlt = html.match(/src="([^"]*codechef\.com\/images\/profile\/[^"]+)"/);
    if (matchAlt && matchAlt[1]) {
      return matchAlt[1];
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

  if (cached && (now - cached.timestamp < CACHE_TTL)) {
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
    imageUrl = `https://unavatar.io/github/${cleanUsername}`;
  } else if (platform === "linkedin") {
    imageUrl = `https://unavatar.io/linkedin/${cleanUsername}`;
  } else if (platform === "leetcode") {
    imageUrl = await fetchLeetCodeAvatar(cleanUsername);
  } else if (platform === "codeforces") {
    imageUrl = await fetchCodeforcesAvatar(cleanUsername);
  } else if (platform === "codechef") {
    imageUrl = await fetchCodeChefAvatar(cleanUsername);
  }

  // If platform lookup yields nothing, try general unavatar fallback
  if (!imageUrl) {
    imageUrl = `https://unavatar.io/${cleanUsername}`;
  }

  let finalUrl = imageUrl;
  let isEmpty = isDefaultAvatar(finalUrl);
  let isFallback = false;
  let buffer: Buffer | null = null;
  let contentType = "image/png";

  try {
    let res = await fetch(finalUrl, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 300 }
    });

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

    // If fetch failed, try general fallback
    if (!isValidFetch && finalUrl !== `https://unavatar.io/${cleanUsername}`) {
      finalUrl = `https://unavatar.io/${cleanUsername}`;
      isEmpty = isDefaultAvatar(finalUrl);
      res = await fetch(finalUrl, {
        headers: { "User-Agent": USER_AGENT },
        next: { revalidate: 300 }
      });
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

    // If still failing, try email Gravatar fallback
    if (!isValidFetch && email) {
      finalUrl = `https://unavatar.io/${email}`;
      isEmpty = isDefaultAvatar(finalUrl);
      res = await fetch(finalUrl, {
        headers: { "User-Agent": USER_AGENT },
        next: { revalidate: 300 }
      });
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
