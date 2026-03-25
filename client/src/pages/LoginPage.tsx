import { useState } from "react";
import { Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Wrench, Settings, ChevronRight } from "lucide-react";

export default function LoginPage() {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "client" });

  const [pendingMsg, setPendingMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        const result = await register(form);
        if ((result as any)?.pendingApproval) {
          setPendingMsg("Konto założone. Właściciel warsztatu musi je zatwierdzić przed pierwszym logowaniem.");
          return;
        }
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("ACCOUNT_PENDING")) {
        setPendingMsg("Konto czeka na zatwierdzenie przez właściciela warsztatu.");
      } else if (msg.includes("ACCOUNT_BLOCKED")) {
        toast({ title: "Konto zablokowane", description: "Skontaktuj się z właścicielem warsztatu.", variant: "destructive" });
      } else {
        toast({ title: "Błąd", description: msg || "Nieprawidłowe dane", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {pendingMsg && (
        <div className="w-full max-w-sm mb-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl p-4 flex gap-3">
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">{pendingMsg}</p>
        </div>
      )}
      {/* Logo */}
      <div className="flex flex-col items-center mb-8 gap-3">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-md">
          <Wrench className="w-8 h-8 text-primary-foreground" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground tracking-tight">MotoSerwis</h1>
          <p className="text-muted-foreground text-sm">Portal zarządzania warsztatem</p>
        </div>
      </div>

      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex rounded-lg overflow-hidden border bg-muted p-1 gap-1">
            <button
              onClick={() => setMode("login")}
              data-testid="tab-login"
              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${mode === "login" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              Logowanie
            </button>
            <button
              onClick={() => setMode("register")}
              data-testid="tab-register"
              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${mode === "register" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              Rejestracja
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "register" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Imię i nazwisko</Label>
                  <Input id="name" data-testid="input-name" placeholder="Jan Kowalski" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" data-testid="input-phone" type="tel" placeholder="+48 500 000 000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Rola</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["client", "mechanic", "owner"] as const).map(r => (
                      <button key={r} type="button" data-testid={`role-${r}`}
                        onClick={() => setForm(f => ({ ...f, role: r }))}
                        className={`py-2 text-xs rounded-lg border font-medium transition-all ${form.role === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                      >
                        {r === "client" ? "Klient" : r === "mechanic" ? "Mechanik" : "Właściciel"}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" data-testid="input-email" type="email" placeholder="jan@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Hasło</Label>
              <Input id="password" data-testid="input-password" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
            </div>
            <Button data-testid="button-submit" type="submit" className="w-full mt-1" disabled={loading}>
              {loading ? "Ładowanie..." : mode === "login" ? "Zaloguj się" : "Zarejestruj się"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            Demo: owner@serwis.pl / mechanik@serwis.pl / klient@serwis.pl<br/>
            hasło: <span className="font-mono">demo1234</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
