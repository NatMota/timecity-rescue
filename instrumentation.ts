const globalForLangfuse = globalThis as typeof globalThis & {
  __timecityLangfuseStarted?: boolean;
};

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (globalForLangfuse.__timecityLangfuseStarted) return;
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) return;

  const [{ NodeSDK }, { LangfuseSpanProcessor }] = await Promise.all([
    import("@opentelemetry/sdk-node"),
    import("@langfuse/otel"),
  ]);

  const sdk = new NodeSDK({
    spanProcessors: [
      new LangfuseSpanProcessor({
        exportMode: "immediate",
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        baseUrl: process.env.LANGFUSE_BASE_URL || process.env.LANGFUSE_HOST || process.env.LANGFUSE_URL,
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
        release: process.env.VERCEL_GIT_COMMIT_SHA,
        mediaUploadEnabled: false,
      }),
    ],
  });

  sdk.start();
  globalForLangfuse.__timecityLangfuseStarted = true;
}
