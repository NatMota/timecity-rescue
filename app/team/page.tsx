import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Gauge,
  GraduationCap,
  LogIn,
  MousePointerClick,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";
import { TeamAccessTable } from "@/components/team/TeamAccessTable";
import { getTeamDashboardData } from "@/lib/team/dashboard";

export const dynamic = "force-dynamic";

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null) {
  if (!value) return "Never";
  return dateTimeFormatter.format(new Date(value));
}

function formatTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatRelative(value: string | null) {
  if (!value) return "never";
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-GB").format(value);
}

function formatMs(value: number | null | undefined) {
  if (!value) return "-";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${value}ms`;
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value.toFixed(1);
}

function formatDelta(value: unknown, suffix = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  if (value === 0) return `0${suffix}`;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}${suffix}`;
}

function deltaTone(metric: "wrong" | "retry" | "score" | "completion", value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value === 0) return "neutral";
  if (metric === "wrong" || metric === "retry") return value > 0 ? "bad" : "good";
  return value > 0 ? "good" : "bad";
}

function runIdentity(run: { generatedAt: string; seedCount: number; judgeScores: Record<string, unknown> }) {
  const judged = Object.keys(run.judgeScores || {}).length ? "judged" : "not judged";
  return `${formatRelative(run.generatedAt)} · ${run.seedCount} seeds · ${judged}`;
}

