import { UserButton } from "@clerk/nextjs";
import { TeacherDashboard } from "@/components/teacher/TeacherDashboard";

export default function TeacherPage() {
  return (
    <>
      <div className="teacher-auth-bar">
        <span>Teacher account</span>
        <UserButton />
      </div>
      <TeacherDashboard />
    </>
  );
}
