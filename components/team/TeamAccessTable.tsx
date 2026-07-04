"use client";

import { useState } from "react";
import type { TeamUserSummary } from "@/lib/team/dashboard";

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null) {
  if (!value) return "Never";
  return dateTimeFormatter.format(new Date(value));
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "Masked";
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(3, name.length - 2))}@${domain}`;
}

export function TeamAccessTable({ users }: { users: TeamUserSummary[] }) {
  const [showEmails, setShowEmails] = useState(false);

  return (
    <>
      <div className="privacy-toggle-row">
        <span>Emails are masked for screen-share.</span>
        <button type="button" className="quiet-button" onClick={() => setShowEmails((value) => !value)}>
          {showEmails ? "Mask emails" : "Show emails"}
        </button>
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
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <span>{showEmails ? user.email : maskEmail(user.email)}</span>
                </td>
                <td>{formatDate(user.lastSignInAt)}</td>
                <td>{formatDate(user.lastActiveAt)}</td>
              </tr>
            ))}
            {!users.length ? (
              <tr>
                <td colSpan={3}>No Clerk users loaded.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
