const TRUE_VALUES = new Set(["1", "true", "yes", "on", "sandbox"]);

export function runtimeEnvironment() {
  const explicit = process.env.TIMECITY_ENVIRONMENT?.trim().toLowerCase();
  if (explicit) return explicit.replace(/[^a-z0-9_-]/g, "_").slice(0, 40);
  if (isSandboxMode()) return "sandbox";
  return process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
}

export function isSandboxMode() {
  return TRUE_VALUES.has(String(process.env.TIMECITY_SANDBOX_MODE || "").trim().toLowerCase());
}

export function sandboxSessionPrefix() {
  return (process.env.TIMECITY_SANDBOX_SESSION_PREFIX || "SBX").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "SBX";
}

export function cleanSessionCode(value: string | null | undefined) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 24);
}

export function sandboxSessionCode(value: string | null | undefined) {
  const clean = cleanSessionCode(value);
  if (!clean) return "";
  const prefix = sandboxSessionPrefix();
  return clean.startsWith(`${prefix}_`) ? clean : `${prefix}_${clean}`;
}

export function runtimeSessionCode(value: string | null | undefined) {
  const clean = cleanSessionCode(value);
  if (!clean) return "";
  return isSandboxMode() ? sandboxSessionCode(clean) : clean;
}

export function isSandboxSessionCode(value: string | null | undefined) {
  return cleanSessionCode(value).startsWith(`${sandboxSessionPrefix()}_`);
}

export function sandboxSessionLikePattern() {
  return `${sandboxSessionPrefix()}\\_%`;
}

export function runtimeTelemetryMetadata(metadata: Record<string, unknown> = {}) {
  const tagged: Record<string, unknown> = {
    ...metadata,
    timecity_environment: runtimeEnvironment(),
    timecity_sandbox: isSandboxMode(),
  };
  if (isSandboxMode()) tagged.timecity_sandbox_prefix = sandboxSessionPrefix();
  return tagged;
}

export function runtimeTags(scope: string) {
  return ["timecity", scope, runtimeEnvironment(), isSandboxMode() ? "sandbox" : "live"];
}
