import { useState } from 'react';
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
  CalendarDays,
  ShieldCheck,
  Users,
  Clock,
} from 'lucide-react';

interface ScheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled?: () => void;
}

export function ScheduleMeetingDialog({ open, onOpenChange, onScheduled }: ScheduleMeetingDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [requireApproval, setRequireApproval] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState(100);
  const [loading, setLoading] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate('');
    setTime('');
    setRequireApproval(true);
    setMaxParticipants(100);
    setCreatedRoomCode(null);
    setCopied(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Vui lòng nhập tên Meeting');
      return;
    }
    if (!date || !time) {
      toast.error('Vui lòng chọn cả ngày và giờ');
      return;
    }

    const scheduledDate = new Date(`${date}T${time}`);
    const now = new Date();

    // Must be in the future (at least 2 minutes)
    if (scheduledDate.getTime() < now.getTime() + 2 * 60000) {
      toast.error('Thời gian lên lịch phải cách hiện tại ít nhất 2 phút');
      return;
    }

    setLoading(true);
    try {
      const res = await roomService.createRoom({
        title: title.trim(),
        description: description.trim() || undefined,
        started_at: scheduledDate.toISOString(),
        settings: {
          require_approval: requireApproval,
          max_participants: maxParticipants,
        },
      });
      if (res.success && res.room) {
        setCreatedRoomCode(res.room.room_code);
        toast.success('Lên lịch cuộc họp thành công!');
        if (onScheduled) onScheduled();
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Lỗi khi lên lịch Meeting');
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

  const handleClose = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] bg-surface-container-lowest rounded-3xl border-outline-variant/10 p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary-container p-8 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-white">
              {createdRoomCode ? 'Đã lên lịch cuộc họp!' : 'Lên lịch cuộc họp'}
            </DialogTitle>
            <DialogDescription className="text-white/70 text-sm mt-1">
              {createdRoomCode
                ? 'Cuộc họp của bạn đã được thêm vào lịch trình'
                : 'Lên kế hoạch cho một cuộc họp sắp tới'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6">
          {!createdRoomCode ? (
            <>
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="sched-title" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Tên cuộc họp
                </Label>
                <Input
                  id="sched-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập tên meeting"
                  className="h-12 bg-surface-container-highest border-none rounded-xl px-4 text-on-surface placeholder:text-on-surface-variant/40 focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sched-date" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                    <CalendarDays size={14} className="text-primary" />
                    Ngày
                  </Label>
                  <Input
                    id="sched-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="h-12 bg-surface-container-highest border-none rounded-xl px-4 text-on-surface focus-visible:ring-2 focus-visible:ring-primary appearance-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sched-time" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                    <Clock size={14} className="text-primary" />
                    Giờ
                  </Label>
                  <Input
                    id="sched-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-12 bg-surface-container-highest border-none rounded-xl px-4 text-on-surface focus-visible:ring-2 focus-visible:ring-primary appearance-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="sched-desc" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Mô tả <span className="text-on-surface-variant/40 normal-case tracking-normal">(không bắt buộc)</span>
                </Label>
                <Textarea
                  id="sched-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nội dung cuộc họp..."
                  rows={2}
                  className="bg-surface-container-highest border-none rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 focus-visible:ring-2 focus-visible:ring-primary resize-none"
                />
              </div>

              {/* Settings */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-4 bg-surface-container rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ShieldCheck size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">Yêu cầu phê duyệt</p>
                      <p className="text-xs text-on-surface-variant/60">Duyệt yêu cầu tham gia</p>
                    </div>
                  </div>
                  <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
                </div>
              </div>

              <Button
                onClick={handleCreate}
                disabled={loading || !title.trim() || !date || !time}
                className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : <CalendarDays className="mr-2" size={20} />}
                {loading ? 'Đang lên lịch...' : 'Lên lịch cuộc họp'}
              </Button>
            </>
          ) : (
            <div className="space-y-6">
              <div className="bg-surface-container rounded-2xl p-6 text-center space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">
                  Mã Meeting
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl font-extrabold tracking-widest text-primary font-mono">
                    {createdRoomCode}
                  </span>
                  <button onClick={handleCopy} className="p-2 rounded-xl hover:bg-primary/10 transition-colors text-primary">
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
                <div className="text-sm font-medium text-on-surface-variant/70 bg-surface-container-highest mt-4 mx-auto w-fit px-4 py-2 rounded-full flex items-center gap-2">
                  <Clock size={16} className="text-primary" />
                  {date} lúc {time}
                </div>
              </div>

              <Button onClick={() => handleClose(false)} className="w-full h-14 bg-surface-container text-on-surface rounded-full font-bold text-lg hover:bg-surface-container-high transition-all">
                Hoàn tất
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
