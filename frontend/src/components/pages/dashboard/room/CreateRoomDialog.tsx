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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { roomService } from '@/services/roomService';
import {
  Copy,
  Check,
  Loader2,
  Video,
  ShieldCheck,
  Users,
} from 'lucide-react';

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoomDialog({ open, onOpenChange }: CreateRoomDialogProps) {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(100);
  const [loading, setLoading] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setRequireApproval(false);
    setMaxParticipants(100);
    setCreatedRoomCode(null);
    setCopied(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Vui lòng nhập tên Meeting');
      return;
    }

    setLoading(true);
    try {
      const res = await roomService.createRoom({
        title: title.trim(),
        description: description.trim() || undefined,
        settings: {
          require_approval: requireApproval,
          max_participants: maxParticipants,
        },
      });

      if (res.success && res.room) {
        setCreatedRoomCode(res.room.room_code);
        toast.success('Tạo Meeting thành công!');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Lỗi khi tạo Meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (createdRoomCode) {
      await navigator.clipboard.writeText(createdRoomCode);
      setCopied(true);
      toast.success('Đã sao chép Meeting ID!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartMeeting = () => {
    if (createdRoomCode) {
      onOpenChange(false);
      resetForm();
      navigate(`/lobby?code=${createdRoomCode}`);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-2rem)] md:w-full max-w-[480px] mx-auto bg-surface-container-lowest rounded-3xl border-outline-variant/10 p-0 overflow-hidden max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-primary-container p-5 md:p-8 text-white shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-extrabold tracking-tight text-white">
              {createdRoomCode ? 'Meeting đã sẵn sàng!' : 'Tạo phòng họp'}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-5 md:p-8 space-y-4 md:space-y-5 overflow-y-auto flex-1">
          {!createdRoomCode ? (
            <>
              {/* Title */}
              <div className="space-y-2">
                <Label
                  htmlFor="room-title"
                  className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
                >
                  Tên Meeting
                </Label>
                <Input
                  id="room-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="tên cuộc họp"
                  className="h-12 bg-surface-container-highest border-none rounded-xl px-4 text-on-surface placeholder:text-on-surface-variant/40 focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label
                  htmlFor="room-desc"
                  className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
                >
                  Mô tả
                  <span className="text-on-surface-variant/40 ml-1 normal-case tracking-normal">
                    (không bắt buộc)
                  </span>
                </Label>
                <Textarea
                  id="room-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="mô tả nội dung cuộc họp"
                  rows={2}
                  className="bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 focus-visible:ring-2 focus-visible:ring-primary resize-none"
                />
              </div>

              {/* Settings */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 md:p-4 bg-surface-container rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ShieldCheck size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">
                        Yêu cầu phê duyệt
                      </p>
                      <p className="text-xs text-on-surface-variant/60">
                        Duyệt yêu cầu tham gia trước khi cho phép vào
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={requireApproval}
                    onCheckedChange={setRequireApproval}
                  />
                </div>

              </div>

              {/* Create Button */}
              <Button
                onClick={handleCreate}
                disabled={loading || !title.trim()}
                className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <Loader2 className="animate-spin mr-2" size={20} />
                ) : (
                  <Video className="mr-2" size={20} />
                )}
                {loading ? 'Đang tạo...' : 'Tạo phòng họp'}
              </Button>
            </>
          ) : (
            /* Success State */
            <div className="space-y-6">
              {/* Room Code Display */}
              <div className="bg-surface-container rounded-2xl p-6 text-center space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">
                  Mã Meeting
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl font-extrabold tracking-widest text-primary font-mono">
                    {createdRoomCode}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-xl hover:bg-primary/10 transition-colors text-primary"
                    aria-label="Copy room code"
                  >
                    {copied ? (
                      <Check size={20} />
                    ) : (
                      <Copy size={20} />
                    )}
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant/50">
                  Chia sẻ mã này với những người tham gia
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleStartMeeting}
                  className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <Video className="mr-2" size={20} />
                  Bắt đầu Meeting ngay
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleClose(false)}
                  className="w-full h-12 rounded-full font-bold text-on-surface-variant hover:text-primary"
                >
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
