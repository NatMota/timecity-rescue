import { SceneStage } from "@/components/student/SceneStage";

export default async function PlayPage({ params }: { params: Promise<{ sessionCode: string }> }) {
  const { sessionCode } = await params;
  return <SceneStage initialSessionCode={sessionCode} />;
}
