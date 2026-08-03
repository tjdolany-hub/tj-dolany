import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function renderContentWithVideo(html: string): string {
  return html.replace(
    /<a href="(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[^"]+)">[^<]+<\/a>/g,
    (fullMatch, url) => {
      const videoId = extractYouTubeId(url);
      if (!videoId) return fullMatch;
      return `<div class="relative w-full aspect-video rounded-xl overflow-hidden my-4"><iframe src="https://www.youtube.com/embed/${videoId}" title="Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="absolute inset-0 w-full h-full"></iframe></div>`;
    }
  );
}

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr",
  "strong", "em", "b", "i", "u", "s", "del",
  "blockquote", "ul", "ol", "li",
  "a", "img", "code", "pre",
  "table", "thead", "tbody", "tr", "td", "th",
];

/**
 * Render article markdown to sanitized HTML with YouTube embeds.
 * Runs on the server (in ISR page components) so the heavy `marked` parser
 * never ships to the client bundle. Uses `sanitize-html` (pure JS, no jsdom)
 * instead of DOMPurify — jsdom's html-encoding-sniffer dependency pulls in
 * an ESM-only package that Turbopack's server bundler can't require(),
 * crashing every article page in production (works fine locally, breaks
 * only in the actual deployed build).
 */
export function renderArticleHtml(content: string): string {
  const rawHtml = marked.parse(content) as string;
  const sanitized = sanitizeHtml(rawHtml, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
  return renderContentWithVideo(sanitized);
}
