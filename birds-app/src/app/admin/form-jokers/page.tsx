import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FormJokerPanel } from "./form-joker-panel";

export default async function AdminFormJokersPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Form Jokers</h1>
      <p className="text-gray-600 mb-6">
        Process monthly Google Form responses to award bonus jokers.
      </p>
      <FormJokerPanel />
    </div>
  );
}
