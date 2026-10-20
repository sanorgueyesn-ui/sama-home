import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import sharp from "sharp";

const PROJECT_ROOT = "D:/PROJE/SAMA HOME";
const OUT_DIR = path.join(PROJECT_ROOT, "Affiches/finales");
const TEMP_DIR = path.join(PROJECT_ROOT, "Affiches/.temp_render");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function getBase64(relPath) {
  const fullPath = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  const ext = path.extname(fullPath).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${fs.readFileSync(fullPath).toString("base64")}`;
}

console.log("Loading base assets...");
const LOGO_BLANC = getBase64("Logo SAMA HOME/Sama-Home-Blanc-cassé-1.png");
const LOGO_BLEU = getBase64("Logo SAMA HOME/Sama-Home-Bleu-nuit-1.png");
const LOGO_TRANSPARENT = getBase64("Logo SAMA HOME/Sama-Home-Transparent-1.png");
const LOGO_ICON = getBase64("Logo SAMA HOME/Sama-Home-icone-Transparent.png");

const APP_DASHBOARD = getBase64("web/public/images/screenshots/app-dashboard-desktop.png");
const APP_CAISSE = getBase64("web/public/images/screenshots/app-caisse-mobile.png");
const APP_PLANNING = getBase64("web/public/images/screenshots/app-planning-desktop.png");
const APP_CONTRAT = getBase64("web/public/images/screenshots/app-contrat-desktop.png");
const APP_CLIENTS = getBase64("web/public/images/screenshots/app-clients-mobile.png");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function renderHtmlToImages(htmlContent, baseName) {
  console.log(`\n========================================`);
  console.log(`Rendering ${baseName} (Square & Story)...`);
  console.log(`========================================`);

  // Square version (1080x1080)
  const squareHtml = path.join(TEMP_DIR, `${baseName}-square.html`);
  const squarePng = path.join(OUT_DIR, `${baseName}.png`);
  const squareJpg = path.join(OUT_DIR, `${baseName}.jpg`);

  fs.writeFileSync(squareHtml, htmlContent(false));

  const cmdSquare = `"${CHROME_PATH}" --headless=new --screenshot="${squarePng}" --window-size=1080,1080 --hide-scrollbars --run-all-compositor-stages-before-draw "file:///${squareHtml.replace(/\\/g, "/")}"`;
  execSync(cmdSquare, { stdio: "inherit" });

  await sharp(squarePng).jpeg({ quality: 96, chromaSubsampling: "4:4:4" }).toFile(squareJpg);
  console.log(`✓ Generated ${baseName}.png and ${baseName}.jpg (1080x1080)`);

  // Story version (1080x1920)
  const storyHtml = path.join(TEMP_DIR, `${baseName}-story.html`);
  const storyPng = path.join(OUT_DIR, `${baseName}-story.png`);
  const storyJpg = path.join(OUT_DIR, `${baseName}-story.jpg`);

  fs.writeFileSync(storyHtml, htmlContent(true));

  const cmdStory = `"${CHROME_PATH}" --headless=new --screenshot="${storyPng}" --window-size=1080,1920 --hide-scrollbars --run-all-compositor-stages-before-draw "file:///${storyHtml.replace(/\\/g, "/")}"`;
  execSync(cmdStory, { stdio: "inherit" });

  await sharp(storyPng).jpeg({ quality: 96, chromaSubsampling: "4:4:4" }).toFile(storyJpg);
  console.log(`✓ Generated ${baseName}-story.png and ${baseName}-story.jpg (1080x1920)`);
}

// ==============================================================================
// POSTER 1: Dark Luxury Tech / Agence & Logiciel Premium (Inspired by Affiche 1.jpg)
// ==============================================================================
function getPoster01Html(isStory) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  body {
    width: 1080px;
    height: ${isStory ? "1920px" : "1080px"};
    background: radial-gradient(circle at 80% 20%, #1c2e42 0%, #0a1420 50%, #060b11 100%);
    color: #ffffff;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    position: relative;
    overflow: hidden;
    padding: ${isStory ? "90px 65px 80px 65px" : "45px 55px 35px 55px"};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .glow-top-right {
    position: absolute;
    top: -100px;
    right: -100px;
    width: 700px;
    height: 700px;
    background: radial-gradient(circle, rgba(229, 72, 77, 0.22) 0%, rgba(245, 158, 11, 0.08) 40%, transparent 70%);
    pointer-events: none;
  }
  .glow-bottom-left {
    position: absolute;
    bottom: -150px;
    left: -150px;
    width: 700px;
    height: 700px;
    background: radial-gradient(circle, rgba(18, 48, 74, 0.6) 0%, transparent 70%);
    pointer-events: none;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 10;
  }
  .header-logo-wrap {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .header-logo {
    height: ${isStory ? "64px" : "52px"};
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
  }
  .header-brand-text {
    border-left: 2px solid rgba(255,255,255,0.2);
    padding-left: 14px;
    display: flex;
    flex-direction: column;
  }
  .header-brand-title {
    font-size: ${isStory ? "18px" : "15px"};
    font-weight: 800;
    letter-spacing: 2px;
    color: #ffffff;
    text-transform: uppercase;
  }
  .header-brand-sub {
    font-size: ${isStory ? "13px" : "11px"};
    font-weight: 600;
    letter-spacing: 1.5px;
    color: #E5484D;
    text-transform: uppercase;
  }
  .header-right {
    text-align: right;
  }
  .header-right-tag {
    font-size: ${isStory ? "13px" : "11px"};
    font-weight: 700;
    letter-spacing: 2.5px;
    color: #94A3B8;
    text-transform: uppercase;
  }
  .header-right-accent {
    font-size: ${isStory ? "16px" : "14px"};
    font-weight: 900;
    letter-spacing: 1.5px;
    color: #E5484D;
    text-transform: uppercase;
  }

  .hero {
    display: flex;
    ${isStory ? "flex-direction: column; align-items: center; text-align: center; gap: 30px; margin-top: 30px;" : "align-items: center; justify-content: space-between; gap: 30px; margin-top: 15px;"}
    position: relative;
    z-index: 10;
  }
  .hero-content {
    ${isStory ? "width: 100%; display: flex; flex-direction: column; align-items: center;" : "flex: 0 0 460px;"}
  }
  .badge-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 18px;
    background: rgba(229, 72, 77, 0.15);
    border: 1px solid rgba(229, 72, 77, 0.5);
    border-radius: 30px;
    font-size: ${isStory ? "14px" : "12px"};
    font-weight: 800;
    letter-spacing: 1.5px;
    color: #FF8085;
    text-transform: uppercase;
    margin-bottom: 16px;
  }
  .badge-pill-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #E5484D;
    box-shadow: 0 0 8px #E5484D;
  }
  .hero-title {
    font-size: ${isStory ? "58px" : "44px"};
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -1px;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .hero-title .white-text {
    color: #ffffff;
    display: ${isStory ? "inline" : "block"};
  }
  .hero-title .accent-text {
    color: #E5484D;
    display: ${isStory ? "inline" : "block"};
    text-shadow: 0 0 30px rgba(229, 72, 77, 0.35);
  }
  .hero-subtitle {
    font-size: ${isStory ? "18px" : "14px"};
    font-weight: 800;
    letter-spacing: 2px;
    color: #CBD5E1;
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  .hero-desc {
    font-size: ${isStory ? "16px" : "14px"};
    font-weight: 500;
    line-height: 1.55;
    color: #94A3B8;
    margin-bottom: 22px;
    ${isStory ? "max-width: 800px;" : ""}
  }
  .hero-cta {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(135deg, #E5484D 0%, #C93B40 100%);
    color: #ffffff;
    padding: ${isStory ? "16px 36px" : "12px 24px"};
    border-radius: 10px;
    font-size: ${isStory ? "16px" : "13px"};
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    box-shadow: 0 10px 30px rgba(229, 72, 77, 0.5);
  }
  .hero-cta-arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: rgba(255,255,255,0.25);
    border-radius: 50%;
    font-size: 14px;
  }

  .hero-visual {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    height: ${isStory ? "460px" : "360px"};
    width: ${isStory ? "100%" : "auto"};
    ${isStory ? "margin: 20px 0;" : "flex: 1;"}
  }
  .laptop-frame {
    position: relative;
    width: ${isStory ? "680px" : "510px"};
    height: ${isStory ? "425px" : "315px"};
    background: #0d1620;
    border: 3px solid #2a3d54;
    border-radius: 14px 14px 4px 4px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.85), 0 0 50px rgba(229, 72, 77, 0.2);
    overflow: hidden;
    z-index: 2;
  }
  .laptop-camera-bar {
    height: 18px;
    background: #152230;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .laptop-camera-dot {
    width: 5px;
    height: 5px;
    background: #334e68;
    border-radius: 50%;
  }
  .laptop-screen-img {
    width: 100%;
    height: calc(100% - 18px);
    object-fit: cover;
    object-position: top left;
    display: block;
  }
  .laptop-base {
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% + 50px);
    height: 10px;
    background: linear-gradient(180deg, #334e68 0%, #152230 100%);
    border-radius: 0 0 10px 10px;
    box-shadow: 0 15px 30px rgba(0,0,0,0.9);
    z-index: 1;
  }
  .laptop-base-notch {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 90px;
    height: 4px;
    background: #0d1620;
    border-radius: 0 0 4px 4px;
  }

  .phone-frame {
    position: absolute;
    right: ${isStory ? "90px" : "-10px"};
    bottom: ${isStory ? "-25px" : "-15px"};
    width: ${isStory ? "210px" : "165px"};
    height: ${isStory ? "430px" : "340px"};
    background: #000000;
    border: 3.5px solid #334e68;
    border-radius: 34px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.85), 0 0 35px rgba(229, 72, 77, 0.25);
    overflow: hidden;
    z-index: 5;
  }
  .phone-notch {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 65px;
    height: 16px;
    background: #000;
    border-radius: 12px;
    z-index: 10;
  }
  .phone-screen-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .services-row {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    ${isStory ? "margin-top: 30px;" : "margin-top: 15px;"}
    position: relative;
    z-index: 10;
  }
  .service-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 10px;
  }
  .service-icon-circle {
    width: ${isStory ? "62px" : "52px"};
    height: ${isStory ? "62px" : "52px"};
    border-radius: 50%;
    background: #111e2c;
    border: 1.5px solid #E5484D;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 15px rgba(229, 72, 77, 0.3);
    font-size: ${isStory ? "26px" : "22px"};
  }
  .service-label {
    font-size: ${isStory ? "13px" : "11px"};
    font-weight: 700;
    line-height: 1.35;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: #E2E8F0;
  }

  .metrics-card {
    display: flex;
    align-items: center;
    justify-content: space-around;
    background: rgba(14, 26, 38, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: ${isStory ? "24px 30px" : "16px 20px"};
    ${isStory ? "margin-top: 30px;" : "margin-top: 15px;"}
    position: relative;
    z-index: 10;
  }
  .metric-box {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .metric-icon-wrap {
    width: ${isStory ? "54px" : "44px"};
    height: ${isStory ? "54px" : "44px"};
    border-radius: 50%;
    background: #E5484D;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${isStory ? "24px" : "20px"};
    box-shadow: 0 4px 15px rgba(229, 72, 77, 0.4);
  }
  .metric-text {
    display: flex;
    flex-direction: column;
  }
  .metric-value {
    font-size: ${isStory ? "24px" : "20px"};
    font-weight: 900;
    color: #ffffff;
    line-height: 1.1;
  }
  .metric-sub {
    font-size: ${isStory ? "13px" : "11px"};
    font-weight: 600;
    color: #94A3B8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .metric-sep {
    width: 1px;
    height: 40px;
    background: rgba(255,255,255,0.12);
  }

  .footer-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(10, 18, 27, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 40px;
    padding: ${isStory ? "16px 30px" : "10px 24px"};
    ${isStory ? "margin-top: 30px;" : "margin-top: 15px;"}
    position: relative;
    z-index: 10;
  }
  .footer-contact-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: ${isStory ? "14px" : "13px"};
    font-weight: 700;
    color: #F8FAFC;
    white-space: nowrap;
  }
  .footer-contact-icon {
    width: ${isStory ? "32px" : "28px"};
    height: ${isStory ? "32px" : "28px"};
    border-radius: 50%;
    background: #E5484D;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
  }
  .footer-sep {
    width: 1px;
    height: 22px;
    background: rgba(255,255,255,0.15);
  }
  .footer-social-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .social-circle {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #E5484D;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: #fff;
    font-weight: 800;
  }
</style>
</head>
<body>
  <div class="glow-top-right"></div>
  <div class="glow-bottom-left"></div>

  <!-- Header -->
  <div class="header">
    <div class="header-logo-wrap">
      <img src="${LOGO_TRANSPARENT}" class="header-logo" alt="SAMA HOME">
      <div class="header-brand-text">
        <span class="header-brand-title">SAMA HOME</span>
        <span class="header-brand-sub">Logiciel de Gestion Immobilière</span>
      </div>
    </div>
    <div class="header-right">
      <div class="header-right-tag">AUTOMATISATION • SÉCURITÉ</div>
      <div class="header-right-accent">PERFORMANCE GARANTIE</div>
    </div>
  </div>

  <!-- Hero -->
  <div class="hero">
    <div class="hero-content">
      <div class="badge-pill">
        <div class="badge-pill-dot"></div>
        PLATEFORME N°1 AU SÉNÉGAL
      </div>
      <div class="hero-title">
        <span class="white-text">PILOTAGE </span>
        <span class="accent-text">IMMOBILIER</span>
      </div>
      <div class="hero-subtitle">POUR PROPRIÉTAIRES & GESTIONNAIRES</div>
      <div class="hero-desc">
        Gagnez du temps, sécurisez vos encaissements et gérez vos réservations, appartements et contrats en toute sérénité.
      </div>
      <div class="hero-cta">
        <span>Démarrer maintenant</span>
        <span class="hero-cta-arrow">→</span>
      </div>
    </div>

    <div class="hero-visual">
      <!-- Laptop Mockup -->
      <div class="laptop-frame">
        <div class="laptop-camera-bar">
          <div class="laptop-camera-dot"></div>
        </div>
        <img src="${APP_DASHBOARD}" class="laptop-screen-img" alt="Dashboard SAMA HOME">
        <div class="laptop-base">
          <div class="laptop-base-notch"></div>
        </div>
      </div>
      <!-- Phone Mockup -->
      <div class="phone-frame">
        <div class="phone-notch"></div>
        <img src="${APP_CAISSE}" class="phone-screen-img" alt="Caisse Mobile SAMA HOME">
      </div>
    </div>
  </div>

  <!-- Services Row -->
  <div class="services-row">
    <div class="service-item">
      <div class="service-icon-circle">📅</div>
      <div class="service-label">Réservations<br>& Planning</div>
    </div>
    <div class="service-item">
      <div class="service-icon-circle">💳</div>
      <div class="service-label">Caisse Wave<br>& OM Direct</div>
    </div>
    <div class="service-item">
      <div class="service-icon-circle">📄</div>
      <div class="service-label">Baux & Contrats<br>Automatiques</div>
    </div>
    <div class="service-item">
      <div class="service-icon-circle">📊</div>
      <div class="service-label">Statistiques<br>& Revenus</div>
    </div>
    <div class="service-item">
      <div class="service-icon-circle">🏢</div>
      <div class="service-label">Multi-Sites<br>& Immeubles</div>
    </div>
  </div>

  <!-- Metrics Card -->
  <div class="metrics-card">
    <div class="metric-box">
      <div class="metric-icon-wrap">🔒</div>
      <div class="metric-text">
        <span class="metric-value">100% Cloud</span>
        <span class="metric-sub">Données Isolées & Chiffrées</span>
      </div>
    </div>
    <div class="metric-sep"></div>
    <div class="metric-box">
      <div class="metric-icon-wrap">⚡</div>
      <div class="metric-text">
        <span class="metric-value">0 Erreur</span>
        <span class="metric-sub">Audit Caisse en Temps Réel</span>
      </div>
    </div>
    <div class="metric-sep"></div>
    <div class="metric-box">
      <div class="metric-icon-wrap">📱</div>
      <div class="metric-text">
        <span class="metric-value">24h/24 - 7j/7</span>
        <span class="metric-sub">Accès Mobile & Support Local</span>
      </div>
    </div>
  </div>

  <!-- Footer Bar -->
  <div class="footer-bar">
    <div class="footer-contact-item">
      <div class="footer-contact-icon">📞</div>
      <span>+221 77 338 66 60 / +221 77 249 50 80</span>
    </div>
    <div class="footer-sep"></div>
    <div class="footer-contact-item">
      <div class="footer-contact-icon">✉️</div>
      <span>support@samahome.sn</span>
    </div>
    <div class="footer-sep"></div>
    <div class="footer-contact-item">
      <div class="footer-contact-icon">📍</div>
      <span>Grand Yoff CICES Foire, Dakar</span>
    </div>
    <div class="footer-sep"></div>
    <div class="footer-social-wrap">
      <div class="social-circle">f</div>
      <div class="social-circle">ig</div>
      <div class="social-circle">in</div>
      <div class="social-circle">wa</div>
    </div>
  </div>
</body>
</html>`;
}

