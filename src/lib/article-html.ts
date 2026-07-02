import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

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

/**
 * Render article markdown to sanitized HTML with YouTube embeds.
 * Runs on the server (in ISR page components) so the heavy `marked` +
 * `isomorphic-dompurify` parsers never ship to the client bundle.
 */
export function renderArticleHtml(content: string): string {
  const rawHtml = marked.parse(content) as string;
  const sanitized = DOMPurify.sanitize(rawHtml, { ADD_TAGS: ["iframe"], ADD_ATTR: ["allow", "allowfullscreen", "frameborder"] });
  return renderContentWithVideo(sanitized);
}
