import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Bot,
  Gauge,
  GraduationCap,
  LogIn,
  MousePointerClick,
  Users,
} from "lucide-react";
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

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-GB").format(value);
}

function formatMs(value: number | null | undefined) {
  if (!value) return "-";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${value}ms`;
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

  return (
    <main className="team-shell">
      <header className="team-header">
        <div>
          <p className="eyebrow">Team dashboard</p>
          <h1>TimeCity Operations</h1>
          <p>Generated {formatDate(data.generatedAt)}</p>
        </div>
        <div className="team-actions">
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

      <section className="team-grid">
        <article className="team-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Logins</p>
              <h2>Team access</h2>
            </div>
          </div>
          <div className="team-table-wrap">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Last sign-in</th>
                  <th>Last active</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </td>
                    <td>{formatDate(user.lastSignInAt)}</td>
                    <td>{formatDate(user.lastActiveAt)}</td>
                  </tr>
                ))}
                {!data.users.length ? (
                  <tr>
                    <td colSpan={3}>No Clerk users loaded.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
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
