import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authService } from "@/services/authService";
import { roomService } from "@/services/roomService";
import { useMeetingStore } from "@/stores/meetingStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { Search, Mail, Loader2, Check, Send } from "lucide-react";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomCode: string;
}

interface UserSearchResult {
  _id: string;
  full_name: string;
  email: string;
  avatar: string | null;
}

export function InviteUserDialog({ open, onOpenChange, roomCode }: InviteUserDialogProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitingIds, setInvitingIds] = useState<Set<string>>(new Set());
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  const participants = useMeetingStore((s) => s.participants);
  const hostId = useMeetingStore((s) => s.hostId);
  const authUser = useAuthStore((s) => s.user);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [query]);

  // Execute search when query updates
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const res = await authService.searchUsers(debouncedQuery);
        if (res.success) {
          // Filter out host and current participants from search results
          const activeIds = new Set<string>();
          if (hostId) activeIds.add(hostId);
          if (authUser?._id) activeIds.add(authUser._id);
          participants.forEach((p) => {
            if (p.id) activeIds.add(p.id);
          });

          const filtered = res.users.filter((u) => !activeIds.has(u._id));
          setResults(filtered);
        }
      } catch (err) {
        toast.error("Failed to search users");
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [debouncedQuery, hostId, authUser, participants]);

  // Handle invitation trigger
  const handleInvite = async (user: UserSearchResult) => {
    setInvitingIds((prev) => {
      const next = new Set(prev);
      next.add(user._id);
      return next;
    });
    try {
      const res = await roomService.inviteUser(roomCode, user._id);
      if (res.success) {
        setInvitedIds((prev) => {
          const next = new Set(prev);
          next.add(user._id);
          return next;
        });
        toast.success(`Invitation sent to ${user.full_name}`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to invite user";
      toast.error(msg);
    } finally {
      setInvitingIds((prev) => {
        const next = new Set(prev);
        next.delete(user._id);
        return next;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[440px] max-w-full bg-surface-container-lowest border-outline-variant/10 p-6 flex flex-col gap-4">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-xl font-bold text-orange-950 flex items-center gap-2">
            <Mail className="text-primary" size={20} />
            Invite Participant
          </DialogTitle>
          <DialogDescription className="text-xs text-on-surface-variant/70">
            Search users by email to invite them to join the current meeting session.
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type email address..."
            className="pl-11 h-11 rounded-xl bg-surface-container border-outline-variant/20 focus-visible:ring-primary/20 text-sm"
          />
        </div>

        {/* Search Results */}
        <ScrollArea className="h-64 mt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Loader2 className="animate-spin text-primary" size={24} />
              <span className="text-xs text-on-surface-variant/50">Searching system users...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-3">
                <Search size={20} className="text-on-surface-variant/30" />
              </div>
              <p className="text-sm font-bold text-on-surface">No users found</p>
              <p className="text-xs text-on-surface-variant/50 max-w-[240px] mt-1">
                {query ? "Try searching for a different email address." : "Start typing an email to search for online users."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 pr-2">
              {results.map((user) => {
                const isInviting = invitingIds.has(user._id);
                const isInvited = invitedIds.has(user._id);

                return (
                  <div
                    key={user._id}
                    className="flex items-center gap-3 p-3 bg-surface-container rounded-xl border border-outline-variant/5 transition-all hover:bg-surface-container-high"
                  >
                    <Avatar className="w-9 h-9">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.full_name} className="object-cover" />
                      ) : (
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {user.full_name[0].toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{user.full_name}</p>
                      <p className="text-[10px] text-on-surface-variant/60 truncate">{user.email}</p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleInvite(user)}
                      disabled={isInviting || isInvited}
                      className={`h-8 rounded-lg text-xs font-bold px-3 shrink-0 transition-all ${
                        isInvited
                          ? "bg-green-500/10 text-green-600 border border-green-200/20 hover:bg-green-500/10"
                          : "bg-primary text-white hover:bg-primary/95"
                      }`}
                    >
                      {isInviting ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : isInvited ? (
                        <span className="flex items-center gap-1">
                          <Check size={12} /> Invited
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Send size={12} /> Invite
                        </span>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
