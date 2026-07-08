import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { roomService } from '@/services/roomService';
import { Loader2, LogIn, AlertCircle } from 'lucide-react';

interface JoinRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinRoomDialog({ open, onOpenChange }: JoinRoomDialogProps) {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatRoomCode = (value: string) => {
    // Auto-format: remove existing dashes, insert dashes at positions 3 and 6
    const clean = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 9);
    if (clean.length > 6) {
      return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
    } else if (clean.length > 3) {
      return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    }
    return clean;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomCode(formatRoomCode(e.target.value));
    setError(null);
  };

  const isValidCode = /^[a-zA-Z0-9]{3}-[a-zA-Z0-9]{3}-[a-zA-Z0-9]{3}$/.test(roomCode);

  const handleJoin = async () => {
    if (!isValidCode) {
      setError('Vui lòng nhập mã Meeting hợp lệ (định dạng: xxx-xxx-xxx)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await roomService.getRoomInfo(roomCode.toUpperCase());
      if (res.success && res.room) {
        onOpenChange(false);
        setRoomCode('');
        navigate(`/lobby?code=${res.room.room_code}`);
      }
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { message?: string } } };
      if (error.response?.status === 404) {
        setError('Không tìm thấy phòng. Vui lòng kiểm tra lại mã.');
      } else if (error.response?.status === 409) {
        setError('Meeting này đã kết thúc.');
      } else {
        setError(error.response?.data?.message || 'Lỗi khi tìm phòng');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValidCode && !loading) {
      handleJoin();
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setRoomCode('');
      setError(null);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px] bg-surface-container-lowest rounded-3xl border-outline-variant/10 p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary-container to-primary p-8 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-white">
              Tham gia cuộc họp
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6">
          {/* Room Code Input */}
          <div className="space-y-2">
            <Label
              htmlFor="join-room-code"
              className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
            >
              Mã Meeting
            </Label>
            <Input
              id="join-room-code"
              value={roomCode}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="xxx-xxx-xxx"
              className="h-14 text-center text-2xl font-mono font-bold tracking-[0.3em] bg-surface-container-highest border-none rounded-2xl text-on-surface placeholder:text-on-surface-variant/30 focus-visible:ring-2 focus-visible:ring-primary"
              autoFocus
              autoComplete="off"
            />
          </div>

          {/* Error State */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-error/5 border border-error/10 rounded-2xl">
              <AlertCircle size={18} className="text-error mt-0.5 shrink-0" />
              <p className="text-sm text-error font-medium">{error}</p>
            </div>
          )}

          {/* Join Button */}
          <Button
            onClick={handleJoin}
            disabled={loading || !isValidCode}
            className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2" size={20} />
            ) : (
              <LogIn className="mr-2" size={20} />
            )}
            {loading ? 'Đang tìm phòng...' : 'Tham gia Meeting'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
