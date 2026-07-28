// Landing page — full build per docs/landing-spec-2026-07-27.md (measured
// layout system from the remixed Framer "Message" template, themed Reading
// Room daylight). Supersedes the interim pass that shipped 27 Jul with just
// the pivoted headline and four honest stage names.
//
// No "use client": nothing on this page needs a hook. Each section below is
// its own static, server-renderable component under components/landing/, so
// this file is purely assembly, in the spec's measured order.

import Hero from "./components/landing/Hero";
import ReceiptsTrio from "./components/landing/ReceiptsTrio";
import FourStages from "./components/landing/FourStages";
import SampleDebrief from "./components/landing/SampleDebrief";
import EvidenceBand from "./components/landing/EvidenceBand";
import Faq from "./components/landing/Faq";
import FinalCta from "./components/landing/FinalCta";
import styles from "./page.module.css";

export default function Landing() {
  return (
    <main className={`app-main ${styles.main}`}>
      <Hero />
      <ReceiptsTrio />
      <FourStages />
      <SampleDebrief />
      <EvidenceBand />
      <Faq />
      <FinalCta />
    </main>
  );
}
