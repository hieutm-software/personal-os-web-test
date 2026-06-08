import { MonitorSmartphone, MapPin, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";

type SessionItem = { id: string; userId: string; device: string | null; ip: string | null; location: string | null; loginAt: string; username?: string | null };

export function SessionsView({
  sessions,
  isAdmin,
}: {
  sessions: SessionItem[];
  isAdmin: boolean;
}) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        No login sessions found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
          <tr>
            {isAdmin && <th className="px-5 py-3">User</th>}
            <th className="px-5 py-3">Device & IP</th>
            <th className="px-5 py-3">Location</th>
            <th className="px-5 py-3">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sessions.map((session) => {
            const date = new Date(session.loginAt);
            const timeStr = formatDate(date);
            
            return (
              <tr key={session.id} className="hover:bg-muted/30 transition-colors">
                {isAdmin && (
                  <td className="px-5 py-3 font-medium">
                    {session.username || "Unknown"}
                  </td>
                )}
                <td className="px-5 py-3">
                  <div className="flex items-start gap-2">
                    <MonitorSmartphone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium text-xs max-w-[200px] truncate" title={session.device || undefined}>
                        {session.device}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{session.ip}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {session.location || "Unknown"}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {timeStr}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
