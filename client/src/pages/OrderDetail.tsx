import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, apiFetch, getAuthToken } from "@/lib/queryClient";
import CommentsPanel from "@/components/CommentsPanel";
import TasksPanel from "@/components/TasksPanel";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { StatusBadge, PriorityBadge, STATUS_OPTIONS } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Plus, Trash2, Camera, Check, X, Wrench,
  ClipboardList, Image, CreditCard, Edit, Save, Car
} from "lucide-react";
import type { RepairOrder, Vehicle, User, QuoteItem, WorkEntry, Photo, Payment } from "@shared/schema";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

const navItems: any[] = [];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: order, isLoading } = useQuery<RepairOrder>({ queryKey: ["/api/orders", id], queryFn: async () => { const r = await apiFetch(`/api/orders/${id}`); if (!r.ok) throw new Error("Not found"); return r.json(); } });

  if (isLoading) return (
    <AppLayout title="Zlecenie" navItems={navItems}>
      <Skeleton className="h-64 w-full rounded-xl" />
    </AppLayout>
  );
  if (!order) return (
    <AppLayout title="Zlecenie" navItems={navItems}>
      <div className="text-center py-16 text-muted-foreground">Zlecenie nie istnieje</div>
    </AppLayout>
  );

  return (
    <AppLayout title={`Zlecenie #${id}`} navItems={navItems}>
      <OrderDetailContent order={order} />
    </AppLayout>
  );
}

