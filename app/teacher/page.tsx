import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { TeacherDashboard } from "@/components/teacher/TeacherDashboard";

export default function TeacherPage() {
  return (
    <>
      <div className="teacher-auth-bar">
        <Link href="/team">Team dashboard</Link>
        <span>Teacher account</span>
        <UserButton />
      </div>
      <TeacherDashboard />
    </>
  );
}