// ==============================================================================
// POSTER 2: Ambiance Studio & Harmonie Multi-Écrans (Inspired by Affiche 2.jpg)
// ==============================================================================
function getPoster02Html(isStory) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  body {
    width: 1080px;
    height: ${isStory ? "1920px" : "1080px"};
    background: radial-gradient(circle at 50% 15%, #FAF7F2 0%, #EFEAE2 50%, #E2D9CC 100%);
    color: #12304A;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    position: relative;
    overflow: hidden;
    padding: ${isStory ? "90px 65px 80px 65px" : "45px 55px 35px 55px"};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .studio-light-top {
    position: absolute;
    top: -150px;
    left: 20%;
    width: 700px;
    height: 500px;
    background: radial-gradient(ellipse, rgba(255, 255, 255, 0.9) 0%, rgba(245, 158, 11, 0.08) 50%, transparent 75%);
    pointer-events: none;
  }
  .plant-leaf-right {
    position: absolute;
    right: -60px;
    top: 15%;
    width: 320px;
    height: 550px;
    opacity: 0.15;
    background: radial-gradient(ellipse at center, #234E35 0%, transparent 70%);
    filter: blur(25px);
    pointer-events: none;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 10;
  }
  .header-logo-wrap {
    display: flex;
    align-items: center;
    gap: 16px;
    background: #ffffff;
    padding: 8px 18px;
    border-radius: 40px;
    box-shadow: 0 4px 15px rgba(18, 48, 74, 0.08);
  }
  .header-logo {
    height: ${isStory ? "46px" : "40px"};
    width: auto;
    object-fit: contain;
  }
  .header-badge {
    background: #12304A;
    color: #ffffff;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  .header-right {
    text-align: right;
  }
  .header-category {
    font-size: 12px;
    font-weight: 700;
    color: #D97706;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .header-subtag {
    font-size: 13px;
    font-weight: 800;
    color: #12304A;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .hero-titles {
    text-align: center;
    margin-top: ${isStory ? "35px" : "10px"};
    position: relative;
    z-index: 10;
  }
  .hero-title-main {
    font-size: ${isStory ? "54px" : "40px"};
    font-weight: 900;
    color: #12304A;
    line-height: 1.1;
    letter-spacing: -1px;
    margin-bottom: 8px;
  }
  .hero-title-main span {
    color: #D97706;
  }
  .hero-subtitle {
    font-size: ${isStory ? "18px" : "15px"};
    font-weight: 700;
    color: #64748B;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .stage-wrap {
    position: relative;
    width: 100%;
    height: ${isStory ? "780px" : "460px"};
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: ${isStory ? "30px" : "15px"};
    z-index: 10;
  }

  .screen-imac {
    position: absolute;
    top: ${isStory ? "20px" : "15px"};
    width: ${isStory ? "780px" : "560px"};
    height: ${isStory ? "460px" : "330px"};
    background: #0f172a;
    border: 4px solid #334155;
    border-radius: 12px;
    box-shadow: 0 30px 70px rgba(18, 48, 74, 0.25);
    overflow: hidden;
    z-index: 2;
  }
  .screen-imac-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
  }
  .imac-stand {
    position: absolute;
    bottom: -35px;
    left: 50%;
    transform: translateX(-50%);
    width: 120px;
    height: 35px;
    background: linear-gradient(180deg, #94A3B8 0%, #64748B 100%);
    border-radius: 0 0 8px 8px;
    z-index: 1;
  }

  .screen-laptop {
    position: absolute;
    right: ${isStory ? "30px" : "25px"};
    bottom: ${isStory ? "80px" : "30px"};
    width: ${isStory ? "480px" : "360px"};
    height: ${isStory ? "300px" : "220px"};
    background: #0f172a;
    border: 3px solid #475569;
    border-radius: 10px 10px 2px 2px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.35);
    overflow: hidden;
    z-index: 4;
  }
  .screen-laptop-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .screen-laptop-base {
    position: absolute;
    bottom: -8px;
    left: -15px;
    right: -15px;
    height: 8px;
    background: #94A3B8;
    border-radius: 0 0 6px 6px;
  }

  .screen-tablet {
    position: absolute;
    left: ${isStory ? "30px" : "30px"};
    bottom: ${isStory ? "90px" : "35px"};
    width: ${isStory ? "360px" : "250px"};
    height: ${isStory ? "270px" : "190px"};
    background: #0f172a;
    border: 3.5px solid #475569;
    border-radius: 16px;
    box-shadow: 0 25px 50px rgba(0,0,0,0.35);
    overflow: hidden;
    z-index: 4;
  }
  .screen-tablet-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .screen-phone {
    position: absolute;
    left: 50%;
    bottom: ${isStory ? "30px" : "10px"};
    transform: translateX(-50%);
    width: ${isStory ? "200px" : "140px"};
    height: ${isStory ? "410px" : "290px"};
    background: #000;
    border: 3.5px solid #1e293b;
    border-radius: 28px;
    box-shadow: 0 25px 50px rgba(0,0,0,0.45);
    overflow: hidden;
    z-index: 6;
  }
  .screen-phone-notch {
    position: absolute;
    top: 6px;
    left: 50%;
    transform: translateX(-50%);
    width: 55px;
    height: 14px;
    background: #000;
    border-radius: 8px;
    z-index: 10;
  }
  .screen-phone-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .floating-pill-left {
    position: absolute;
    top: ${isStory ? "120px" : "80px"};
    left: ${isStory ? "30px" : "15px"};
    background: #ffffff;
    border: 1px solid rgba(18, 48, 74, 0.15);
    padding: 10px 18px;
    border-radius: 30px;
    box-shadow: 0 10px 25px rgba(18, 48, 74, 0.12);
    font-size: 13px;
    font-weight: 800;
    color: #12304A;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 10;
  }
  .floating-pill-right {
    position: absolute;
    top: ${isStory ? "110px" : "75px"};
    right: ${isStory ? "30px" : "15px"};
    background: #ffffff;
    border: 1px solid rgba(18, 48, 74, 0.15);
    padding: 10px 18px;
    border-radius: 30px;
    box-shadow: 0 10px 25px rgba(18, 48, 74, 0.12);
    font-size: 13px;
    font-weight: 800;
    color: #12304A;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 10;
  }
  .pill-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #D97706;
  }

  .features-strip {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-top: ${isStory ? "40px" : "15px"};
    position: relative;
    z-index: 10;
  }
  .feature-box {
    flex: 1;
    background: #ffffff;
    border: 1px solid rgba(18, 48, 74, 0.1);
    border-radius: 14px;
    padding: ${isStory ? "22px 20px" : "14px 18px"};
    box-shadow: 0 10px 25px rgba(18, 48, 74, 0.06);
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .feature-box-icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
  }
  .feature-box-title {
    font-size: 14px;
    font-weight: 800;
    color: #12304A;
  }
  .feature-box-sub {
    font-size: 11px;
    font-weight: 600;
    color: #64748B;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #12304A;
    color: #ffffff;
    border-radius: 14px;
    padding: ${isStory ? "22px 30px" : "14px 26px"};
    margin-top: ${isStory ? "40px" : "15px"};
    position: relative;
    z-index: 10;
  }
  .footer-contact {
    display: flex;
    align-items: center;
    gap: 24px;
    font-size: 13px;
    font-weight: 700;
  }
  .footer-item {
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }
  .footer-cta-pill {
    background: #D97706;
    color: #ffffff;
    padding: 8px 18px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    white-space: nowrap;
  }
</style>
</head>
<body>
  <div class="studio-light-top"></div>
  <div class="plant-leaf-right"></div>

  <!-- Header -->
  <div class="header">
    <div class="header-logo-wrap">
      <img src="${LOGO_TRANSPARENT}" class="header-logo" alt="SAMA HOME">
      <span class="header-badge">Suite Multi-Écrans</span>
    </div>
    <div class="header-right">
      <div class="header-category">IMMOBILIER • RÉSIDENCES • MEUBLÉS</div>
      <div class="header-subtag">SYNCHRONISATION INSTANTANÉE</div>
    </div>
  </div>

  <!-- Hero Titles -->
  <div class="hero-titles">
    <div class="hero-title-main">La Suite Complète <span>sur Tous vos Écrans</span></div>
    <div class="hero-subtitle">Ordinateur • Tablette • Smartphone • Accès Cloud Sécurisé</div>
  </div>

  <!-- Multi-Devices Stage -->
  <div class="stage-wrap">
    <div class="floating-pill-left">
      <div class="pill-dot"></div>
      <span>Planning & Réservations</span>
    </div>
    <div class="floating-pill-right">
      <div class="pill-dot"></div>
      <span>Caisse Wave & OM Direct</span>
    </div>

    <!-- Desktop iMac in Back -->
    <div class="screen-imac">
      <img src="${APP_DASHBOARD}" class="screen-imac-img" alt="Dashboard">
    </div>

    <!-- Tablet on Left -->
    <div class="screen-tablet">
      <img src="${APP_CONTRAT}" class="screen-tablet-img" alt="Contrats">
    </div>

    <!-- Laptop on Right -->
    <div class="screen-laptop">
      <img src="${APP_PLANNING}" class="screen-laptop-img" alt="Planning">
      <div class="screen-laptop-base"></div>
    </div>

    <!-- Smartphone in Center -->
    <div class="screen-phone">
      <div class="screen-phone-notch"></div>
      <img src="${APP_CAISSE}" class="screen-phone-img" alt="Caisse Mobile">
    </div>
  </div>

  <!-- Features Strip -->
  <div class="features-strip">
    <div class="feature-box">
      <div class="feature-box-icon">⚡</div>
      <div>
        <div class="feature-box-title">Temps Réel</div>
        <div class="feature-box-sub">Modifications synchronisées</div>
      </div>
    </div>
    <div class="feature-box">
      <div class="feature-box-icon">👥</div>
      <div>
        <div class="feature-box-title">Multi-Comptes</div>
        <div class="feature-box-sub">Gérants, réception & admin</div>
      </div>
    </div>
    <div class="feature-box">
      <div class="feature-box-icon">☁️</div>
      <div>
        <div class="feature-box-title">Sauvegarde 24/7</div>
        <div class="feature-box-sub">Zéro perte de données</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-contact">
      <div class="footer-item">
        <span>📞</span>
        <span>+221 77 338 66 60 / +221 77 249 50 80</span>
      </div>
      <div class="footer-item">
        <span>✉️</span>
        <span>support@samahome.sn</span>
      </div>
      <div class="footer-item">
        <span>📍</span>
        <span>Grand Yoff CICES Foire, Dakar</span>
      </div>
    </div>
    <div class="footer-cta-pill">Démarrer maintenant</div>
  </div>
</body>
</html>`;
}

// ==============================================================================
// POSTER 3: Corporate Tech Flyer & Logiciel de Gestion (Inspired by Affiche 3.jpg)
// ==============================================================================
function getPoster03Html(isStory) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Caveat:wght@600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  body {
    width: 1080px;
    height: ${isStory ? "1920px" : "1080px"};
    background: #F8FAFC;
    color: #0F172A;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    position: relative;
    overflow: hidden;
    padding: ${isStory ? "90px 65px 80px 65px" : "38px 55px 30px 55px"};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .bg-shape-top {
    position: absolute;
    top: -100px;
    right: -100px;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(18, 48, 74, 0.04) 50%, transparent 70%);
    pointer-events: none;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 10;
  }
  .header-logo-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .header-logo {
    height: ${isStory ? "58px" : "48px"};
    width: auto;
    object-fit: contain;
  }
  .header-tagline {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: #64748B;
    text-transform: uppercase;
  }
  .header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }
  .handwritten-slogan {
    font-family: 'Caveat', cursive;
    font-size: 28px;
    color: #0F172A;
    transform: rotate(-2deg);
    line-height: 1;
    font-weight: 700;
  }
  .header-right-categories {
    font-size: 11px;
    font-weight: 800;
    color: #059669;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .headline-wrap {
    margin-top: ${isStory ? "30px" : "10px"};
    position: relative;
    z-index: 10;
  }
  .tag-label {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 2px;
    color: #12304A;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .main-title {
    font-size: ${isStory ? "54px" : "38px"};
    font-weight: 900;
    color: #0F172A;
    line-height: 1.1;
    letter-spacing: -1px;
    margin-bottom: 6px;
  }
  .main-title span {
    color: #059669;
  }
  .subtitle {
    font-size: ${isStory ? "17px" : "14px"};
    font-weight: 600;
    color: #64748B;
    max-width: 650px;
  }

  .body-grid {
    display: flex;
    ${isStory ? "flex-direction: column; gap: 35px; margin-top: 35px;" : "justify-content: space-between; align-items: center; gap: 25px; margin-top: 15px;"}
    position: relative;
    z-index: 10;
  }

  .features-col {
    ${isStory ? "width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;" : "flex: 0 0 320px; display: flex; flex-direction: column; gap: 10px;"}
  }
  .feature-item {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .feature-icon-square {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #111E2E;
    color: #34D399;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(17, 30, 46, 0.15);
  }
  .feature-text-title {
    font-size: 14px;
    font-weight: 800;
    color: #0F172A;
  }
  .feature-text-desc {
    font-size: 11px;
    font-weight: 600;
    color: #64748B;
  }

  .mockups-center {
    ${isStory ? "width: 100%; height: 460px;" : "flex: 1; height: 330px;"}
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .laptop-box {
    position: relative;
    width: ${isStory ? "580px" : "410px"};
    height: ${isStory ? "360px" : "260px"};
    background: #0f172a;
    border: 3px solid #334155;
    border-radius: 12px 12px 2px 2px;
    box-shadow: 0 25px 50px rgba(0,0,0,0.25);
    overflow: hidden;
    z-index: 2;
    margin-right: -20px;
  }
  .laptop-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .laptop-base-bar {
    position: absolute;
    bottom: -8px;
    left: -20px;
    right: -20px;
    height: 8px;
    background: #94A3B8;
    border-radius: 0 0 8px 8px;
  }

  .phone-box {
    position: absolute;
    right: ${isStory ? "120px" : "20px"};
    bottom: -15px;
    width: ${isStory ? "175px" : "130px"};
    height: ${isStory ? "360px" : "270px"};
    background: #000;
    border: 3px solid #1e293b;
    border-radius: 26px;
    box-shadow: 0 25px 45px rgba(0,0,0,0.35);
    overflow: hidden;
    z-index: 5;
  }
  .phone-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .notepad-card {
    ${isStory ? "width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 20px 30px;" : "flex: 0 0 240px; padding: 18px 16px;"}
    background: #ffffff;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    box-shadow: 0 15px 35px rgba(0,0,0,0.06);
    position: relative;
  }
  .notepad-spiral {
    position: absolute;
    left: 12px;
    right: 12px;
    top: -10px;
    display: flex;
    justify-content: space-between;
  }
  .spiral-ring {
    width: 6px;
    height: 14px;
    background: #94A3B8;
    border-radius: 4px;
  }
  .notepad-title {
    font-size: 13px;
    font-weight: 800;
    color: #12304A;
    margin-top: 6px;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .notepad-check-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    color: #0F172A;
    margin-bottom: 8px;
  }
  .check-green {
    color: #059669;
    font-size: 16px;
    font-weight: 900;
  }
  .notepad-mug-quote {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px dashed #CBD5E1;
    font-family: 'Caveat', cursive;
    font-size: 20px;
    color: #475569;
    text-align: center;
  }

  .offer-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #ffffff;
    border: 1px solid #E2E8F0;
    border-radius: 16px;
    padding: ${isStory ? "20px 30px" : "12px 20px"};
    margin-top: ${isStory ? "35px" : "15px"};
    box-shadow: 0 10px 30px rgba(0,0,0,0.04);
    position: relative;
    z-index: 10;
  }
  .offer-price-pill {
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    color: #065F46;
    padding: 8px 18px;
    border-radius: 30px;
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .offer-price-sub {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .offer-price-amount {
    font-size: 18px;
    font-weight: 900;
  }
  .offer-cta-btn {
    background: #0F172A;
    color: #ffffff;
    padding: 10px 24px;
    border-radius: 30px;
    font-size: 13px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .offer-cta-arrow {
    width: 22px;
    height: 22px;
    background: #10B981;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 12px;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid #E2E8F0;
    padding-top: ${isStory ? "25px" : "14px"};
    margin-top: ${isStory ? "30px" : "12px"};
    position: relative;
    z-index: 10;
  }
  .footer-left {
    display: flex;
    align-items: center;
    gap: 20px;
    font-size: 13px;
    font-weight: 700;
    color: #475569;
    white-space: nowrap;
  }
  .footer-right-pillars {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .pillar-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 800;
    color: #0F172A;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .footer-inspire {
    font-family: 'Caveat', cursive;
    font-size: 22px;
    color: #059669;
    padding-left: 15px;
    border-left: 1px solid #CBD5E1;
  }
</style>
</head>
<body>
  <div class="bg-shape-top"></div>

  <!-- Header -->
  <div class="header">
    <div class="header-logo-wrap">
      <img src="${LOGO_TRANSPARENT}" class="header-logo" alt="SAMA HOME">
      <div class="header-tagline">SOLUTIONS DIGITALES POUR L'IMMOBILIER</div>
    </div>
    <div class="header-right">
      <div class="handwritten-slogan">Gérez simplement, avancez sereinement</div>
      <div class="header-right-categories">
        RÉSIDENCES • MEUBLÉS • HÔTELS • GESTION LOCATIVE
      </div>
    </div>
  </div>

  <!-- Headline -->
  <div class="headline-wrap">
    <div class="tag-label">LOGICIELS DE GESTION LOCATIVE</div>
    <div class="main-title">Un logiciel adapté <span>à votre activité</span></div>
    <div class="subtitle">Des solutions simples, rapides et efficaces pour gérer votre patrimoine immobilier en toute transparence.</div>
  </div>

  <!-- Body Grid -->
  <div class="body-grid">
    <!-- Left 5 Features -->
    <div class="features-col">
      <div class="feature-item">
        <div class="feature-icon-square">📄</div>
        <div>
          <div class="feature-text-title">Facturation & Reçus</div>
          <div class="feature-text-desc">Devis, baux, reçus & WhatsApp</div>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon-square">👥</div>
        <div>
          <div class="feature-text-title">Gestion des Locataires</div>
          <div class="feature-text-desc">Pièces d'identité & historique</div>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon-square">💳</div>
        <div>
          <div class="feature-text-title">Caisse & Trésorerie</div>
          <div class="feature-text-desc">Wave, OM, espèces & cautions</div>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon-square">📊</div>
        <div>
          <div class="feature-text-title">Rapports & Statistiques</div>
          <div class="feature-text-desc">Taux d'occupation en temps réel</div>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon-square">🏢</div>
        <div>
          <div class="feature-text-title">Multi-Propriétés</div>
          <div class="feature-text-desc">Appartements, villas & résidences</div>
        </div>
      </div>
    </div>

    <!-- Center Mockups -->
    <div class="mockups-center">
      <div class="laptop-box">
        <img src="${APP_DASHBOARD}" class="laptop-img" alt="Dashboard">
        <div class="laptop-base-bar"></div>
      </div>
      <div class="phone-box">
        <img src="${APP_CAISSE}" class="phone-img" alt="Caisse">
      </div>
    </div>

    <!-- Right Checklist Notepad -->
    <div class="notepad-card">
      <div>
        <div class="notepad-title">Les Avantages SAMA HOME</div>
        <div class="notepad-check-item">
          <span class="check-green">✓</span>
          <span>Moins de paperasse</span>
        </div>
        <div class="notepad-check-item">
          <span class="check-green">✓</span>
          <span>Zéro impayé oublié</span>
        </div>
        <div class="notepad-check-item">
          <span class="check-green">✓</span>
          <span>Plus d'efficacité</span>
        </div>
        <div class="notepad-check-item">
          <span class="check-green">✓</span>
          <span>Plus de temps libre</span>
        </div>
      </div>
      <div class="notepad-mug-quote">Gestion immobilière simplifiée</div>
    </div>
  </div>

  <!-- Offer Strip -->
  <div class="offer-strip">
    <div class="offer-price-pill">
      <span class="offer-price-sub">Formule Clé en Main</span>
      <span class="offer-price-amount">Sans Engagement</span>
    </div>
    <div class="offer-cta-btn">
      <span>Demandez votre démonstration gratuite</span>
      <div class="offer-cta-arrow">→</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">
      <span>🌐 samahome.sn</span>
      <span>📞 +221 77 338 66 60 / +221 77 249 50 80</span>
      <span>📍 Grand Yoff CICES Foire, Dakar</span>
    </div>
    <div class="footer-right-pillars">
      <div class="pillar-item">⚡ Productivité</div>
      <div class="pillar-item">🔒 Sécurité</div>
      <div class="pillar-item">📈 Croissance</div>
      <div class="footer-inspire">Votre réussite nous inspire</div>
    </div>
  </div>
</body>
</html>`;
}