function OrderDetailContent({ order }: { order: RepairOrder }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState("info");

  const { data: vehicle } = useQuery<Vehicle>({ queryKey: ["/api/vehicles", order.vehicleId], queryFn: async () => { const r = await apiFetch(`/api/vehicles/${order.vehicleId}`); return r.json(); } });
  const { data: quotes = [] } = useQuery<QuoteItem[]>({ queryKey: ["/api/orders", String(order.id), "quotes"], queryFn: async () => { const r = await apiFetch(`/api/orders/${order.id}/quotes`); return r.json(); } });
  const { data: works = [] } = useQuery<WorkEntry[]>({ queryKey: ["/api/orders", String(order.id), "work"], queryFn: async () => { const r = await apiFetch(`/api/orders/${order.id}/work`); return r.json(); } });
  const { data: photos = [] } = useQuery<Photo[]>({ queryKey: ["/api/orders", String(order.id), "photos"], queryFn: async () => { const r = await apiFetch(`/api/orders/${order.id}/photos`); return r.json(); } });
  const { data: payments = [] } = useQuery<Payment[]>({ queryKey: ["/api/orders", String(order.id), "payments"], queryFn: async () => { const r = await apiFetch(`/api/orders/${order.id}/payments`); return r.json(); } });

  const quoteTotal = quotes.reduce((s, q) => s + q.quantity * q.unitPrice, 0);
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);

  const isMechOwner = user?.role === "mechanic" || user?.role === "owner";
  const isOwner = user?.role === "owner";
  const isClient = user?.role === "client";

  const updateStatus = useMutation({
    mutationFn: (status: string) => apiRequest("PATCH", `/api/orders/${order.id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/orders", String(order.id)] }); queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); toast({ title: "Status zaktualizowany" }); },
  });

  return (
    <div className="space-y-4">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => navigate("/")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold leading-tight truncate">{order.title}</h1>
          <p className="text-xs text-muted-foreground">Zlecenie #{order.id}</p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <PriorityBadge priority={order.priority} />
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Vehicle info */}
      {vehicle && (
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Car className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{vehicle.brand} {vehicle.model}</span>
            {vehicle.licensePlate && <span className="text-xs text-muted-foreground">· {vehicle.licensePlate}</span>}
            {order.mileage && <span className="text-xs text-muted-foreground ml-auto">{order.mileage.toLocaleString()} km</span>}
          </CardContent>
        </Card>
      )}

      {/* Client: quote accept/reject */}
      {isClient && order.status === "quoted" && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="py-3 px-4">
            <p className="text-sm font-medium mb-2">Wycena gotowa — łączna kwota: <span className="text-primary font-bold">{quoteTotal.toFixed(2)} zł</span></p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => updateStatus.mutate("quote_accepted")} disabled={updateStatus.isPending} data-testid="button-accept">
                <Check className="w-3.5 h-3.5 mr-1.5" />Akceptuj
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate("quote_rejected")} disabled={updateStatus.isPending} data-testid="button-reject">
                <X className="w-3.5 h-3.5 mr-1.5" />Odrzuć
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mechanic/Owner: status change */}
      {isMechOwner && (
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground flex-shrink-0">Zmień status:</span>
            <Select value={order.status} onValueChange={v => updateStatus.mutate(v)}>
              <SelectTrigger className="flex-1 h-8 text-xs" data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="info" className="flex-1 text-xs">Info</TabsTrigger>
          <TabsTrigger value="comments" className="flex-1 text-xs">Koment.</TabsTrigger>
          <TabsTrigger value="quotes" className="flex-1 text-xs">Wycena</TabsTrigger>
          <TabsTrigger value="work" className="flex-1 text-xs">Prace</TabsTrigger>
          <TabsTrigger value="photos" className="flex-1 text-xs">Zdjęcia</TabsTrigger>
          {isMechOwner && <TabsTrigger value="tasks" className="flex-1 text-xs">Zadania</TabsTrigger>}
          {isOwner && <TabsTrigger value="payment" className="flex-1 text-xs">Płatność</TabsTrigger>}
        </TabsList>

        {/* KOMENTARZE */}
        <TabsContent value="comments" className="mt-4">
          <CommentsPanel orderId={order.id} />
        </TabsContent>

        {/* ZADANIA */}
        {isMechOwner && (
          <TabsContent value="tasks" className="mt-4">
            <TasksPanel orderId={order.id} />
          </TabsContent>
        )}

        {/* INFO */}
        <TabsContent value="info" className="mt-4 space-y-3">
          <Card>
            <CardContent className="py-3 px-4 space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Opis usterki</p>
                <p className="text-sm">{order.description}</p>
              </div>
              {order.clientNotes && <div>
                <p className="text-xs text-muted-foreground mb-1">Uwagi klienta</p>
                <p className="text-sm">{order.clientNotes}</p>
              </div>}
              {order.mechanicNotes && <div>
                <p className="text-xs text-muted-foreground mb-1">Uwagi mechanika</p>
                <p className="text-sm">{order.mechanicNotes}</p>
              </div>}
              {order.estimatedCompletionDate && <div>
                <p className="text-xs text-muted-foreground mb-1">Szacowana data zakończenia</p>
                <p className="text-sm">{order.estimatedCompletionDate}</p>
              </div>}
              <div className="pt-1 text-xs text-muted-foreground">
                Zgłoszono: {format(new Date(order.createdAt), "d MMMM yyyy, HH:mm", { locale: pl })}
              </div>
            </CardContent>
          </Card>
          {isMechOwner && <EditOrderNotes order={order} />}
        </TabsContent>

        {/* QUOTES */}
        <TabsContent value="quotes" className="mt-4 space-y-3">
          {isMechOwner && <AddQuoteItemDialog orderId={order.id} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/orders", String(order.id), "quotes"] })} />}
          <div className="space-y-2">
            {quotes.map(q => (
              <Card key={q.id} data-testid={`card-quote-${q.id}`}>
                <CardContent className="py-3 px-4 flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${q.type === "labor" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                    {q.type === "labor" ? "Robocizna" : "Część"}
                  </span>
                  <span className="flex-1 text-sm">{q.description}</span>
                  <span className="text-xs text-muted-foreground">{q.quantity} ×</span>
                  <span className="font-semibold text-sm">{q.unitPrice.toFixed(2)} zł</span>
                  {isMechOwner && (
                    <button onClick={() => { apiRequest("DELETE", `/api/quotes/${q.id}`, {}).then(() => queryClient.invalidateQueries({ queryKey: ["/api/orders", String(order.id), "quotes"] })); }} className="text-muted-foreground hover:text-destructive transition-colors ml-1" data-testid={`delete-quote-${q.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {quotes.length > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-3 px-4 flex justify-between items-center">
                <span className="font-semibold text-sm">Razem</span>
                <span className="font-bold text-primary text-lg">{quoteTotal.toFixed(2)} zł</span>
              </CardContent>
            </Card>
          )}
          {quotes.length === 0 && <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground text-sm">Brak pozycji w wycenie</CardContent></Card>}
        </TabsContent>

        {/* WORK */}
        <TabsContent value="work" className="mt-4 space-y-3">
          {isMechOwner && <AddWorkEntryDialog orderId={order.id} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/orders", String(order.id), "work"] })} />}
          <div className="space-y-2">
            {works.map(w => (
              <Card key={w.id} data-testid={`card-work-${w.id}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm flex-1">{w.description}</p>
                    {isMechOwner && (
                      <button onClick={() => { apiRequest("DELETE", `/api/work/${w.id}`, {}).then(() => queryClient.invalidateQueries({ queryKey: ["/api/orders", String(order.id), "work"] })); }} className="text-muted-foreground hover:text-destructive transition-colors" data-testid={`delete-work-${w.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {w.hoursSpent && <span>⏱ {w.hoursSpent} godz.</span>}
                    {w.cost && <span>💰 {w.cost.toFixed(2)} zł</span>}
                    <span className="ml-auto">{format(new Date(w.createdAt), "d MMM HH:mm", { locale: pl })}</span>
                  </div>
                  {w.partsUsed && <p className="text-xs text-muted-foreground mt-1">Części: {w.partsUsed}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
          {works.length === 0 && <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground text-sm">Brak wpisów prac</CardContent></Card>}
        </TabsContent>

        {/* PHOTOS */}
        <TabsContent value="photos" className="mt-4 space-y-3">
          <PhotoUpload orderId={order.id} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/orders", String(order.id), "photos"] })} />
          {["before", "during", "after"].map(phase => {
            const phasePhotos = photos.filter(p => p.phase === phase);
            if (phasePhotos.length === 0) return null;
            return (
              <div key={phase}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {phase === "before" ? "Przed naprawą" : phase === "during" ? "W trakcie" : "Po naprawie"}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {phasePhotos.map(p => (
                    <div key={p.id} className="relative rounded-xl overflow-hidden aspect-square bg-muted" data-testid={`photo-${p.id}`}>
                      <img src={`/uploads/${p.filename}`} alt={p.caption || p.originalName} className="w-full h-full object-cover" />
                      {p.caption && <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-xs text-white truncate">{p.caption}</div>}
                      {isMechOwner && (
                        <button onClick={() => { apiRequest("DELETE", `/api/photos/${p.id}`, {}).then(() => queryClient.invalidateQueries({ queryKey: ["/api/orders", String(order.id), "photos"] })); }}
                          className="absolute top-1 right-1 bg-black/50 hover:bg-destructive rounded-full p-1 text-white transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {photos.length === 0 && <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground text-sm">Brak zdjęć</CardContent></Card>}
        </TabsContent>

        {/* PAYMENT */}
        {isOwner && (
          <TabsContent value="payment" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground">Wycena</p>
                  <p className="font-bold text-primary">{quoteTotal.toFixed(2)} zł</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground">Zapłacono</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">{paidTotal.toFixed(2)} zł</p>
                </CardContent>
              </Card>
            </div>
            {quoteTotal - paidTotal > 0.01 && (
              <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-amber-700 dark:text-amber-300">Pozostało do zapłaty</p>
                  <p className="font-bold text-amber-700 dark:text-amber-300">{(quoteTotal - paidTotal).toFixed(2)} zł</p>
                </CardContent>
              </Card>
            )}
            <AddPaymentDialog orderId={order.id} suggested={quoteTotal - paidTotal} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ["/api/orders", String(order.id), "payments"] }); queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); queryClient.invalidateQueries({ queryKey: ["/api/payments"] }); queryClient.invalidateQueries({ queryKey: ["/api/stats"] }); }} />
            <div className="space-y-2">
              {payments.map(p => (
                <Card key={p.id}>
                  <CardContent className="py-3 px-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium capitalize">{p.method === "cash" ? "Gotówka" : p.method === "card" ? "Karta" : "Przelew"}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(p.paidAt), "d MMM yyyy HH:mm", { locale: pl })}</p>
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{p.amount.toFixed(2)} zł</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function EditOrderNotes({ order }: { order: RepairOrder }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ mechanicNotes: order.mechanicNotes || "", estimatedCompletionDate: order.estimatedCompletionDate || "" });
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/orders/${order.id}`, form),
    onSuccess: () => { setOpen(false); queryClient.invalidateQueries({ queryKey: ["/api/orders", String(order.id)] }); toast({ title: "Zaktualizowano" }); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full" data-testid="button-edit-notes">
          <Edit className="w-3.5 h-3.5 mr-1.5" />Edytuj uwagi
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader><DialogTitle>Uwagi mechanika</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div><Label className="text-xs">Uwagi mechanika</Label><Textarea value={form.mechanicNotes} onChange={e => setForm(f => ({ ...f, mechanicNotes: e.target.value }))} rows={4} /></div>
          <div><Label className="text-xs">Szacowana data zakończenia</Label><Input type="date" value={form.estimatedCompletionDate} onChange={e => setForm(f => ({ ...f, estimatedCompletionDate: e.target.value }))} /></div>
          <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending} data-testid="button-save-notes">Zapisz</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddQuoteItemDialog({ orderId, onSuccess }: { orderId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "labor", description: "", quantity: "1", unitPrice: "" });
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/orders/${orderId}/quotes`, { type: form.type, description: form.description, quantity: parseFloat(form.quantity), unitPrice: parseFloat(form.unitPrice) }),
    onSuccess: () => { setOpen(false); setForm({ type: "labor", description: "", quantity: "1", unitPrice: "" }); onSuccess(); toast({ title: "Pozycja dodana" }); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full" data-testid="button-add-quote">
          <Plus className="w-3.5 h-3.5 mr-1.5" />Dodaj pozycję
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader><DialogTitle>Nowa pozycja wyceny</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs">Typ</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger data-testid="select-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="labor">Robocizna</SelectItem>
                <SelectItem value="part">Część</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Opis *</Label><Input data-testid="input-quote-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={form.type === "labor" ? "np. Wymiana oleju — 1h" : "np. Filtr oleju HF138"} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Ilość / godziny</Label><Input data-testid="input-quantity" type="number" step="0.5" min="0.5" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
            <div><Label className="text-xs">Cena jedn. (zł) *</Label><Input data-testid="input-price" type="number" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} /></div>
          </div>
          {form.quantity && form.unitPrice && (
            <p className="text-sm text-muted-foreground">Razem: <strong className="text-foreground">{(parseFloat(form.quantity) * parseFloat(form.unitPrice)).toFixed(2)} zł</strong></p>
          )}
          <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending || !form.description || !form.unitPrice} data-testid="button-save-quote">Dodaj pozycję</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Typ dla wybranej części z magazynu
type SelectedPart = { partId: number; name: string; qty: number; unit: string; price: number; fromStock: boolean };

function AddWorkEntryDialog({ orderId, onSuccess }: { orderId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", hoursSpent: "", cost: "" });
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [manualPart, setManualPart] = useState(""); // wpisane ręcznie
  const { toast } = useToast();

  // Pobierz magazyn
  const { data: stockParts = [] } = useQuery<any[]>({ queryKey: ["/api/parts"] });

  const addFromStock = (part: any) => {
    if (selectedParts.find(p => p.partId === part.id)) return;
    setSelectedParts(prev => [...prev, {
      partId: part.id, name: part.name, qty: 1,
      unit: part.unit, price: part.sellPrice || 0, fromStock: true,
    }]);
  };

  const removeSelected = (partId: number) => setSelectedParts(prev => prev.filter(p => p.partId !== partId));
  const updateQty = (partId: number, qty: number) => setSelectedParts(prev => prev.map(p => p.partId === partId ? { ...p, qty } : p));
  const updatePrice = (partId: number, price: number) => setSelectedParts(prev => prev.map(p => p.partId === partId ? { ...p, price } : p));

  const partsTotal = selectedParts.reduce((s, p) => s + p.qty * p.price, 0);

  // Buduje tekstowy opis użytych części (do pola partsUsed)
  const buildPartsText = () => {
    const fromStock = selectedParts.map(p => `${p.name} ×${p.qty} ${p.unit}`).join(", ");
    return [fromStock, manualPart].filter(Boolean).join(", ");
  };

  const mut = useMutation({
    mutationFn: async () => {
      // 1. Wyślij ruch magazynowy dla każdej wybranej części
      for (const p of selectedParts.filter(p => p.fromStock)) {
        await apiRequest("POST", `/api/parts/${p.partId}/movements`, {
          type: "out",
          qty: p.qty,
          price: p.price,
          note: `Zlecenie #${orderId}`,
          repairOrderId: orderId,
        });
      }
      // 2. Zapisz wpis pracy
      return apiRequest("POST", `/api/orders/${orderId}/work`, {
        description: form.description,
        hoursSpent: form.hoursSpent ? parseFloat(form.hoursSpent) : undefined,
        partsUsed: buildPartsText() || undefined,
        cost: form.cost ? parseFloat(form.cost) : (partsTotal > 0 ? partsTotal : undefined),
      });
    },
    onSuccess: () => {
      setOpen(false);
      setForm({ description: "", hoursSpent: "", cost: "" });
      setSelectedParts([]);
      setManualPart("");
      onSuccess();
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({ title: "Praca dodana", description: selectedParts.length > 0 ? `Wydano ${selectedParts.length} poz. z magazynu` : undefined });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full" data-testid="button-add-work">
          <Plus className="w-3.5 h-3.5 mr-1.5" />Dodaj wykonaną pracę
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Wykonana praca</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">

          {/* Opis */}
          <div><Label className="text-xs">Opis pracy *</Label>
            <Textarea data-testid="input-work-desc" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Co zostało wykonane..." rows={2} />
          </div>

          {/* Czas */}
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Czas (godz.)</Label>
              <Input data-testid="input-hours" type="number" step="0.5"
                value={form.hoursSpent} onChange={e => setForm(f => ({ ...f, hoursSpent: e.target.value }))} />
            </div>
            <div><Label className="text-xs">Dodatkowy koszt (zł)</Label>
              <Input data-testid="input-work-cost" type="number" step="0.01"
                value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                placeholder={partsTotal > 0 ? `auto: ${partsTotal.toFixed(2)}` : "0.00"} />
            </div>
          </div>

          {/* Wybór z magazynu */}
          {stockParts.length > 0 && (
            <div>
              <Label className="text-xs mb-1.5 block">Dodaj z magazynu</Label>
              <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border border-border p-1">
                {stockParts.map((p: any) => (
                  <button key={p.id} onClick={() => addFromStock(p)}
                    disabled={!!selectedParts.find(s => s.partId === p.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left
                      ${selectedParts.find(s => s.partId === p.id)
                        ? "bg-primary/10 text-primary cursor-default"
                        : "hover:bg-muted cursor-pointer"}`}>
                    <div>
                      <span className="font-medium">{p.name}</span>
                      {p.catalogNumber && <span className="text-muted-foreground ml-1.5 font-mono">{p.catalogNumber}</span>}
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className={p.stockQty <= p.minQty ? "text-amber-600 font-semibold" : "text-muted-foreground"}>
                        {p.stockQty} {p.unit}
                      </span>
                      {p.sellPrice && <span className="ml-2 text-foreground">{p.sellPrice.toFixed(0)} zł</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Wybrane części */}
          {selectedParts.length > 0 && (
            <div>
              <Label className="text-xs mb-1.5 block">Wybrane części z magazynu</Label>
              <div className="space-y-1.5">
                {selectedParts.map(p => (
                  <div key={p.partId} className="flex items-center gap-2 bg-muted rounded-lg px-2.5 py-1.5">
                    <span className="text-xs font-medium flex-1 min-w-0 truncate">{p.name}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Input type="number" step="0.5" min="0.5" className="w-14 h-6 text-xs px-1.5"
                        value={p.qty} onChange={e => updateQty(p.partId, parseFloat(e.target.value) || 1)} />
                      <span className="text-xs text-muted-foreground">{p.unit}</span>
                      <Input type="number" step="0.01" className="w-16 h-6 text-xs px-1.5"
                        value={p.price} onChange={e => updatePrice(p.partId, parseFloat(e.target.value) || 0)} />
                      <span className="text-xs text-muted-foreground">zł</span>
                      <button onClick={() => removeSelected(p.partId)}
                        className="text-muted-foreground hover:text-destructive ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end text-xs font-semibold text-primary pr-1">
                  Części razem: {partsTotal.toFixed(2)} zł
                </div>
              </div>
            </div>
          )}

          {/* Ręczny wpis części */}
          <div><Label className="text-xs">Inne części (wpisz ręcznie)</Label>
            <Input data-testid="input-parts" value={manualPart}
              onChange={e => setManualPart(e.target.value)}
              placeholder="np. szpilka M8, uszczelka pokrywy" />
          </div>

          <Button className="w-full" onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.description} data-testid="button-save-work">
            {mut.isPending ? "Zapisywanie..." : "Zapisz pracę"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PhotoUpload({ orderId, onSuccess }: { orderId: number; onSuccess: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState("before");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("photo", file);
    fd.append("phase", phase);
    if (caption) fd.append("caption", caption);
    try {
      const token = getAuthToken();
      const headers: Record<string,string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${("__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__")}/api/orders/${orderId}/photos`, { method: "POST", body: fd, headers });
      if (!res.ok) throw new Error("Upload failed");
      onSuccess();
      setCaption("");
      toast({ title: "Zdjęcie dodane" });
    } catch (e: any) {
      toast({ title: "Błąd", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs">Faza</Label>
          <Select value={phase} onValueChange={setPhase}>
            <SelectTrigger className="h-8" data-testid="select-phase"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="before">Przed naprawą</SelectItem>
              <SelectItem value="during">W trakcie</SelectItem>
              <SelectItem value="after">Po naprawie</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label className="text-xs">Opis (opcjonalnie)</Label>
          <Input className="h-8 text-xs" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Opis zdjęcia" data-testid="input-caption" />
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); e.target.value = ""; }} />
      <Button size="sm" variant="outline" className="w-full" onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="button-upload-photo">
        <Camera className="w-3.5 h-3.5 mr-1.5" />{uploading ? "Przesyłanie..." : "Dodaj zdjęcie"}
      </Button>
    </div>
  );
}

function AddPaymentDialog({ orderId, suggested, onSuccess }: { orderId: number; suggested: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: String(Math.max(0, suggested).toFixed(2)), method: "cash", notes: "" });
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/orders/${orderId}/payments`, { amount: parseFloat(form.amount), method: form.method, notes: form.notes }),
    onSuccess: () => { setOpen(false); onSuccess(); toast({ title: "Płatność zarejestrowana" }); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" data-testid="button-add-payment">
          <CreditCard className="w-3.5 h-3.5 mr-1.5" />Zarejestruj płatność
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader><DialogTitle>Płatność</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div><Label className="text-xs">Kwota (zł)</Label><Input data-testid="input-payment-amount" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
          <div>
            <Label className="text-xs">Metoda płatności</Label>
            <Select value={form.method} onValueChange={v => setForm(f => ({ ...f, method: v }))}>
              <SelectTrigger data-testid="select-payment-method"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Gotówka</SelectItem>
                <SelectItem value="card">Karta</SelectItem>
                <SelectItem value="transfer">Przelew</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Uwagi</Label><Input data-testid="input-payment-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending || !form.amount} data-testid="button-confirm-payment">Zapisz płatność</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
