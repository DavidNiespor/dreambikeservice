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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, ClipboardList, Search, ChevronRight, Calendar, Filter } from "lucide-react";
import type { RepairOrder, Vehicle, User } from "@shared/schema";
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
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/users"], retry: false, enabled: false });

  const vehicleMap = Object.fromEntries((vehicles || []).map(v => [v.id, v]));
  const userMap = Object.fromEntries((users || []).map(u => [u.id, u]));

  const filtered = (orders || []).filter(o => {
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const v = vehicleMap[o.vehicleId];
    const matchSearch = !search || o.title.toLowerCase().includes(search.toLowerCase()) ||
      (v && `${v.brand} ${v.model}`.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const counts = {
    pending: (orders || []).filter(o => o.status === "pending").length,
    in_progress: (orders || []).filter(o => o.status === "in_progress").length,
    quoted: (orders || []).filter(o => o.status === "quoted").length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Panel mechanika</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Witaj, {user?.name?.split(" ")[0]}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Nowe", value: counts.pending, color: "text-muted-foreground" },
          { label: "W toku", value: counts.in_progress, color: "text-amber-500" },
          { label: "Wyceny", value: counts.quoted, color: "text-blue-500" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-3 pb-3 text-center">
              <p className={`text-xl font-bold ${s.color}`} data-testid={`stat-${s.label}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input data-testid="input-search" className="pl-9" placeholder="Szukaj..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36" data-testid="select-filter">
            <Filter className="w-3.5 h-3.5 mr-1" />
            <SelectValue />
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
            const c = userMap[o.clientId];
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
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {v && <span className="font-medium text-foreground/70">{v.brand} {v.model}</span>}
                      {c && <span>{c.name}</span>}
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
