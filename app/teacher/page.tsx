import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { TeacherDashboard } from "@/components/teacher/TeacherDashboard";

export default function TeacherPage() {
  return (
    <>
      <div className="teacher-auth-bar teacher-topbar">
        <Link className="teacher-brand" href="/">
          TimeCity Rescue
        </Link>
        <div className="teacher-auth-links">
          <Link href="/team">Team dashboard</Link>
          <span>Teacher account</span>
          <UserButton />
        </div>
      </div>
      <TeacherDashboard />
    </>
  );
}
