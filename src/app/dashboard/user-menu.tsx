"use client";

import { User, LogOut, Settings, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { logoutAction } from "@/lib/actions/auth";
import { AdminDialog } from "@/app/settings/admin-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserData = {
  id: string;
  username: string;
  role: "USER" | "ADMIN";
  createdAt: string;
};

export function UserMenu({
  isAdmin,
  allUsers,
  currentUserId,
}: {
  isAdmin: boolean;
  allUsers: UserData[];
  currentUserId: string;
}) {
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);

  const handleLogout = async () => {
    sessionStorage.removeItem("personalOSVaultKey");
    await logoutAction();
    window.location.href = "/login";
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-8 h-8 rounded-full bg-premium-dark border border-premium-border flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-premium-text hover:bg-black/5 dark:bg-white/5 transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <User className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 card-aura-responsive border-premium-border shadow-2xl rounded-xl p-1">
          
          <DropdownMenuItem asChild className="rounded-lg focus:bg-black/10 dark:focus:bg-white/10 focus:text-zinc-900 dark:focus:text-white cursor-pointer transition-colors text-zinc-700 dark:text-zinc-300 gap-2">
            <Link href="/settings">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </DropdownMenuItem>

          {isAdmin && (
            <DropdownMenuItem 
              className="rounded-lg focus:bg-black/10 dark:focus:bg-white/10 focus:text-zinc-900 dark:focus:text-white cursor-pointer transition-colors text-zinc-700 dark:text-zinc-300 gap-2"
              onSelect={() => setTimeout(() => setIsAdminDialogOpen(true), 0)}
            >
              <ShieldAlert className="w-4 h-4" />
              Admin Panel
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10 my-1" />

          <DropdownMenuItem 
            onClick={handleLogout}
            className="rounded-lg focus:bg-red-500/20 focus:text-red-400 text-red-500 cursor-pointer transition-colors gap-2 font-medium"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>

      {/* Admin Dialog is controlled independently to avoid dropdown closing issues */}
      {isAdmin && (
        <AdminDialog 
          allUsers={allUsers} 
          currentUserId={currentUserId}
          open={isAdminDialogOpen}
          onOpenChange={setIsAdminDialogOpen}
        >
          <div className="hidden" />
        </AdminDialog>
      )}
    </>
  );
}
