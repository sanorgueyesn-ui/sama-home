import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SCREENSHOTS_DIR = path.join(ROOT_DIR, "public", "images", "screenshots");
const LANDING_DIR = path.join(ROOT_DIR, "public", "images", "landing");

function getBase64Image(filename: string): string {
  const filePath = path.join(SCREENSHOTS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Screenshot not found: ${filePath}`);
  }
  const buffer = fs.readFileSync(filePath);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

async function renderMockups() {
  console.log("Loading screenshot assets...");
  const dashboardBase64 = getBase64Image("app-dashboard-desktop.png");
  const planningBase64 = getBase64Image("app-planning-desktop.png");
  const caisseMobileBase64 = getBase64Image("app-caisse-mobile.png");

  console.log("Launching Chromium via Playwright...");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // Retina 2x quality
  });
  const page = await context.newPage();

  // -------------------------------------------------------------
  // 1. RENDER MULTI-DEVICES STUDIO (mockup-multi-devices-studio.jpg)
  // -------------------------------------------------------------
  console.log("Rendering Studio Multi-Devices (PC, Tablette, Smartphone)...");
  const studioHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1920px;
        height: 1080px;
        background: radial-gradient(circle at 50% 30%, #162430 0%, #0c161d 55%, #050a0e 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        position: relative;
      }
      /* Studio Glow & Ambient Light */
      .ambient-glow {
        position: absolute;
        width: 1200px;
        height: 700px;
        top: 10%;
        left: 20%;
        background: radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, rgba(14, 165, 233, 0.08) 40%, transparent 70%);
        filter: blur(80px);
        pointer-events: none;
      }
      /* Floor Reflection */
      .floor-reflection {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 300px;
        background: linear-gradient(to top, rgba(5, 10, 14, 0.95), transparent);
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      }
      .scene-container {
        position: relative;
        width: 1700px;
        height: 940px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding-bottom: 60px;
      }

      /* ----------------- 1. DESKTOP MONITOR (CENTER) ----------------- */
      .desktop-wrapper {
        position: absolute;
        bottom: 80px;
        left: 360px;
        width: 1040px;
        z-index: 10;
        display: flex;
        flex-direction: column;
        align-items: center;
        filter: drop-shadow(0 40px 60px rgba(0,0,0,0.8));
      }
      .monitor-bezel {
        width: 1040px;
        height: 650px;
        background: #111820;
        border-radius: 20px;
        padding: 14px 14px 20px 14px;
        box-shadow: 
          0 0 0 2px rgba(255,255,255,0.15),
          inset 0 1px 1px rgba(255,255,255,0.2),
          0 25px 50px -12px rgba(0,0,0,0.9);
        display: flex;
        flex-direction: column;
        position: relative;
      }
      .camera-dot {
        position: absolute;
        top: 6px;
        left: 50%;
        transform: translateX(-50%);
        width: 6px;
        height: 6px;
        background: #050a0e;
        border-radius: 50%;
        box-shadow: inset 0 0 2px rgba(255,255,255,0.3);
      }
      .monitor-screen {
        width: 100%;
        height: 100%;
        background: #080e14;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        position: relative;
      }
      .browser-bar {
        height: 36px;
        background: #18222c;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        display: flex;
        align-items: center;
        padding: 0 14px;
        gap: 12px;
      }
      .window-buttons {
        display: flex;
        gap: 6px;
      }
      .dot { width: 10px; height: 10px; border-radius: 50%; }
      .dot-red { background: #ef4444; }
      .dot-yellow { background: #eab308; }
      .dot-green { background: #10b981; }
      .url-bar {
        flex: 1;
        max-width: 480px;
        height: 24px;
        background: rgba(0,0,0,0.35);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        display: flex;
        align-items: center;
        padding: 0 10px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
        gap: 6px;
        margin: 0 auto;
      }
      .desktop-content {
        flex: 1;
        width: 100%;
        height: calc(100% - 36px);
        overflow: hidden;
        position: relative;
      }
      .desktop-content img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top;
      }
      /* Stand */
      .monitor-stand {
        width: 220px;
        height: 90px;
        background: linear-gradient(to right, #253341, #334456, #253341);
        clip-path: polygon(18% 0%, 82% 0%, 100% 100%, 0% 100%);
        margin-top: -2px;
        z-index: -1;
      }
      .monitor-base {
        width: 320px;
        height: 14px;
        background: linear-gradient(to right, #1e293b, #334155, #1e293b);
        border-radius: 4px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.6);
        margin-top: -4px;
      }

      /* ----------------- 2. TABLET (LEFT FOREGROUND) ----------------- */
      .tablet-wrapper {
        position: absolute;
        bottom: 30px;
        left: 120px;
        width: 440px;
        height: 610px;
        background: #151d26;
        border-radius: 28px;
        padding: 12px;
        box-shadow: 
          0 0 0 2px rgba(255,255,255,0.2),
          -25px 35px 60px rgba(0,0,0,0.85);
        z-index: 20;
        transform: rotate(-3deg);
        filter: drop-shadow(0 25px 30px rgba(0,0,0,0.7));
      }
      .tablet-camera {
        position: absolute;
        top: 7px;
        left: 50%;
        transform: translateX(-50%);
        width: 6px;
        height: 6px;
        background: #070d13;
        border-radius: 50%;
      }
      .tablet-screen {
        width: 100%;
        height: 100%;
        background: #080f15;
        border-radius: 18px;
        overflow: hidden;
      }
      .tablet-screen img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top;
      }

      /* ----------------- 3. SMARTPHONE (RIGHT FOREGROUND) ----------------- */
      .phone-wrapper {
        position: absolute;
        bottom: 25px;
        right: 180px;
        width: 290px;
        height: 590px;
        background: #17222c;
        border-radius: 46px;
        padding: 10px;
        box-shadow: 
          0 0 0 2.5px rgba(255,255,255,0.25),
          25px 35px 60px rgba(0,0,0,0.9);
        z-index: 30;
        transform: rotate(3deg);
        filter: drop-shadow(0 30px 40px rgba(0,0,0,0.8));
      }
      .phone-screen {
        width: 100%;
        height: 100%;
        background: #04090e;
        border-radius: 38px;
        overflow: hidden;
        position: relative;
        display: flex;
        flex-direction: column;
      }
      .dynamic-island {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        width: 90px;
        height: 24px;
        background: #000000;
        border-radius: 20px;
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
      }
      .camera-lens {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #0b1520;
      }
      .sensor {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #050a10;
      }
      .phone-screen img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top;
      }
      .home-bar {
        position: absolute;
        bottom: 8px;
        left: 50%;
        transform: translateX(-50%);
        width: 110px;
        height: 4px;
        background: rgba(255,255,255,0.5);
        border-radius: 4px;
        z-index: 50;
      }

      /* Floating Badges */
      .badge {
        position: absolute;
        background: rgba(18, 30, 38, 0.92);
        border: 1px solid rgba(245, 158, 11, 0.4);
        padding: 12px 18px;
        border-radius: 18px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.7);
        backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 40;
      }
      .badge-icon {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 14px;
      }
      .badge-wave {
        top: 140px;
        right: 120px;
        border-color: rgba(245, 158, 11, 0.4);
      }
      .badge-wave .badge-icon {
        background: #f59e0b;
        color: #000;
      }
      .badge-caisse {
        bottom: 70px;
        left: 480px;
        border-color: rgba(16, 185, 129, 0.4);
      }
      .badge-caisse .badge-icon {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }
      .badge-title {
        color: #ffffff;
        font-weight: 800;
        font-size: 13px;
      }
      .badge-sub {
        color: #fcd34d;
        font-size: 11px;
        font-weight: 600;
      }
      .badge-caisse .badge-sub {
        color: #34d399;
      }
    </style>
  </head>
  <body>
    <div class="ambient-glow"></div>
    <div class="floor-reflection"></div>

    <div class="scene-container">
      
      <!-- DESKTOP DISPLAY (CENTER) -->
      <div class="desktop-wrapper">
        <div class="monitor-bezel">
          <div class="camera-dot"></div>
          <div class="monitor-screen">
            <div class="browser-bar">
              <div class="window-buttons">
                <div class="dot dot-red"></div>
                <div class="dot dot-yellow"></div>
                <div class="dot dot-green"></div>
              </div>
              <div class="url-bar">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>https://app.samahome.sn/dashboard</span>
              </div>
            </div>
            <div class="desktop-content">
              <img src="${dashboardBase64}" alt="SAMA HOME Dashboard" />
            </div>
          </div>
        </div>
        <div class="monitor-stand"></div>
        <div class="monitor-base"></div>
      </div>

      <!-- TABLET (LEFT) -->
      <div class="tablet-wrapper">
        <div class="tablet-camera"></div>
        <div class="tablet-screen">
          <img src="${planningBase64}" alt="SAMA HOME Planning" />
        </div>
      </div>

      <!-- SMARTPHONE (RIGHT) -->
      <div class="phone-wrapper">
        <div class="phone-screen">
          <div class="dynamic-island">
            <div class="camera-lens"></div>
            <div class="sensor"></div>
          </div>
          <img src="${caisseMobileBase64}" alt="SAMA HOME Mobile Caisse" />
          <div class="home-bar"></div>
        </div>
      </div>

      <!-- LIVE BADGE 1 -->
      <div class="badge badge-wave">
        <div class="badge-icon">✓</div>
        <div>
          <div class="badge-title">Wave Reçu : +45 000 FCFA</div>
          <div class="badge-sub">Suite Almadies 104 • En Caisse Direct</div>
        </div>
      </div>

      <!-- LIVE BADGE 2 -->
      <div class="badge badge-caisse">
        <div class="badge-icon">⚡</div>
        <div>
          <div class="badge-title">Caisse &amp; Dépenses Reliées</div>
          <div class="badge-sub">0 FCFA d&apos;écart calculé • Zéro fraude</div>
        </div>
      </div>

    </div>
  </body>
  </html>
  `;

  await page.setContent(studioHtml, { waitUntil: "load" });
  await page.waitForTimeout(500);

  // Save as high-res Studio image (replaces mockup-multi-devices-studio.jpg)
  const studioTargetPath = path.join(LANDING_DIR, "mockup-multi-devices-studio.jpg");
  await page.screenshot({
    path: studioTargetPath,
    type: "jpeg",
    quality: 95,
  });
  console.log("Saved:", studioTargetPath);

  // -------------------------------------------------------------
  // 2. RENDER HERO MULTI-DEVICES PNG (mockup-multi-devices.png)
  // -------------------------------------------------------------
  console.log("Rendering Hero Multi-Devices PNG...");
  const heroTargetPath = path.join(LANDING_DIR, "mockup-multi-devices.png");
  await page.screenshot({
    path: heroTargetPath,
    type: "png",
  });
  console.log("Saved:", heroTargetPath);

  // Mirror also to root public/images/landing/ if it exists
  const rootLandingDir = path.join(ROOT_DIR, "..", "public", "images", "landing");
  if (fs.existsSync(rootLandingDir)) {
    fs.copyFileSync(studioTargetPath, path.join(rootLandingDir, "mockup-multi-devices-studio.jpg"));
    fs.copyFileSync(heroTargetPath, path.join(rootLandingDir, "mockup-multi-devices.png"));
    console.log("Mirrored to root public/images/landing/");
  }

  // -------------------------------------------------------------
  // 3. INDIVIDUAL MOCKUPS: PC, TABLET, SMARTPHONE
  // -------------------------------------------------------------
  console.log("Rendering Individual Mockups...");

  // A. PC / Studio Display (mockup-pc-dashboard.png)
  const pcHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1400px;
        height: 900px;
        background: radial-gradient(circle at 50% 40%, #162430 0%, #0c161d 60%, #050a0e 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .monitor-bezel {
        width: 1200px;
        height: 720px;
        background: #111820;
        border-radius: 20px;
        padding: 14px 14px 20px 14px;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.15), 0 35px 70px rgba(0,0,0,0.9);
        display: flex;
        flex-direction: column;
        position: relative;
      }
      .camera-dot {
        position: absolute;
        top: 6px;
        left: 50%;
        transform: translateX(-50%);
        width: 6px;
        height: 6px;
        background: #050a0e;
        border-radius: 50%;
      }
      .monitor-screen {
        width: 100%;
        height: 100%;
        background: #080e14;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .browser-bar {
        height: 38px;
        background: #18222c;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        display: flex;
        align-items: center;
        padding: 0 16px;
        gap: 12px;
      }
      .window-buttons { display: flex; gap: 6px; }
      .dot { width: 10px; height: 10px; border-radius: 50%; }
      .dot-red { background: #ef4444; }
      .dot-yellow { background: #eab308; }
      .dot-green { background: #10b981; }
      .url-bar {
        flex: 1;
        max-width: 520px;
        height: 26px;
        background: rgba(0,0,0,0.35);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        display: flex;
        align-items: center;
        padding: 0 12px;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 500;
        gap: 8px;
        margin: 0 auto;
      }
      .screen-img {
        width: 100%;
        height: calc(100% - 38px);
        object-fit: cover;
        object-position: top;
      }
      .monitor-stand {
        width: 240px;
        height: 80px;
        background: linear-gradient(to right, #253341, #334456, #253341);
        clip-path: polygon(18% 0%, 82% 0%, 100% 100%, 0% 100%);
      }
      .monitor-base {
        width: 360px;
        height: 16px;
        background: linear-gradient(to right, #1e293b, #334155, #1e293b);
        border-radius: 4px;
        box-shadow: 0 12px 25px rgba(0,0,0,0.6);
        margin-top: -4px;
      }
    </style>
  </head>
  <body>
    <div class="monitor-bezel">
      <div class="camera-dot"></div>
      <div class="monitor-screen">
        <div class="browser-bar">
          <div class="window-buttons">
            <div class="dot dot-red"></div>
            <div class="dot dot-yellow"></div>
            <div class="dot dot-green"></div>
          </div>
          <div class="url-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>https://app.samahome.sn/dashboard</span>
          </div>
        </div>
        <img class="screen-img" src="${dashboardBase64}" alt="SAMA HOME Dashboard Desktop" />
      </div>
    </div>
    <div class="monitor-stand"></div>
    <div class="monitor-base"></div>
  </body>
  </html>
  `;
  await page.setContent(pcHtml);
  await page.waitForTimeout(300);
  const pcPath = path.join(LANDING_DIR, "mockup-pc-dashboard.png");
  await page.screenshot({ path: pcPath });
  console.log("Saved:", pcPath);

  // B. TABLET / iPad (mockup-tablet-planning.png)
  const tabletHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1200px;
        height: 850px;
        background: radial-gradient(circle at 50% 40%, #162430 0%, #0c161d 60%, #050a0e 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .tablet-bezel {
        width: 960px;
        height: 660px;
        background: #151d26;
        border-radius: 32px;
        padding: 16px;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.2), 0 35px 70px rgba(0,0,0,0.85);
        position: relative;
      }
      .tablet-cam {
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 6px;
        height: 6px;
        background: #070d13;
        border-radius: 50%;
      }
      .tablet-screen {
        width: 100%;
        height: 100%;
        border-radius: 20px;
        overflow: hidden;
      }
      .tablet-screen img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top;
      }
    </style>
  </head>
  <body>
    <div class="tablet-bezel">
      <div class="tablet-cam"></div>
      <div class="tablet-screen">
        <img src="${planningBase64}" alt="SAMA HOME Planning Tablette" />
      </div>
    </div>
  </body>
  </html>
  `;
  await page.setContent(tabletHtml);
  await page.waitForTimeout(300);
  const tabletPath = path.join(LANDING_DIR, "mockup-tablet-planning.png");
  await page.screenshot({ path: tabletPath });
  console.log("Saved:", tabletPath);

  // C. SMARTPHONE / iPhone (mockup-phone-caisse.png)
  const phoneHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 800px;
        height: 1000px;
        background: radial-gradient(circle at 50% 40%, #162430 0%, #0c161d 60%, #050a0e 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .phone-bezel {
        width: 440px;
        height: 890px;
        background: #17222c;
        border-radius: 54px;
        padding: 14px;
        box-shadow: 0 0 0 3px rgba(255,255,255,0.25), 0 40px 80px rgba(0,0,0,0.9);
        position: relative;
      }
      .phone-screen {
        width: 100%;
        height: 100%;
        background: #050a0e;
        border-radius: 42px;
        overflow: hidden;
        position: relative;
      }
      .dynamic-island {
        position: absolute;
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        width: 110px;
        height: 28px;
        background: #000;
        border-radius: 20px;
        z-index: 50;
      }
      .phone-screen img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top;
      }
      .home-bar {
        position: absolute;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        width: 140px;
        height: 5px;
        background: rgba(255,255,255,0.6);
        border-radius: 4px;
        z-index: 50;
      }
    </style>
  </head>
  <body>
    <div class="phone-bezel">
      <div class="phone-screen">
        <div class="dynamic-island"></div>
        <img src="${caisseMobileBase64}" alt="SAMA HOME Caisse Smartphone" />
        <div class="home-bar"></div>
      </div>
    </div>
  </body>
  </html>
  `;
  await page.setContent(phoneHtml);
  await page.waitForTimeout(300);
  const phonePath = path.join(LANDING_DIR, "mockup-phone-caisse.png");
  await page.screenshot({ path: phonePath });
  console.log("Saved:", phonePath);

  await browser.close();
  console.log("All individual mockups successfully generated!");
}

renderMockups().catch((err) => {
  console.error("Error rendering mockups:", err);
  process.exit(1);
});
