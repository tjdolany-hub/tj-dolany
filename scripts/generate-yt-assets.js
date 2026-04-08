const sharp = require("sharp");
const path = require("path");

const OUTPUT_DIR = path.resolve(__dirname, "../../Input");
const LOGO = path.resolve(__dirname, "../public/logo.png");
const HERO = path.resolve(__dirname, "../public/hero-team.jpg");

async function generateBanner() {
  // YouTube banner: 2048 x 1152
  const W = 2048;
  const H = 1152;

  // Start with the hero team photo, cropped and darkened
  const heroResized = await sharp(HERO)
    .resize(W, H, { fit: "cover", position: "left" })
    .modulate({ brightness: 0.55 })
    .toBuffer();

  // Resize logo
  const logoSize = 280;
  const logoResized = await sharp(LOGO)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // SVG overlay with diagonal stripes, text, and gradient
  const svg = `
  <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="left-stripe" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#C41E3A" stop-opacity="0.85"/>
        <stop offset="40%" stop-color="#C41E3A" stop-opacity="0.7"/>
        <stop offset="70%" stop-color="#F5C518" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#F5C518" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="right-stripe" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0%" stop-color="#C41E3A" stop-opacity="0.85"/>
        <stop offset="40%" stop-color="#C41E3A" stop-opacity="0.7"/>
        <stop offset="70%" stop-color="#F5C518" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#F5C518" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="bottom-fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#111111" stop-opacity="0"/>
        <stop offset="70%" stop-color="#111111" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#111111" stop-opacity="0.9"/>
      </linearGradient>
      <linearGradient id="top-fade" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="#111111" stop-opacity="0"/>
        <stop offset="100%" stop-color="#111111" stop-opacity="0.5"/>
      </linearGradient>
    </defs>

    <!-- Left diagonal stripe -->
    <polygon points="0,0 500,0 250,${H} 0,${H}" fill="url(#left-stripe)"/>

    <!-- Right diagonal stripe -->
    <polygon points="${W},0 ${W - 500},0 ${W - 250},${H} ${W},${H}" fill="url(#right-stripe)"/>

    <!-- Bottom gradient -->
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bottom-fade)"/>

    <!-- Top gradient -->
    <rect x="0" y="0" width="${W}" height="${H * 0.3}" fill="url(#top-fade)"/>

    <!-- Bottom red line -->
    <rect x="0" y="${H - 4}" width="${W}" height="4" fill="#C41E3A"/>

    <!-- Club name -->
    <text x="${W / 2}" y="${H - 180}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-size="96" fill="white" letter-spacing="4">
      TJ DOLANY
    </text>

    <!-- Subtitle -->
    <text x="${W / 2}" y="${H - 120}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="600" font-size="32" fill="#A0A0A0" letter-spacing="6">
      FOTBAL A KOMUNITA
    </text>

    <!-- Yellow accent line under text -->
    <rect x="${W / 2 - 60}" y="${H - 100}" width="120" height="3" rx="1.5" fill="#F5C518"/>
  </svg>`;

  const svgBuffer = Buffer.from(svg);

  // Compose: hero + SVG overlay + logo
  const result = await sharp(heroResized)
    .composite([
      { input: svgBuffer, top: 0, left: 0 },
      {
        input: logoResized,
        top: Math.round((H - 280) / 2) - 80,
        left: Math.round((W - logoSize) / 2),
      },
    ])
    .png({ quality: 95 })
    .toFile(path.join(OUTPUT_DIR, "yt-banner.png"));

  console.log("✓ Banner saved:", path.join(OUTPUT_DIR, "yt-banner.png"), `(${Math.round(result.size / 1024)} KB)`);
}

async function generateProfilePic() {
  // YouTube profile: 800x800 (well above 98x98 minimum)
  const SIZE = 800;
  const logoSize = 500;

  const logoResized = await sharp(LOGO)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Dark circular background with logo
  const svg = `
  <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg-grad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#1A1A1A"/>
        <stop offset="85%" stop-color="#111111"/>
        <stop offset="100%" stop-color="#0A0A0A"/>
      </radialGradient>
    </defs>
    <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="url(#bg-grad)"/>
    <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2 - 8}" fill="none" stroke="#C41E3A" stroke-width="6" stroke-opacity="0.6"/>
    <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2 - 2}" fill="none" stroke="#F5C518" stroke-width="2" stroke-opacity="0.3"/>
  </svg>`;

  const bgBuffer = Buffer.from(svg);

  const result = await sharp(bgBuffer)
    .composite([
      {
        input: logoResized,
        top: Math.round((SIZE - logoSize) / 2) - 10,
        left: Math.round((SIZE - logoSize) / 2),
      },
    ])
    .png()
    .toFile(path.join(OUTPUT_DIR, "yt-profile.png"));

  console.log("✓ Profile pic saved:", path.join(OUTPUT_DIR, "yt-profile.png"), `(${Math.round(result.size / 1024)} KB)`);
}

(async () => {
  await generateBanner();
  await generateProfilePic();
  console.log("\nDone! Files in:", OUTPUT_DIR);
})();
