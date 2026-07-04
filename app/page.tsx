import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Bot, GraduationCap, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-hero">
        <div>
          <p className="eyebrow">TimeCity Rescue</p>
          <h1>Pupils solve the mystery of the missing minute and learn how AI really works</h1>
          <p className="lead">
            A classroom adventure for pupils aged 9–10. The story adapts to each pupil&apos;s level, always inside fixed
            rooms, closed choices and teacher controls.
          </p>
          <div className="trust-strip" aria-label="Safety controls">
            <span>No student chat</span>
            <span>Fixed rooms</span>
            <span>Teacher override</span>
          </div>
          <div className="home-actions">
            <Link className="primary-action" href="/play/DEMO">
              Try student mission
              <ArrowRight size={18} />
            </Link>
            <Link className="secondary-action" href="/teacher">
              <GraduationCap size={20} />
              Open teacher dashboard
            </Link>
          </div>
        </div>
        <div className="home-visual product-scene" aria-label="TimeCity gameplay preview">
          <Image src="/assets/rooms/future-trainstation.png" alt="" fill sizes="(max-width: 900px) 100vw, 440px" className="home-scene-bg" priority />
          <Image src="/assets/characters/cutouts/cog9-future-worried.png" alt="COG-9 station helper robot" width={290} height={580} className="home-scene-character" priority />
          <div className="home-dialogue-preview">
            <span>COG-9</span>
            <strong>The clocks disagree. One minute is missing.</strong>
            <p>Check the evidence before moving another train.</p>
          </div>
        </div>
      </section>

      <section className="principle-grid" aria-label="Product principles">
        <article>
          <ShieldCheck size={28} />
          <h2>Fixed sandbox</h2>
          <p>Rooms, characters, badges and story path are controlled by the app.</p>
        </article>
        <article>
          <Bot size={28} />
          <h2>Adaptive wording</h2>
          <p>The story adapts to each pupil&apos;s level, always inside limits you set.</p>
        </article>
        <article>
          <GraduationCap size={28} />
          <h2>Teacher visibility</h2>
          <p>Progress, risk flags and overrides stay in the teacher control room.</p>
        </article>
      </section>
      <footer className="site-footer">
        <Link href="/sign-in">Sign in</Link>
        <Link href="/team">Team</Link>
        <a href="mailto:nat.c.mota@gmail.com">Contact</a>
      </footer>
    </main>
  );
}
