import { Activity } from "lucide-react";

interface ActivityRowProps {
  action: string;
  detail: string;
}

export function ActivityRow({ action, detail }: ActivityRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-3xl bg-surface-container-lowest p-4 border border-outline-variant/10">
      <div>
        <p className="font-semibold text-on-surface">{action}</p>
        <p className="text-sm text-on-surface-variant mt-1">{detail}</p>
      </div>
      <Activity size={20} className="text-primary" />
    </div>
  );
}
