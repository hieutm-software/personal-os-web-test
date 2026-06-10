import { MonitorSmartphone, MapPin, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  TableContainer,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/data-table";

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
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            {isAdmin && <TableHead className="w-[140px]">User</TableHead>}
            <TableHead>Device &amp; IP</TableHead>
            <TableHead className="w-[160px] hidden sm:table-cell">Location</TableHead>
            <TableHead className="w-[160px]">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id} className="hover:bg-transparent cursor-default">
              {isAdmin && (
                <TableCell className="text-xs font-medium text-muted-foreground">
                  {session.username || session.userId.slice(0, 8)}
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-start gap-2">
                  <MonitorSmartphone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-xs max-w-[200px] truncate" title={session.device || undefined}>
                      {session.device}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{session.ip}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex items-center gap-1.5 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {session.location || "Unknown"}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {formatDate(session.loginAt)}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
