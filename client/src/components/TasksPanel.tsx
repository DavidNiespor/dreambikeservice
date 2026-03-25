import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, apiFetch } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, Plus, Trash2, ClipboardCheck } from "lucide-react";
import type { Task, User } from "@shared/schema";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface Props {
  orderId?: number;   // jeśli podany — zadania dla konkretnego zlecenia
  showAll?: boolean;  // owner: pokaż wszystkie zadania
}

export default function TasksPanel({ orderId, showAll }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = user?.role === "owner";
  const isMechOwner = user?.role === "mechanic" || user?.role === "owner";

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: orderId ? ["/api/orders", String(orderId), "tasks"] : ["/api/tasks"],
    queryFn: async () => {
      const url = orderId ? `/api/orders/${orderId}/tasks` : `/api/tasks`;
      const r = await apiFetch(url);
      return r.json();
    },
  });

  const { data: mechanics = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isOwner,
    select: users => users.filter(u => u.role === "mechanic" || u.role === "owner"),
  });

  const pending = tasks.filter(t => t.status !== "done");
  const done = tasks.filter(t => t.status === "done");

  return (
    <div className="space-y-3">
      {isMechOwner && (
        <AddTaskDialog orderId={orderId} mechanics={mechanics} isOwner={isOwner} />
      )}

      {isLoading ? (
        <div className="text-center text-muted-foreground text-sm py-4">Ładowanie...</div>
      ) : tasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <ClipboardCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Brak przypisanych zadań</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Oczekujące */}
          {pending.map(t => <TaskCard key={t.id} task={t} mechanics={mechanics} isOwner={isOwner} currentUserId={user!.id} />)}
          {/* Zakończone */}
          {done.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Wykonane ({done.length})
              </p>
              <div className="space-y-1.5 opacity-70">
                {done.map(t => <TaskCard key={t.id} task={t} mechanics={mechanics} isOwner={isOwner} currentUserId={user!.id} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, mechanics, isOwner, currentUserId }: { task: Task; mechanics: User[]; isOwner: boolean; currentUserId: number }) {
  const { toast } = useToast();
  const [showDoneDialog, setShowDoneDialog] = useState(false);
  const [doneNote, setDoneNote] = useState("");
  const isDone = task.status === "done";
  const isAssignedToMe = task.assignedTo === currentUserId;
  const mechName = mechanics.find(m => m.id === task.assignedTo)?.name || `Mechanik #${task.assignedTo}`;

  const cacheKey = task.repairOrderId
    ? ["/api/orders", String(task.repairOrderId), "tasks"]
    : ["/api/tasks"];

  const markDone = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/tasks/${task.id}`, { status: "done", doneNote: doneNote || undefined }),
    onSuccess: () => { setShowDoneDialog(false); queryClient.invalidateQueries({ queryKey: cacheKey }); queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); toast({ title: "Zadanie odznaczone" }); },
  });

  const delTask = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/tasks/${task.id}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: cacheKey }); queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); },
  });

  return (
    <Card className={`${isDone ? "border-emerald-200 dark:border-emerald-900" : ""}`} data-testid={`card-task-${task.id}`}>
      <CardContent className="py-2.5 px-3">
        <div className="flex items-start gap-2.5">
          {/* Status icon */}
          <div className="flex-shrink-0 mt-0.5">
            {isDone
              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              : task.status === "in_progress"
                ? <Clock className="w-4 h-4 text-amber-500" />
                : <Circle className="w-4 h-4 text-muted-foreground" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
            {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {isOwner && <span className="text-xs text-muted-foreground">{mechName}</span>}
              {task.dueDate && (
                <span className={`text-xs flex items-center gap-0.5 ${new Date(task.dueDate) < new Date() && !isDone ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                  <Clock className="w-3 h-3" />{format(new Date(task.dueDate), "d MMM", { locale: pl })}
                </span>
              )}
              {isDone && task.doneNote && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ {task.doneNote}</span>
              )}
              {isDone && task.doneAt && (
                <span className="text-xs text-muted-foreground">{format(new Date(task.doneAt), "d MMM HH:mm", { locale: pl })}</span>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {/* Mechanik: odznacz swoje zadanie */}
            {!isDone && isAssignedToMe && (
              <Dialog open={showDoneDialog} onOpenChange={setShowDoneDialog}>
                <DialogTrigger asChild>
                  <button className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 text-muted-foreground hover:text-emerald-600 transition-colors" title="Odznacz jako wykonane">
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-sm mx-auto">
                  <DialogHeader><DialogTitle>Odznacz zadanie</DialogTitle></DialogHeader>
                  <div className="space-y-3 mt-2">
                    <p className="text-sm font-medium">{task.title}</p>
                    <div>
                      <Label className="text-xs">Co zostało wykonane? (opcjonalnie)</Label>
                      <Textarea value={doneNote} onChange={e => setDoneNote(e.target.value)}
                        placeholder="Krótka notatka o tym co wykonałeś..." rows={3} />
                    </div>
                    <Button className="w-full" onClick={() => markDone.mutate()} disabled={markDone.isPending}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Odznacz jako wykonane
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {/* Owner: usuń zadanie */}
            {isOwner && (
              <button onClick={() => delTask.mutate()}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddTaskDialog({ orderId, mechanics, isOwner }: { orderId?: number; mechanics: User[]; isOwner: boolean }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: "", description: "", dueDate: new Date().toISOString().slice(0, 10),
    assignedTo: isOwner ? "" : String(user?.id || ""),
  });

  const cacheKey = orderId ? ["/api/orders", String(orderId), "tasks"] : ["/api/tasks"];

  const mut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/tasks", {
      title: form.title,
      description: form.description || undefined,
      dueDate: form.dueDate || undefined,
      assignedTo: Number(form.assignedTo),
      repairOrderId: orderId || undefined,
    }),
    onSuccess: () => {
      setOpen(false);
      setForm({ title: "", description: "", dueDate: new Date().toISOString().slice(0, 10), assignedTo: isOwner ? "" : String(user?.id || "") });
      queryClient.invalidateQueries({ queryKey: cacheKey });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Zadanie przypisane" });
    },
    onError: (e: any) => toast({ title: "Błąd", description: e.message, variant: "destructive" }),
  });

  const canSubmit = form.title && form.assignedTo;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full" data-testid="button-add-task">
          <Plus className="w-3.5 h-3.5 mr-1.5" />Przypisz zadanie
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader><DialogTitle>Nowe zadanie</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div><Label className="text-xs">Tytuł zadania *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="np. Wymień klocki hamulcowe" />
          </div>
          <div><Label className="text-xs">Opis</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Szczegóły..." />
          </div>
          {isOwner && mechanics.length > 0 && (
            <div><Label className="text-xs">Przypisz do *</Label>
              <Select value={form.assignedTo} onValueChange={v => setForm(f => ({ ...f, assignedTo: v }))}>
                <SelectTrigger><SelectValue placeholder="Wybierz mechanika..." /></SelectTrigger>
                <SelectContent>
                  {mechanics.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div><Label className="text-xs">Termin</Label>
            <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending || !canSubmit}>
            {mut.isPending ? "Przypisywanie..." : "Przypisz zadanie"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
