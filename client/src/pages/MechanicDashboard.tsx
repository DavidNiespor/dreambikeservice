import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, ClipboardList, Search, ChevronRight, Calendar, Filter, Plus, User, Car } from "lucide-react";
import type { RepairOrder, Vehicle, User as UserType } from "@shared/schema";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

const navItems = [
  { href: "/", label: "Zlecenia", icon: <LayoutDashboard className="w-4 h-4" /> },
];

export default function MechanicDashboard() {
  return (
    <AppLayout title="Panel Mechanika" navItems={navItems}>
      <MechanicContent />
    </AppLayout>
  );
}

function MechanicContent() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: orders, isLoading } = useQuery<RepairOrder[]>({ queryKey: ["/api/orders"] });
  const { data: vehicles } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });

  const vehicleMap = Object.fromEntries((vehicles || []).map(v => [v.id, v]));

  const filtered = (orders || []).filter(o => {
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const v = vehicleMap[o.vehicleId];
    const matchSearch = !search
      || o.title.toLowerCase().includes(search.toLowerCase())
      || (v && `${v.brand} ${v.model}`.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const counts = {
    pending:     (orders || []).filter(o => o.status === "pending").length,
    in_progress: (orders || []).filter(o => o.status === "in_progress").length,
    quoted:      (orders || []).filter(o => o.status === "quoted").length,
  };

  const invalidateOrders = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Panel mechanika</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Witaj, {user?.name?.split(" ")[0]}</p>
        </div>
        <NewOrderMechanicDialog onSuccess={invalidateOrders} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Nowe",   value: counts.pending,     color: "text-muted-foreground" },
          { label: "W toku", value: counts.in_progress, color: "text-amber-500" },
          { label: "Wyceny", value: counts.quoted,       color: "text-blue-500" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-3 pb-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Szukaj..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <Filter className="w-3.5 h-3.5 mr-1" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="pending">Nowe</SelectItem>
            <SelectItem value="quoted">Wyceny</SelectItem>
            <SelectItem value="quote_accepted">Zaakceptowane</SelectItem>
            <SelectItem value="in_progress">W naprawie</SelectItem>
            <SelectItem value="completed">Zakończone</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-8 text-center text-muted-foreground text-sm">
            Brak zleceń spełniających kryteria
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(o => {
            const v = vehicleMap[o.vehicleId];
            return (
              <Link key={o.id} href={`/orders/${o.id}`}>
                <Card className="hover:border-primary/40 transition-colors cursor-pointer" data-testid={`card-order-${o.id}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm flex-1 min-w-0 truncate">{o.title}</p>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <PriorityBadge priority={o.priority} />
                        <StatusBadge status={o.status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {v && <span className="font-medium text-foreground/70">{v.brand} {v.model}{v.licensePlate && ` · ${v.licensePlate}`}</span>}
                      <span className="ml-auto flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(o.createdAt), "d MMM", { locale: pl })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Nowe zlecenie przez mechanika ───────────────────────────────────────────
function NewOrderMechanicDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const { toast } = useToast();

  // Dane istniejącego klienta
  const { data: clients = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "client"),
  });
  const { data: vehicles = [] } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });

  const [selectedClient, setSelectedClient] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");

  // Dane nowego klienta
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
  const [newVehicle, setNewVehicle] = useState({ brand: "", model: "", year: "", licensePlate: "", engineSize: "" });

  // Dane zlecenia
  const [order, setOrder] = useState({ title: "", description: "", priority: "normal", mileage: "" });

  const clientVehicles = vehicles.filter(v => v.clientId === Number(selectedClient));

  const mut = useMutation({
    mutationFn: async () => {
      let clientId: number;
      let vehicleId: number;

      if (tab === "existing") {
        // Istniejący klient i pojazd
        clientId = Number(selectedClient);
        vehicleId = Number(selectedVehicle);
      } else {
        // Zarejestruj nowego klienta (tymczasowe hasło)
        const tempPassword = Math.random().toString(36).slice(-8);
        const clientRes = await apiRequest("POST", "/api/auth/register", {
          name: newClient.name,
          phone: newClient.phone || undefined,
          email: newClient.email || `klient_${Date.now()}@brak.pl`,
          password: tempPassword,
          role: "client",
        });
        const clientData = await clientRes.json();
        clientId = clientData.id;

        // Dodaj pojazd
        const vehicleRes = await apiRequest("POST", "/api/vehicles", {
          clientId,
          brand: newVehicle.brand,
          model: newVehicle.model,
          year: newVehicle.year ? parseInt(newVehicle.year) : undefined,
          licensePlate: newVehicle.licensePlate || undefined,
          engineSize: newVehicle.engineSize || undefined,
        });
        const vehicleData = await vehicleRes.json();
        vehicleId = vehicleData.id;
      }

      // Utwórz zlecenie
      return apiRequest("POST", "/api/orders", {
        clientId,
        vehicleId,
        title: order.title,
        description: order.description,
        priority: order.priority,
        mileage: order.mileage ? parseInt(order.mileage) : undefined,
      });
    },
    onSuccess: () => {
      setOpen(false);
      // reset
      setSelectedClient(""); setSelectedVehicle("");
      setNewClient({ name: "", phone: "", email: "" });
      setNewVehicle({ brand: "", model: "", year: "", licensePlate: "", engineSize: "" });
      setOrder({ title: "", description: "", priority: "normal", mileage: "" });
      onSuccess();
      toast({ title: "Zlecenie utworzone" });
    },
    onError: (e: any) => toast({ title: "Błąd", description: e.message, variant: "destructive" }),
  });

  const canSubmit = order.title && order.description && (
    tab === "existing" ? (selectedClient && selectedVehicle) : (newClient.name && newVehicle.brand && newVehicle.model)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-new-order-mechanic">
          <Plus className="w-3.5 h-3.5 mr-1.5" />Nowe zlecenie
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nowe zlecenie</DialogTitle></DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Klient */}
          <div>
            <Label className="text-xs mb-2 block">Klient</Label>
            <div className="flex rounded-lg overflow-hidden border bg-muted p-1 gap-1 mb-3">
              <button onClick={() => setTab("existing")}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1 ${tab === "existing" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
                <User className="w-3 h-3" />Istniejący klient
              </button>
              <button onClick={() => setTab("new")}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1 ${tab === "new" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
                <Plus className="w-3 h-3" />Nowy klient
              </button>
            </div>

            {tab === "existing" ? (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Wybierz klienta *</Label>
                  <Select value={selectedClient} onValueChange={v => { setSelectedClient(v); setSelectedVehicle(""); }}>
                    <SelectTrigger><SelectValue placeholder="Wybierz klienta..." /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}{c.phone && ` · ${c.phone}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedClient && (
                  <div>
                    <Label className="text-xs">Pojazd *</Label>
                    <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                      <SelectTrigger><SelectValue placeholder="Wybierz pojazd..." /></SelectTrigger>
                      <SelectContent>
                        {clientVehicles.length === 0
                          ? <SelectItem value="_none" disabled>Brak pojazdów</SelectItem>
                          : clientVehicles.map(v => (
                            <SelectItem key={v.id} value={String(v.id)}>
                              {v.brand} {v.model}{v.licensePlate && ` (${v.licensePlate})`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {clientVehicles.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Klient nie ma pojazdu — użyj "Nowy klient" i dodaj pojazd.</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-muted rounded-lg p-2.5 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" />Dane klienta</p>
                  <div><Label className="text-xs">Imię i nazwisko *</Label><Input value={newClient.name} onChange={e => setNewClient(f => ({ ...f, name: e.target.value }))} placeholder="Jan Kowalski" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Telefon</Label><Input value={newClient.phone} onChange={e => setNewClient(f => ({ ...f, phone: e.target.value }))} placeholder="+48 500..." /></div>
                    <div><Label className="text-xs">Email</Label><Input value={newClient.email} onChange={e => setNewClient(f => ({ ...f, email: e.target.value }))} placeholder="opcjonalny" /></div>
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-2.5 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Car className="w-3 h-3" />Pojazd</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Marka *</Label><Input value={newVehicle.brand} onChange={e => setNewVehicle(f => ({ ...f, brand: e.target.value }))} placeholder="Honda" /></div>
                    <div><Label className="text-xs">Model *</Label><Input value={newVehicle.model} onChange={e => setNewVehicle(f => ({ ...f, model: e.target.value }))} placeholder="CBR600" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Tablica</Label><Input value={newVehicle.licensePlate} onChange={e => setNewVehicle(f => ({ ...f, licensePlate: e.target.value }))} placeholder="KR 12345" /></div>
                    <div><Label className="text-xs">Rok</Label><Input type="number" value={newVehicle.year} onChange={e => setNewVehicle(f => ({ ...f, year: e.target.value }))} placeholder="2020" /></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dane zlecenia */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Zlecenie</p>
            <div><Label className="text-xs">Tytuł *</Label><Input value={order.title} onChange={e => setOrder(f => ({ ...f, title: e.target.value }))} placeholder="np. Wymiana oleju, luz w kierownicy" /></div>
            <div><Label className="text-xs">Opis / usterka *</Label><Textarea value={order.description} onChange={e => setOrder(f => ({ ...f, description: e.target.value }))} placeholder="Co wymaga naprawy..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Priorytet</Label>
                <Select value={order.priority} onValueChange={v => setOrder(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niski</SelectItem>
                    <SelectItem value="normal">Normalny</SelectItem>
                    <SelectItem value="high">Wysoki</SelectItem>
                    <SelectItem value="urgent">Pilne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Przebieg (km)</Label><Input type="number" value={order.mileage} onChange={e => setOrder(f => ({ ...f, mileage: e.target.value }))} /></div>
            </div>
          </div>

          <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending || !canSubmit}>
            {mut.isPending ? "Tworzenie..." : "Utwórz zlecenie"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
