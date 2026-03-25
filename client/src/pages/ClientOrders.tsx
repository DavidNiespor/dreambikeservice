import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Plus, Calendar, Car, LayoutDashboard, Check, X } from "lucide-react";
import type { RepairOrder, Vehicle } from "@shared/schema";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

const navItems = [
  { href: "/", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/pojazdy", label: "Moje pojazdy", icon: <Car className="w-4 h-4" /> },
  { href: "/zlecenia", label: "Moje zlecenia", icon: <ClipboardList className="w-4 h-4" /> },
];

export default function ClientOrders() {
  const { data: orders, isLoading } = useQuery<RepairOrder[]>({ queryKey: ["/api/orders"] });
  const { data: vehicles } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });
  const vehicleMap = Object.fromEntries((vehicles || []).map(v => [v.id, v]));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/orders"] });

  return (
    <AppLayout title="Moje zlecenia" navItems={navItems}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Moje zlecenia</h1>
          <NewOrderDialog vehicles={vehicles || []} onSuccess={invalidate} />
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : orders?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Brak zleceń. Zgłoś pierwszą usterkę.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {orders?.map(o => {
              const v = vehicleMap[o.vehicleId];
              return (
                <Link key={o.id} href={`/orders/${o.id}`}>
                  <Card className="hover:border-primary/40 transition-colors cursor-pointer" data-testid={`card-order-${o.id}`}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm flex-1 min-w-0 truncate">{o.title}</p>
                        <StatusBadge status={o.status} />
                      </div>
                      {v && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                          <Car className="w-3 h-3" />{v.brand} {v.model}
                          {v.licensePlate && ` · ${v.licensePlate}`}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(o.createdAt), "d MMMM yyyy", { locale: pl })}
                      </p>
                      {/* Akcja akceptacji wyceny */}
                      {o.status === "quoted" && (
                        <div className="flex gap-2 mt-2" onClick={e => e.preventDefault()}>
                          <QuoteActions orderId={o.id} onSuccess={invalidate} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function QuoteActions({ orderId, onSuccess }: { orderId: number; onSuccess: () => void }) {
  const { toast } = useToast();
  const accept = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/orders/${orderId}`, { status: "quote_accepted" }),
    onSuccess: () => { onSuccess(); toast({ title: "Wycena zaakceptowana" }); },
  });
  const reject = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/orders/${orderId}`, { status: "quote_rejected" }),
    onSuccess: () => { onSuccess(); toast({ title: "Wycena odrzucona" }); },
  });
  return (
    <>
      <Button size="sm" className="h-7 text-xs" onClick={() => accept.mutate()} disabled={accept.isPending}>
        <Check className="w-3 h-3 mr-1" />Akceptuj wycenę
      </Button>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => reject.mutate()} disabled={reject.isPending}>
        <X className="w-3 h-3 mr-1" />Odrzuć
      </Button>
    </>
  );
}

function NewOrderDialog({ vehicles, onSuccess }: { vehicles: Vehicle[]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ vehicleId: "", title: "", description: "", priority: "normal", mileage: "", clientNotes: "" });
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/orders", {
      vehicleId: parseInt(form.vehicleId),
      title: form.title,
      description: form.description,
      priority: form.priority,
      mileage: form.mileage ? parseInt(form.mileage) : undefined,
      clientNotes: form.clientNotes || undefined,
    }),
    onSuccess: () => { setOpen(false); setForm({ vehicleId: "", title: "", description: "", priority: "normal", mileage: "", clientNotes: "" }); onSuccess(); toast({ title: "Zgłoszenie wysłane" }); },
    onError: (e: any) => toast({ title: "Błąd", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-new-order">
          <Plus className="w-3.5 h-3.5 mr-1.5" />Nowe zgłoszenie
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader><DialogTitle>Zgłoś usterkę</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          {vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Najpierw dodaj pojazd w zakładce "Moje pojazdy".</p>
          ) : (
            <>
              <div>
                <Label className="text-xs">Pojazd *</Label>
                <Select value={form.vehicleId} onValueChange={v => setForm(f => ({ ...f, vehicleId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Wybierz pojazd" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.brand} {v.model}{v.licensePlate && ` (${v.licensePlate})`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Tytuł *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="np. Wymiana oleju, luz w kierownicy" /></div>
              <div><Label className="text-xs">Opis usterki *</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opisz dokładnie co się dzieje..." rows={3} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Priorytet</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Niski</SelectItem>
                      <SelectItem value="normal">Normalny</SelectItem>
                      <SelectItem value="high">Wysoki</SelectItem>
                      <SelectItem value="urgent">Pilne</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Przebieg (km)</Label><Input type="number" value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))} placeholder="12000" /></div>
              </div>
              <div><Label className="text-xs">Uwagi dodatkowe</Label><Input value={form.clientNotes} onChange={e => setForm(f => ({ ...f, clientNotes: e.target.value }))} placeholder="np. dostępność, preferowany termin" /></div>
              <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending || !form.vehicleId || !form.title || !form.description}>
                {mut.isPending ? "Wysyłanie..." : "Wyślij zgłoszenie"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
