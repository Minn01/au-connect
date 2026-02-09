import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return NextResponse.json(
          { error: "URL must use http or https protocol" },
          { status: 400 },
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }

    // Fetch the URL with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AUConnectBot/1.0; +https://auconnect.com)",
        },
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeout);
      console.error("Failed to fetch URL:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch URL" },
        { status: 400 },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
        },
        { status: 400 },
      );
    }

    // Get content type
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json(
        { error: "URL does not return HTML content" },
        { status: 400 },
      );
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Helper function to get meta content
    const getMetaContent = (property: string): string | null => {
      // Try Open Graph tags first
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (meta) return meta.getAttribute("content");

      // Try name attribute (for Twitter cards, etc.)
      meta = document.querySelector(`meta[name="${property}"]`);
      if (meta) return meta.getAttribute("content");

      return null;
    };

    // Extract metadata
    const title =
      getMetaContent("og:title") ||
      getMetaContent("twitter:title") ||
      document.querySelector("title")?.textContent?.trim() ||
      null;

    const description =
      getMetaContent("og:description") ||
      getMetaContent("twitter:description") ||
      getMetaContent("description") ||
      null;

    let image =
      getMetaContent("og:image") || getMetaContent("twitter:image") || null;

    // Make image URL absolute if it's relative
    if (image && !image.startsWith("http")) {
      try {
        image = new URL(image, parsedUrl.origin).href;
      } catch (e) {
        console.warn("Failed to resolve relative image URL:", image);
        image = null;
      }
    }

    const siteName = getMetaContent("og:site_name") || parsedUrl.hostname;

    // Get favicon
    let favicon: string | null = null;
    const iconLink = document.querySelector('link[rel*="icon"]');
    if (iconLink) {
      const href = iconLink.getAttribute("href");
      if (href) {
        try {
          favicon = href.startsWith("http")
            ? href
            : new URL(href, parsedUrl.origin).href;
        } catch (e) {
          console.warn("Failed to resolve favicon URL:", href);
        }
      }
    }

    // Fallback to default favicon
    if (!favicon) {
      favicon = `${parsedUrl.origin}/favicon.ico`;
    }

    const metadata = {
      title,
      description,
      image,
      siteName,
      favicon,
    };

    return NextResponse.json(metadata, { status: 200 });
  } catch (error) {
    console.error("Link preview error:", error);
    return NextResponse.json(
      { error: "Internal server error while fetching link preview" },
      { status: 500 },
    );
  }
}
