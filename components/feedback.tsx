import { CircleAlert, CircleCheck, Info, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

export function Feedback({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" | "info" }) {
  const Icon = tone === "error" ? CircleAlert : tone === "success" ? CircleCheck : Info;
  return <div className={`feedback feedback-${tone}`} role={tone === "error" ? "alert" : "status"}><Icon aria-hidden="true" /><span>{children}</span></div>;
}

export function LoadingWorkspace() {
  return <main className="workspace-loading" role="status"><LoaderCircle className="spin" aria-hidden="true" /><p>Opening your workspace…</p></main>;
}
