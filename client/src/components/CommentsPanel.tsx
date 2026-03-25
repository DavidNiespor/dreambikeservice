import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, apiFetch } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Lock, Globe, Trash2, Send, MessageSquare } from "lucide-react";
import type { Comment, User } from "@shared/schema";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface Props {
  orderId: number;
}

export default function CommentsPanel({ orderId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  const isMechOwner = user?.role === "mechanic" || user?.role === "owner";

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ["/api/orders", String(orderId), "comments"],
    queryFn: async () => { const r = await apiFetch(`/api/orders/${orderId}/comments`); return r.json(); },
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isMechOwner,
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  const addComment = useMutation({
    mutationFn: () => apiRequest("POST", `/api/orders/${orderId}/comments`, { content, visibility }),
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/orders", String(orderId), "comments"] });
    },
    onError: (e: any) => toast({ title: "Błąd", description: e.message, variant: "destructive" }),
  });

  const delComment = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/comments/${id}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/orders", String(orderId), "comments"] }),
  });

  const getAuthorName = (authorId: number) => {
    if (authorId === user?.id) return "Ty";
    const u = userMap[authorId];
    if (u) return u.name;
    return `#${authorId}`;
  };

  return (
    <div className="space-y-3">
      {/* Lista komentarzy */}
      {isLoading ? (
        <div className="text-center text-muted-foreground text-sm py-4">Ładowanie...</div>
      ) : comments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Brak komentarzy</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {comments.map(c => {
            const isOwn = c.authorId === user?.id;
            const isPrivate = c.visibility === "private";
            return (
              <div key={c.id} className={`rounded-xl p-3 ${isPrivate ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" : "bg-muted"}`}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{getAuthorName(c.authorId)}</span>
                    {isMechOwner && (
                      <Badge variant="outline" className={`text-xs h-4 px-1 ${isPrivate ? "border-amber-400 text-amber-700 dark:text-amber-400" : "border-border text-muted-foreground"}`}>
                        {isPrivate ? <><Lock className="w-2.5 h-2.5 mr-0.5" />Prywatny</> : <><Globe className="w-2.5 h-2.5 mr-0.5" />Publiczny</>}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{format(new Date(c.createdAt), "d MMM HH:mm", { locale: pl })}</span>
                    {(isOwn || user?.role === "owner") && (
                      <button onClick={() => delComment.mutate(c.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.content}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Formularz */}
      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={user?.role === "client" ? "Napisz komentarz do zlecenia..." : "Dodaj komentarz..."}
          rows={2}
          className="resize-none"
        />
        <div className="flex items-center gap-2">
          {/* Przełącznik widoczności — tylko mechanik i owner */}
          {isMechOwner && (
            <div className="flex rounded-lg overflow-hidden border bg-muted p-0.5 gap-0.5">
              <button onClick={() => setVisibility("public")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${visibility === "public" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
                <Globe className="w-3 h-3" />Publiczny
              </button>
              <button onClick={() => setVisibility("private")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${visibility === "private" ? "bg-background shadow-sm text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                <Lock className="w-3 h-3" />Prywatny
              </button>
            </div>
          )}
          <Button size="sm" className="ml-auto" onClick={() => addComment.mutate()} disabled={addComment.isPending || !content.trim()}>
            <Send className="w-3.5 h-3.5 mr-1.5" />Wyślij
          </Button>
        </div>
        {isMechOwner && (
          <p className="text-xs text-muted-foreground">
            {visibility === "private" ? "🔒 Komentarz prywatny — widoczny tylko dla mechanika i właściciela" : "🌐 Komentarz publiczny — widoczny dla klienta"}
          </p>
        )}
      </div>
    </div>
  );
}
