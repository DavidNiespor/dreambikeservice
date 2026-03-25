import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, Car, ClipboardList, Plus, ChevronRight, Calendar, Gauge } from "lucide-react";
import type { Vehicle, RepairOrder } from "@shared/schema";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

export const clientNavItems = [
  { href: "/", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/pojazdy", label: "Moje pojazdy", icon: <Car className="w-4 h-4" /> },
  { href: "/zlecenia", label: "Moje zlecenia", icon: <ClipboardList className="w-4 h-4" /> },
];
const navItems = clientNavItems;

export default function ClientDashboard() {
  return (
    <AppLayout title="Panel Klienta" navItems={navItems}>
      <ClientContent />
    </AppLayout>
  );
}

function ClientContent() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: vehicles, isLoading: vLoading } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });
  const { data: orders, isLoading: oLoading } = useQuery<RepairOrder[]>({ queryKey: ["/api/orders"] });

  const pendingOrders = orders?.filter(o => ["pending", "quoted", "quote_accepted", "in_progress"].includes(o.status)) || [];
  const recentOrders = orders?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Witaj, {user?.name?.split(" ")[0]}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Zarządzaj swoimi zleceniami napraw</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-muted-foreground text-xs">Aktywne zlecenia</p>
            <p className="text-2xl font-bold text-primary mt-1" data-testid="stat-active">{oLoading ? "–" : pendingOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-muted-foreground text-xs">Pojazdy</p>
            <p className="text-2xl font-bold text-foreground mt-1" data-testid="stat-vehicles">{vLoading ? "–" : vehicles?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <AddVehicleDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] })} vehicles={vehicles || []} />
        <NewOrderDialog vehicles={vehicles || []} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/orders"] })} />
      </div>

      {/* My Vehicles */}
      <section>
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Moje pojazdy</h2>
        {vLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : vehicles?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">
              Brak pojazdów. Dodaj swój motocykl.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {vehicles?.map(v => (
              <Link key={v.id} href={`/vehicles/${v.id}/history`}>
                <Card className="hover:border-primary/40 transition-colors cursor-pointer" data-testid={`card-vehicle-${v.id}`}>
                  <CardContent className="py-3 px-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Car className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{v.brand} {v.model}</p>
                      <p className="text-xs text-muted-foreground">{v.year && `${v.year} · `}{v.licensePlate || v.vin || "Brak tablicy"}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Orders */}
      <section>
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Ostatnie zlecenia</h2>
        {oLoading ? <Skeleton className="h-32 w-full rounded-xl" /> : recentOrders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">
              Brak zleceń. Zgłoś pierwszą usterkę.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentOrders.map(o => (
              <Link key={o.id} href={`/orders/${o.id}`}>
                <Card className="hover:border-primary/40 transition-colors cursor-pointer" data-testid={`card-order-${o.id}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm flex-1 min-w-0 truncate">{o.title}</p>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(o.createdAt), "d MMM yyyy", { locale: pl })}
                    </p>
                    {/* Quote accept/reject */}
                    {o.status === "quoted" && <QuoteActions orderId={o.id} />}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function QuoteActions({ orderId }: { orderId: number }) {
  const { toast } = useToast();
  const accept = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/orders/${orderId}`, { status: "quote_accepted" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); toast({ title: "Wycena zaakceptowana" }); },
  });
  const reject = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/orders/${orderId}`, { status: "quote_rejected" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); toast({ title: "Wycena odrzucona" }); },
  });
  return (
    <div className="flex gap-2 mt-2" onClick={e => e.preventDefault()}>
      <Button size="sm" className="h-7 text-xs" onClick={() => accept.mutate()} disabled={accept.isPending} data-testid="button-accept-quote">
        Akceptuj wycenę
      </Button>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => reject.mutate()} disabled={reject.isPending} data-testid="button-reject-quote">
        Odrzuć
      </Button>
    </div>
  );
}

function AddVehicleDialog({ onSuccess, vehicles }: { onSuccess: () => void; vehicles: Vehicle[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ brand: "", model: "", year: "", licensePlate: "", vin: "", engineSize: "" });
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/vehicles", { ...form, year: form.year ? parseInt(form.year) : undefined }),
    onSuccess: () => { setOpen(false); setForm({ brand: "", model: "", year: "", licensePlate: "", vin: "", engineSize: "" }); onSuccess(); toast({ title: "Pojazd dodany" }); },
    onError: (e: any) => toast({ title: "Błąd", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full flex-col h-auto py-4 gap-2" data-testid="button-add-vehicle">
          <Car className="w-5 h-5 text-primary" />
          <span className="text-xs">Dodaj pojazd</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader><DialogTitle>Nowy pojazd</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Marka *</Label><Input data-testid="input-brand" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Honda" /></div>
            <div><Label className="text-xs">Model *</Label><Input data-testid="input-model" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="CBR600" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Rok</Label><Input data-testid="input-year" type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2020" /></div>
            <div><Label className="text-xs">Poj. silnika</Label><Input data-testid="input-engine" value={form.engineSize} onChange={e => setForm(f => ({ ...f, engineSize: e.target.value }))} placeholder="600cc" /></div>
          </div>
          <div><Label className="text-xs">Tablica rejestracyjna</Label><Input data-testid="input-plate" value={form.licensePlate} onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value }))} placeholder="KR 12345" /></div>
          <div><Label className="text-xs">VIN</Label><Input data-testid="input-vin" value={form.vin} onChange={e => setForm(f => ({ ...f, vin: e.target.value }))} placeholder="JH2PC..." /></div>
          <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending || !form.brand || !form.model} data-testid="button-save-vehicle">
            {mut.isPending ? "Zapisywanie..." : "Dodaj pojazd"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewOrderDialog({ vehicles, onSuccess }: { vehicles: Vehicle[]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ vehicleId: "", title: "", description: "", priority: "normal", mileage: "" });
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/orders", {
      vehicleId: parseInt(form.vehicleId),
      title: form.title,
      description: form.description,
      priority: form.priority,
      mileage: form.mileage ? parseInt(form.mileage) : undefined,
    }),
    onSuccess: () => { setOpen(false); setForm({ vehicleId: "", title: "", description: "", priority: "normal", mileage: "" }); onSuccess(); toast({ title: "Zgłoszenie wysłane" }); },
    onError: (e: any) => toast({ title: "Błąd", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full flex-col h-auto py-4 gap-2" data-testid="button-new-order">
          <Plus className="w-5 h-5" />
          <span className="text-xs">Nowe zgłoszenie</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader><DialogTitle>Zgłoś usterkę</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs">Pojazd *</Label>
            <Select value={form.vehicleId} onValueChange={v => setForm(f => ({ ...f, vehicleId: v }))}>
              <SelectTrigger data-testid="select-vehicle"><SelectValue placeholder="Wybierz pojazd" /></SelectTrigger>
              <SelectContent>
                {vehicles.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.brand} {v.model} {v.licensePlate && `(${v.licensePlate})`}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Tytuł zgłoszenia *</Label><Input data-testid="input-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="np. Wymiana oleju, luz w kierownicy" /></div>
          <div><Label className="text-xs">Opis usterki *</Label><Textarea data-testid="input-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opisz dokładnie co się dzieje..." rows={3} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Priorytet</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niski</SelectItem>
                  <SelectItem value="normal">Normalny</SelectItem>
                  <SelectItem value="high">Wysoki</SelectItem>
                  <SelectItem value="urgent">Pilne</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Przebieg (km)</Label><Input data-testid="input-mileage" type="number" value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))} placeholder="12000" /></div>
          </div>
          <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending || !form.vehicleId || !form.title || !form.description} data-testid="button-send-order">
            {mut.isPending ? "Wysyłanie..." : "Wyślij zgłoszenie"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