function RequirementStat({
  label,
  actual,
  required,
  suffix = "",
}: {
  label: string;
  actual: number | null | undefined;
  required: number | null | undefined;
  suffix?: string;
}) {
  const actualValue = typeof actual === "number" && Number.isFinite(actual) ? actual : 0;
  const requiredValue = typeof required === "number" && Number.isFinite(required) ? required : 0;
  const pass = actualValue >= requiredValue;
  return (
    <div className={pass ? "requirement-pass" : "requirement-fail"}>
      <span>{label}</span>
      <strong>
        {formatNumber(actual)}
        {suffix} <small>(min {formatNumber(required)}{suffix})</small>
      </strong>
      {pass ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
    </div>
  );
}

function JudgeScoreBar({
  label,
  score,
  passRate,
  delta,
  tension,
}: {
  label: string;
  score: number | null | undefined;
  passRate?: number | null;
  delta?: unknown;
  tension?: number | null;
}) {
  const value = typeof score === "number" && Number.isFinite(score) ? score : 0;
  const pass = value >= 4 && (passRate === null || passRate === undefined || passRate > 0);
  const width = `${Math.min(100, Math.max(0, (value / 5) * 100))}%`;
  return (
    <div className="judge-score-row">
      <div>
        <span>{label}</span>
        <strong>{formatScore(score)}</strong>
      </div>
      <div className={pass ? "judge-bar judge-pass" : "judge-bar judge-fail"} aria-label={`${label} score ${formatScore(score)} of 5`}>
        <span className="judge-bar-fill" style={{ width }} />
        <span className="judge-threshold" />
      </div>
      <small>
        threshold 4.0
        {typeof passRate === "number" ? ` · pass ${formatNumber(passRate)}%` : ""}
        {typeof delta === "number" ? ` · Δ ${formatDelta(delta)}` : ""}
        {typeof tension === "number" ? ` · tension ${formatScore(tension)}` : ""}
      </small>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="team-metric-card">
      <div className="team-metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <span className="progress-track" aria-label={`${value}% progress`}>
      <span className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </span>
  );
}

export default async function TeamDashboardPage() {
  await auth.protect();
  const data = await getTeamDashboardData();
  const generationSuccessRate = data.totals.totalGenerations
    ? Math.round((data.totals.successfulGenerations / data.totals.totalGenerations) * 100)
    : 0;
  const fallbackRate = data.totals.totalGenerations
    ? Math.round((data.totals.fallbackGenerations / data.totals.totalGenerations) * 100)
    : 0;
  const evalCurrent = data.evals?.current;
  const evalBaseline = data.evals?.baseline;
  const teacherScore = evalCurrent?.judgeScores.teacher_syllabus;
  const studentFunScore = evalCurrent?.judgeScores.student_fun;
  const uxScore = evalCurrent?.judgeScores.ux_accessibility;
  const safetyScore = evalCurrent?.judgeScores.child_safety;
  const evalDeltas = data.evals?.deltas || {};
  const topEvalIssues = evalCurrent
    ? Object.entries(evalCurrent.judgeScores || {})
        .flatMap(([judgeId, judge]) =>
          (judge.issues || []).map((issue) => ({
            judgeId,
            title: judge.title,
            issue,
          })),
        )
        .slice(0, 3)
    : [];

  return (
    <main className="team-shell">
      <header className="team-header">
        <div>
          <p className="eyebrow">Team dashboard</p>
          <h1>TimeCity Operations</h1>
          <p>Refreshed at {formatTime(data.generatedAt)}</p>
        </div>
        <div className="team-actions">
          <Link className="quiet-button" href="/team">
            <RefreshCw size={18} />
            Refresh
          </Link>
          <Link className="secondary-action" href="/teacher">
            <GraduationCap size={18} />
            Teacher
          </Link>
          <UserButton />
        </div>
      </header>

      {data.errors.length ? (
        <section className="team-alert">
          <AlertTriangle size={20} />
          <div>
            <strong>Some dashboard data could not be loaded.</strong>
            <p>{data.errors.join(" ")}</p>
          </div>
        </section>
      ) : null}

      <section className="team-metric-grid" aria-label="Team metrics">
        <MetricCard
          label="Teacher accounts"
          value={formatNumber(data.totals.teacherAccounts)}
          detail={`${data.users.filter((user) => user.lastSignInAt).length} have signed in`}
          icon={<LogIn size={22} />}
        />
        <MetricCard
          label="Active sessions"
          value={formatNumber(data.totals.activeSessions)}
          detail={`${data.totals.totalSessions} total sessions`}
          icon={<Users size={22} />}
        />
        <MetricCard
          label="Student progress"
          value={`${data.totals.averageProgress}%`}
          detail={`${data.totals.completedStudents} completed pupils`}
          icon={<Gauge size={22} />}
        />
        <MetricCard
          label="LLM generations"
          value={formatNumber(data.totals.totalGenerations)}
          detail={`${generationSuccessRate}% success · ${fallbackRate}% fallback`}
          icon={<Bot size={22} />}
        />
        <MetricCard
          label="Choice activity"
          value={formatNumber(data.totals.choicesSubmitted)}
          detail={`${formatMs(data.totals.averageResponseMs)} average response`}
          icon={<MousePointerClick size={22} />}
        />
        <MetricCard
          label="Attention signals"
          value={formatNumber(data.totals.atRiskStudents)}
          detail={`${data.totals.fastFirstChoices} fast first choices`}
          icon={<Activity size={22} />}
        />
      </section>

      {evalCurrent ? (
        <section className="team-grid eval-grid eval-feature-grid">
          <article className="team-panel eval-feature-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Persona evals</p>
                <h2>{evalCurrent.pass ? "Ship gate passing" : "Ship gate failing"}</h2>
              </div>
              <span className={`eval-status ${evalCurrent.pass ? "status-pass" : "status-fail"}`}>
                {evalCurrent.pass ? "Pass" : "Fail"}
              </span>
            </div>
            <div className="eval-requirement-grid">
              <RequirementStat label="Generated scenes" actual={evalCurrent.generatedScenes} required={evalCurrent.minGeneratedScenes} />
              <RequirementStat label="Generated overall" actual={evalCurrent.generatedSceneRatio} required={evalCurrent.minGeneratedRatio} suffix="%" />
              <RequirementStat
                label="Generated eligible"
                actual={evalCurrent.generatedEligibleRatio}
                required={evalCurrent.minGeneratedEligibleRatio}
                suffix="%"
              />
              <RequirementStat
                label="Langfuse scores"
                actual={evalCurrent.langfuse?.scoreCount as number | undefined}
                required={2 + evalCurrent.totalRuns * Object.keys(evalCurrent.judgeScores || {}).length * 2}
              />
            </div>
            <div className="eval-summary-grid">
              <div>
                <span>Completion</span>
                <strong>{evalCurrent.completionRate}%</strong>
                <small className={`delta-${deltaTone("completion", evalDeltas.completionRate)}`}>
                  Baseline {evalBaseline ? `${evalBaseline.completionRate}%` : "-"} · Δ {formatDelta(evalDeltas.completionRate, "%")}
                </small>
              </div>
              <div>
                <span>Wrong choices</span>
                <strong>{formatScore(evalCurrent.averageWrong)}</strong>
                <small className={`delta-${deltaTone("wrong", evalDeltas.averageWrong)}`}>Δ {formatDelta(evalDeltas.averageWrong)}</small>
              </div>
              <div>
                <span>Retries</span>
                <strong>{formatScore(evalCurrent.averageRetries)}</strong>
                <small className={`delta-${deltaTone("retry", evalDeltas.averageRetries)}`}>Δ {formatDelta(evalDeltas.averageRetries)}</small>
              </div>
              <div>
                <span>Runs</span>
                <strong>{formatNumber(evalCurrent.totalRuns)}</strong>
                <small>{runIdentity(evalCurrent)}</small>
              </div>
            </div>
            <p className="eval-run-note">
              Current {evalCurrent.runId} · {formatDate(evalCurrent.generatedAt)}
              {evalBaseline ? ` · vs ${runIdentity(evalBaseline)} (${evalBaseline.runId})` : " · no baseline attached"}
              {data.evals?.availability ? ` · source ${data.evals.availability.kind.replaceAll("_", " ")}` : ""}
            </p>
          </article>

          <article className="team-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Judge tension</p>
                <h2>Learning vs fun</h2>
              </div>
            </div>
            <div className="eval-judge-bars">
              <JudgeScoreBar label="Teacher syllabus" score={teacherScore?.averageScore} passRate={teacherScore?.passRate} delta={evalDeltas.teacherScore} />
              <JudgeScoreBar
                label="Student fun"
                score={studentFunScore?.averageScore}
                passRate={studentFunScore?.passRate}
                delta={evalDeltas.studentFunScore}
                tension={studentFunScore?.averageTension}
              />
              <JudgeScoreBar label="UX/accessibility" score={uxScore?.averageScore} passRate={uxScore?.passRate} delta={evalDeltas.uxScore} />
              <JudgeScoreBar label="Child safety" score={safetyScore?.averageScore} passRate={safetyScore?.passRate} delta={evalDeltas.safetyScore} />
            </div>
            {topEvalIssues.length ? (
              <div className="top-issues">
                <h3>Top issues</h3>
                {topEvalIssues.map((item) => (
                  <p key={`${item.judgeId}-${item.issue}`}>
                    <strong>{item.title}:</strong> {item.issue}
                  </p>
                ))}
              </div>
            ) : null}
          </article>
        </section>
      ) : null}

      <section className="team-grid">
        <article className="team-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Logins</p>
              <h2>Team access</h2>
            </div>
          </div>
          <TeamAccessTable users={data.users} />
        </article>

        <article className="team-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Learning signals</p>
              <h2>Risk and support</h2>
            </div>
          </div>
          <div className="signal-list">
            {data.risks.map((risk) => (
              <div key={risk.label}>
                <span>{risk.label}</span>
                <strong>{formatNumber(risk.count)}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="team-grid wide-left">
        <article className="team-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Progress</p>
              <h2>Class sessions</h2>
            </div>
          </div>
          <div className="team-table-wrap">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Status</th>
                  <th>Students</th>
                  <th>Progress</th>
                  <th>Risks</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((session) => (
                  <tr key={session.code}>
                    <td>
                      <strong>{session.code}</strong>
                      <span>{session.completed} complete</span>
                    </td>
                    <td>
                      <span className={`status-pill status-${session.status}`}>{session.status}</span>
                    </td>
                    <td>{session.students}</td>
                    <td>
                      <div className="progress-cell">
                        <ProgressBar value={session.averageProgress} />
                        <span>{session.averageProgress}%</span>
                      </div>
                    </td>
                    <td>{session.riskCount}</td>
                    <td>{formatDate(session.updatedAt)}</td>
                  </tr>
                ))}
                {!data.sessions.length ? (
                  <tr>
                    <td colSpan={6}>No sessions have been recorded yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="team-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Events</p>
              <h2>Top activity</h2>
            </div>
          </div>
          <div className="event-count-list">
            {data.eventCounts.map((event) => (
              <div key={event.eventType}>
                <span>{event.eventType.replaceAll("_", " ")}</span>
                <strong>{formatNumber(event.count)}</strong>
              </div>
            ))}
            {!data.eventCounts.length ? <p>No clickstream events yet.</p> : null}
          </div>
        </article>
      </section>

      <section className="team-grid">
        <article className="team-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Generations</p>
              <h2>Model health</h2>
            </div>
          </div>
          <div className="team-table-wrap">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Runs</th>
                  <th>Success</th>
                  <th>Fallback</th>
                  <th>Latency</th>
                  <th>Tokens</th>
                </tr>
              </thead>
              <tbody>
                {data.models.map((model) => (
                  <tr key={model.model}>
                    <td>{model.model}</td>
                    <td>{formatNumber(model.generations)}</td>
                    <td>{model.successRate}%</td>
                    <td>{model.fallbackRate}%</td>
                    <td>{formatMs(model.averageLatencyMs)}</td>
                    <td>{formatNumber(model.totalTokens)}</td>
                  </tr>
                ))}
                {!data.models.length ? (
                  <tr>
                    <td colSpan={6}>No generation events yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="team-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recent</p>
              <h2>Activity stream</h2>
            </div>
          </div>
          <div className="activity-list">
            {data.recentActivity.map((event) => (
              <div key={`${event.createdAt}-${event.type}-${event.studentId}`}>
                <span>{event.type.replaceAll("_", " ")}</span>
                <strong>{event.sessionCode}</strong>
                <small>
                  {event.actor} · {event.detail || event.studentId} · {formatDate(event.createdAt)}
                </small>
              </div>
            ))}
            {!data.recentActivity.length ? <p>No recent activity yet.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
