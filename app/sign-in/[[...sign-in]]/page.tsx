import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

export default function SignInPage() {
  return (
    <main className="auth-shell auth-shell-themed">
      <section className="auth-product-panel">
        <div>
          <p className="eyebrow">TimeCity Rescue</p>
          <h1>Team access</h1>
          <p>Sign in to review evals, class sessions and launch readiness.</p>
        </div>
        <Image src="/assets/characters/cutouts/cog9-future-worried.png" alt="" width={220} height={420} priority />
      </section>
      <section className="auth-card" aria-label="Sign in">
        <SignIn routing="path" path="/sign-in" />
      </section>
    </main>
  );
}
