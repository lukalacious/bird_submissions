import {
  getPendingChangeRequests,
  getResolvedChangeRequests,
} from "@/app/actions/change-request-actions";
import { ChangeRequestPanel } from "@/components/admin/change-request-panel";

export const dynamic = "force-dynamic";

export default async function ChangeRequestsPage() {
  const [pending, resolved] = await Promise.all([
    getPendingChangeRequests(),
    getResolvedChangeRequests(),
  ]);

  return (
    <ChangeRequestPanel
      pending={JSON.parse(JSON.stringify(pending))}
      resolved={JSON.parse(JSON.stringify(resolved))}
    />
  );
}