// ==============================================================================
// POSTER 4: SaaS Analytics & Performance Focus (Inspired by Affiche 4.jpg)
// ==============================================================================
function getPoster04Html(isStory) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  body {
    width: 1080px;
    height: ${isStory ? "1920px" : "1080px"};
    background: #ffffff;
    color: #12304A;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    position: relative;
    overflow: hidden;
    padding: ${isStory ? "90px 65px 80px 65px" : "40px 55px 30px 55px"};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .wave-bg-right {
    position: absolute;
    top: 0;
    right: 0;
    width: ${isStory ? "620px" : "580px"};
    height: 100%;
    background: radial-gradient(circle at 100% 30%, #154360 0%, #12304A 60%, #0A1926 100%);
    clip-path: polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%);
    z-index: 1;
  }
  .dots-matrix {
    position: absolute;
    top: 40px;
    left: 55px;
    width: 80px;
    height: 40px;
    background-image: radial-gradient(#12304A 2px, transparent 2px);
    background-size: 10px 10px;
    opacity: 0.3;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 10;
  }
  .header-badge-logo {
    background: #12304A;
    padding: 8px 18px;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(18, 48, 74, 0.25);
  }
  .header-logo-img {
    height: 38px;
    width: auto;
    object-fit: contain;
  }
  .header-right {
    text-align: right;
  }
  .header-right-white {
    font-size: 12px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: 1px;
    line-height: 1.4;
    text-transform: uppercase;
  }
  .header-right-gold {
    font-size: 14px;
    font-weight: 900;
    color: #F59E0B;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .hero-titles {
    margin-top: ${isStory ? "30px" : "15px"};
    position: relative;
    z-index: 10;
  }
  .hero-giant-title {
    font-size: ${isStory ? "64px" : "48px"};
    font-weight: 900;
    color: #12304A;
    line-height: 0.95;
    letter-spacing: -1.5px;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 15px;
  }
  .title-icon-badge {
    background: #F59E0B;
    color: #12304A;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
  }
  .hero-sub-giant {
    font-size: ${isStory ? "30px" : "24px"};
    font-weight: 900;
    color: #154360;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .hero-tagline {
    font-size: ${isStory ? "18px" : "15px"};
    font-weight: 700;
    color: #64748B;
    margin-top: 6px;
  }
  .hero-tagline span {
    color: #E5484D;
    font-weight: 800;
  }

  .split-content {
    display: flex;
    ${isStory ? "flex-direction: column; gap: 35px; margin-top: 35px;" : "align-items: center; justify-content: space-between; gap: 30px; margin-top: 15px;"}
    position: relative;
    z-index: 10;
  }

  .left-badges-col {
    ${isStory ? "width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 18px;" : "flex: 0 0 380px; display: flex; flex-direction: column; gap: 11px;"}
  }
  .badge-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .badge-circle {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: #12304A;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(18, 48, 74, 0.2);
  }
  .badge-title {
    font-size: 13px;
    font-weight: 800;
    color: #12304A;
    text-transform: uppercase;
  }
  .badge-desc {
    font-size: 11px;
    font-weight: 500;
    color: #64748B;
    line-height: 1.3;
  }

  .right-visual-area {
    ${isStory ? "width: 100%;" : "flex: 1;"}
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .monitor-3d {
    width: ${isStory ? "650px" : "440px"};
    height: ${isStory ? "420px" : "280px"};
    background: #ffffff;
    border: 4px solid #CBD5E1;
    border-radius: 16px;
    box-shadow: 0 30px 70px rgba(0,0,0,0.35);
    overflow: hidden;
    position: relative;
    z-index: 2;
  }
  .monitor-3d-top {
    height: 22px;
    background: #F1F5F9;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    padding: 0 10px;
    gap: 6px;
  }
  .dot-mac {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .monitor-img {
    width: 100%;
    height: calc(100% - 22px);
    object-fit: cover;
  }

  .floating-call-pill {
    margin-top: 15px;
    background: #ffffff;
    border: 2px solid #12304A;
    border-radius: 30px;
    padding: 10px 24px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 800;
    color: #12304A;
    z-index: 10;
    white-space: nowrap;
  }
  .call-icon {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #10B981;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
  }

  .center-banner {
    background: #F8FAFC;
    border: 1px dashed #CBD5E1;
    border-radius: 30px;
    padding: 10px 24px;
    text-align: center;
    font-size: 13px;
    font-weight: 700;
    color: #334155;
    margin-top: ${isStory ? "35px" : "15px"};
    position: relative;
    z-index: 10;
  }
  .center-banner span {
    color: #12304A;
    font-weight: 800;
  }

  .bottom-navy-bar {
    background: #0A1926;
    color: #ffffff;
    border-radius: 12px;
    padding: ${isStory ? "22px 25px" : "14px 20px"};
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: ${isStory ? "30px" : "12px"};
    position: relative;
    z-index: 10;
  }
  .navy-metric-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  .navy-metric-icon {
    font-size: 18px;
    color: #F59E0B;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 700;
    color: #64748B;
    margin-top: ${isStory ? "25px" : "10px"};
    position: relative;
    z-index: 10;
  }
</style>
</head>
<body>
  <div class="wave-bg-right"></div>
  <div class="dots-matrix"></div>

  <!-- Header -->
  <div class="header">
    <div class="header-badge-logo">
      <img src="${LOGO_TRANSPARENT}" class="header-logo-img" alt="SAMA HOME">
    </div>
    <div class="header-right">
      <div class="header-right-white">Plus de Réservations • Zéro Impayé</div>
      <div class="header-right-gold">100% Maîtrisé & Rentable</div>
    </div>
  </div>

  <!-- Hero Titles -->
  <div class="hero-titles">
    <div class="hero-giant-title">
      <span>GESTION LOCATIVE</span>
      <div class="title-icon-badge">📈</div>
    </div>
    <div class="hero-sub-giant">PILOTEZ VOS LOGEMENTS & RÉSIDENCES</div>
    <div class="hero-tagline">Louez plus vite. Encaissez sans stress. <span>Contrôlez tout en un clic.</span></div>
  </div>

  <!-- Split Content -->
  <div class="split-content">
    <!-- Left 5 Badges -->
    <div class="left-badges-col">
      <div class="badge-row">
        <div class="badge-circle">📅</div>
        <div>
          <div class="badge-title">Calendrier Dynamique</div>
          <div class="badge-desc">Évitez les doubles réservations et suivez les arrivées</div>
        </div>
      </div>
      <div class="badge-row">
        <div class="badge-circle">💰</div>
        <div>
          <div class="badge-title">Suivi des Loyers & Cautions</div>
          <div class="badge-desc">Alertes automatiques d'échéance et gestion des dépôts</div>
        </div>
      </div>
      <div class="badge-row">
        <div class="badge-circle">📄</div>
        <div>
          <div class="badge-title">Reçus & Quittances Directs</div>
          <div class="badge-desc">Génération immédiate conforme OHADA et envoi WhatsApp</div>
        </div>
      </div>
      <div class="badge-row">
        <div class="badge-circle">📊</div>
        <div>
          <div class="badge-title">Contrôle des Dépenses</div>
          <div class="badge-desc">Enregistrez chaque charge pour connaître votre bénéfice net</div>
        </div>
      </div>
      <div class="badge-row">
        <div class="badge-circle">📈</div>
        <div>
          <div class="badge-title">Statistiques de Rentabilité</div>
          <div class="badge-desc">Taux d'occupation et chiffres d'affaires par logement</div>
        </div>
      </div>
    </div>

    <!-- Right 3D Visual -->
    <div class="right-visual-area">
      <div class="monitor-3d">
        <div class="monitor-3d-top">
          <div class="dot-mac" style="background:#EF4444;"></div>
          <div class="dot-mac" style="background:#F59E0B;"></div>
          <div class="dot-mac" style="background:#10B981;"></div>
        </div>
        <img src="${APP_DASHBOARD}" class="monitor-img" alt="SAMA HOME Dashboard">
      </div>
      <div class="floating-call-pill">
        <div class="call-icon">📞</div>
        <span>Tél / WhatsApp : +221 77 338 66 60 / +221 77 249 50 80</span>
      </div>
    </div>
  </div>

  <!-- Center Banner -->
  <div class="center-banner">
    La plateforme de gestion locative n°1 conçue pour les <span>propriétaires & gestionnaires au Sénégal</span>
  </div>

  <!-- Bottom Dark Navy Bar (5 Metrics) -->
  <div class="bottom-navy-bar">
    <div class="navy-metric-item">
      <span class="navy-metric-icon">⚡</span>
      <span>Gain de temps +70%</span>
    </div>
    <div class="navy-metric-item">
      <span class="navy-metric-icon">🛡️</span>
      <span>Zéro litige de caisse</span>
    </div>
    <div class="navy-metric-item">
      <span class="navy-metric-icon">👥</span>
      <span>Multi-Utilisateurs</span>
    </div>
    <div class="navy-metric-item">
      <span class="navy-metric-icon">☁️</span>
      <span>Sauvegarde Cloud</span>
    </div>
    <div class="navy-metric-item">
      <span class="navy-metric-icon">🇸🇳</span>
      <span>Support 7j/7 Dakar</span>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>COMPAGNIE GUEYE TAWFEKH (C.G.T) • Grand Yoff CICES Foire Villa 278, Dakar</span>
    <span>support@samahome.sn • RCCM : SN.DKR.2025.A.38803</span>
  </div>
</body>
</html>`;
}

// ==============================================================================
// POSTER 5: Commercial Blue Gradient with Floating Pills (Inspired by Affiche 5.jpg)
// ==============================================================================
function getPoster05Html(isStory) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  body {
    width: 1080px;
    height: ${isStory ? "1920px" : "1080px"};
    background: radial-gradient(circle at 50% 30%, #154360 0%, #12304A 55%, #0A1926 100%);
    color: #ffffff;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    position: relative;
    overflow: hidden;
    padding: ${isStory ? "90px 65px 70px 65px" : "40px 55px 30px 55px"};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    text-align: center;
  }

  .neon-ribbon {
    position: absolute;
    width: 900px;
    height: 900px;
    border-radius: 50%;
    border: 3px solid rgba(56, 189, 248, 0.2);
    top: -200px;
    left: 50%;
    transform: translateX(-50%) rotate(25deg);
    pointer-events: none;
  }
  .neon-glow-core {
    position: absolute;
    top: 15%;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 400px;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%);
    pointer-events: none;
  }

  .logo-box {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 8px 24px;
    border-radius: 40px;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    position: relative;
    z-index: 10;
  }
  .logo-img {
    height: 42px;
    width: auto;
    object-fit: contain;
  }

  .giant-title-wrap {
    margin-top: ${isStory ? "35px" : "15px"};
    position: relative;
    z-index: 10;
  }
  .giant-title {
    font-size: ${isStory ? "64px" : "48px"};
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -1.5px;
    color: #ffffff;
    text-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  .neon-sub-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 8px 24px;
    border: 1.5px solid #38BDF8;
    border-radius: 30px;
    background: rgba(56, 189, 248, 0.1);
    box-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
    font-size: 14px;
    font-weight: 800;
    color: #E0F2FE;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .stage-container {
    position: relative;
    width: 100%;
    height: ${isStory ? "880px" : "480px"};
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: ${isStory ? "40px" : "15px"};
    z-index: 10;
  }

  .pedestal-base {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: ${isStory ? "920px" : "800px"};
    height: 75px;
    background: linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 100%);
    border-radius: 16px 16px 0 0;
    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .laptop-wrap {
    position: absolute;
    bottom: 70px;
    left: 50%;
    transform: translateX(-50%);
    width: ${isStory ? "640px" : "510px"};
    height: ${isStory ? "400px" : "315px"};
    background: #0f172a;
    border: 3.5px solid #334155;
    border-radius: 12px 12px 2px 2px;
    box-shadow: 0 35px 80px rgba(0,0,0,0.7);
    overflow: hidden;
    z-index: 3;
  }
  .laptop-screen-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .floating-pill {
    position: absolute;
    background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%);
    color: #ffffff;
    padding: ${isStory ? "14px 24px" : "10px 18px"};
    border-radius: 30px;
    font-size: ${isStory ? "15px" : "13px"};
    font-weight: 800;
    box-shadow: 0 10px 25px rgba(2, 132, 199, 0.45), 0 0 15px rgba(56, 189, 248, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.3);
    z-index: 5;
    white-space: nowrap;
  }
  .pill-l1 { left: 30px; top: ${isStory ? "90px" : "40px"}; }
  .pill-l2 { left: 10px; top: ${isStory ? "230px" : "120px"}; }
  .pill-l3 { left: 25px; top: ${isStory ? "370px" : "200px"}; }
  .pill-l4 { left: 45px; top: ${isStory ? "510px" : "280px"}; }

  .pill-r1 { right: 30px; top: ${isStory ? "90px" : "40px"}; }
  .pill-r2 { right: 10px; top: ${isStory ? "230px" : "120px"}; }
  .pill-r3 { right: 25px; top: ${isStory ? "370px" : "200px"}; }
  .pill-r4 { right: 45px; top: ${isStory ? "510px" : "280px"}; }

  .pedestal-contact-bar {
    background: #0A1420;
    color: #ffffff;
    border-radius: 40px;
    padding: 10px 28px;
    display: flex;
    align-items: center;
    gap: 20px;
    font-size: 12.5px;
    font-weight: 700;
    box-shadow: 0 5px 20px rgba(0,0,0,0.4);
    z-index: 10;
    white-space: nowrap;
  }
  .ped-item {
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }
</style>
</head>
<body>
  <div class="neon-ribbon"></div>
  <div class="neon-glow-core"></div>

  <!-- Header Logo -->
  <div class="logo-box">
    <img src="${LOGO_TRANSPARENT}" class="logo-img" alt="SAMA HOME">
  </div>

  <!-- Giant Question Title -->
  <div class="giant-title-wrap">
    <div class="giant-title">Besoin d'un Logiciel<br>pour vos Logements ?</div>
    <div class="neon-sub-pill">
      <span>✨ Une Solution Sur-Mesure pour vos Biens</span>
    </div>
  </div>

  <!-- Center Stage with Floating Pills -->
  <div class="stage-container">
    <!-- Floating Pills Left -->
    <div class="floating-pill pill-l1">🏢 Appartements meublés</div>
    <div class="floating-pill pill-l2">🏨 Hôtels & Auberges</div>
    <div class="floating-pill pill-l3">🏘️ Résidences privées</div>
    <div class="floating-pill pill-l4">🔑 Gestionnaires d'immeubles</div>

    <!-- Floating Pills Right -->
    <div class="floating-pill pill-r1">🌴 Maisons d'hôtes & Villas</div>
    <div class="floating-pill pill-r2">📅 Courte & Longue durée</div>
    <div class="floating-pill pill-r3">💼 Bureaux & Commerces</div>
    <div class="floating-pill pill-r4">📱 Suivi mobile 24h/24</div>

    <!-- Laptop on Pedestal -->
    <div class="laptop-wrap">
      <img src="${APP_DASHBOARD}" class="laptop-screen-img" alt="Dashboard">
    </div>

    <!-- Pedestal Base with Contact Bar -->
    <div class="pedestal-base">
      <div class="pedestal-contact-bar">
        <div class="ped-item">
          <span>💬 WhatsApp :</span>
          <span>+221 77 338 66 60</span>
        </div>
        <div class="ped-item">
          <span>📞 Tél :</span>
          <span>+221 77 249 50 80</span>
        </div>
        <div class="ped-item">
          <span>✉️ Email :</span>
          <span>support@samahome.sn</span>
        </div>
        <div class="ped-item">
          <span>📍</span>
          <span>Grand Yoff CICES Foire, Dakar</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ==============================================================================
// RUN ALL RENDERS
// ==============================================================================
async function main() {
  await renderHtmlToImages(getPoster01Html, "affiche-samahome-01");
  await renderHtmlToImages(getPoster02Html, "affiche-samahome-02");
  await renderHtmlToImages(getPoster03Html, "affiche-samahome-03");
  await renderHtmlToImages(getPoster04Html, "affiche-samahome-04");
  await renderHtmlToImages(getPoster05Html, "affiche-samahome-05");

  console.log("\n========================================================");
  console.log("ALL 5 POSTERS RENDERED SUCCESSFULLY IN SQUARE & STORY !");
  console.log("========================================================");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
