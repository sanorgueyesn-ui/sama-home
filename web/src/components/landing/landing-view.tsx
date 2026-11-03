import { HEADER_HEIGHT_CLASS, LandingHeader } from "@/components/landing/landing-header";
import {
  HeroSection,
  ModulesSection,
  ActivitiesSection,
  DailyFlowSection,
  TeamSection,
  FaqSection,
  AvailabilitySection,
  FinalCtaSection,
  ContactSection,
  FooterSection,
} from "@/components/landing/landing-sections";
import { VideoSection } from "@/components/landing/landing-video";
import { PricingSection } from "@/components/landing/landing-pricing";
import { FloatingActions } from "@/components/landing/floating-actions";
import { getDirection, type Locale } from "@/lib/i18n/config";
import { DEFAULT_THEME, type Theme } from "@/lib/theme-constants";
import { getMessages } from "@/lib/i18n/messages";
import "@/components/landing/landing.css";
import { PaletteScope } from "@/components/landing/palette-switcher";

export function LandingView({
  locale = "fr",
  theme = DEFAULT_THEME,
}: {
  locale?: Locale;
  theme?: Theme;
} = {}) {
  const m = getMessages(locale);

  return (
    <PaletteScope
      dir={getDirection(locale)}
      className="landing-scope sama-theme min-h-screen bg-surface text-fg"
    >
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-(--accent) focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-(--accent-ink)"
      >
        {m.common.skipToContent}
      </a>

      <LandingHeader locale={locale} theme={theme} m={m} />
      <div aria-hidden data-header-spacer className={HEADER_HEIGHT_CLASS} />

      <main id="contenu">
        <HeroSection />
        <VideoSection />
        <ModulesSection />
        <ActivitiesSection m={m} />
        <DailyFlowSection />
        <TeamSection m={m} />
        <PricingSection />
        <FaqSection />
        <AvailabilitySection m={m} />
        <FinalCtaSection />
        <ContactSection />
      </main>

      <FooterSection />

      <FloatingActions />
    </PaletteScope>
  );
}
