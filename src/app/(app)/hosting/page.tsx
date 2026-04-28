import { redirect } from "next/navigation";

export const runtime = "edge";

export default function HostingPage() {
  redirect("/dashboard");
}
