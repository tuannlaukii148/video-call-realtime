import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { ROOM_EVENTS } from "@/socket/events";
import { toast } from "sonner";

interface ProtectedRouteProps {
  requireAdmin?: boolean;
}

export function ProtectedRoute({ requireAdmin = false }: ProtectedRouteProps) {
  const { accessToken, user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize and connect socket globally when authenticated
  const socket = useSocket();

  useEffect(() => {
    if (!accessToken || !socket) return;

    const handleInvite = (data: { roomCode: string; hostId: string; hostName: string }) => {
      const { roomCode, hostId, hostName } = data;
      
      toast.info(`Invitation from ${hostName}`, {
        description: `You are invited to join meeting room: ${roomCode}`,
        duration: 20000,
        action: {
          label: "Join",
          onClick: () => {
            navigate(`/lobby?code=${roomCode}`);
          },
        },
        cancel: {
          label: "Decline",
          onClick: () => {
            socket.emit(ROOM_EVENTS.DECLINE_INVITE, {
              roomCode,
              hostId,
              userName: user?.full_name || user?.email || "Someone",
            });
            toast.dismiss();
          },
        },
      });
    };

    socket.on(ROOM_EVENTS.INVITE, handleInvite);

    return () => {
      socket.off(ROOM_EVENTS.INVITE, handleInvite);
    };
  }, [accessToken, socket, navigate, user]);

  if (!accessToken) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (requireAdmin && user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
