import Link from "next/link";
import { ArrowRight, Bot, GraduationCap, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-hero">
        <div>
          <p className="eyebrow">TimeCity Rescue</p>
          <h1>A teacher-controlled AI-readiness adventure</h1>
          <p className="lead">
            Pupils aged 9-10 train COG-9 through closed choices, fixed rooms and safe adaptive hints. The child never chats
            freely with AI.
          </p>
          <div className="home-actions">
            <Link className="primary-action" href="/teacher">
              <GraduationCap size={20} />
              Open teacher dashboard
            </Link>
            <Link className="secondary-action" href="/play/DEMO">
              Try student mission
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
        <div className="home-visual">
          <div className="time-orb" />
          <div className="city-stack">
            <span />
            <span />
            <span />
            <span />
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
          <p>The LLM may adapt choices and hints, but validated fallbacks always work.</p>
        </article>
        <article>
          <GraduationCap size={28} />
          <h2>Teacher visibility</h2>
          <p>Progress, risk flags and overrides stay in the teacher control room.</p>
        </article>
      </section>
    </main>
  );
}
