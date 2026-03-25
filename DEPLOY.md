# MotoSerwis — Deployment na Portainer + Cloudflare Tunnel

## Architektura

```
Internet → Cloudflare Tunnel → kontener "tunnel" → kontener "app":5000
```

Aplikacja NIE wystawia portu na zewnątrz. Cały ruch idzie przez szyfrowany tunel Cloudflare.

---

## Krok 1 — Cloudflare Zero Trust — skonfiguruj tunel

1. Wejdź na **one.dash.cloudflare.com** → Zero Trust → Networks → Tunnels
2. Utwórz nowy tunel (lub użyj istniejącego) → **Cloudflared**
3. Skopiuj **token** tunelu (długi ciąg znaków po `--token`)
4. W zakładce **Public Hostname** dodaj:
   - Subdomain: `serwis` (lub inna)
   - Domain: `twoja-domena.pl`
   - Type: `HTTP`
   - URL: `app:5000`  ← WAŻNE: nazwa serwisu Docker, nie localhost

---

## Krok 2 — Wrzuć repo na GitHub

```bash
git remote add origin https://github.com/TWOJ_USER/motoserwis.git
git push -u origin master
```

---

## Krok 3 — Portainer — Deploy przez Stack

1. Portainer → **Stacks** → **Add stack**
2. Wybierz: **Repository**
3. Podaj URL repo: `https://github.com/TWOJ_USER/motoserwis`
4. Compose path: `docker-compose.yml`
5. Włącz: **Automatic updates** (opcjonalnie — auto-pull przy push)

### Zmienne środowiskowe w Portainer

W sekcji **Environment variables** dodaj:

| Nazwa | Wartość |
|---|---|
| `JWT_SECRET` | *(wygeneruj: `openssl rand -hex 32`)* |
| `CLOUDFLARE_TUNNEL_TOKEN` | *(token z Zero Trust)* |

6. Kliknij **Deploy the stack**

Portainer:
- Sklonuje repo
- Zbuduje obraz (`Dockerfile`)
- Uruchomi 2 kontenery: `motoserwis_app` i `motoserwis_tunnel`
- Stworzy volumeny dla bazy i zdjęć

---

## Krok 4 — Pierwsze uruchomienie

Po deploymencie wejdź na `https://serwis.twoja-domena.pl` i zarejestruj:
1. Konto **Właściciela** (rola: Właściciel)
2. Właściciel dodaje mechaników i klientów z panelu

---

## Aktualizacja po zmianach

```bash
git add -A && git commit -m "opis zmian" && git push
```

Portainer automatycznie wykryje push i zrobi redeploy (jeśli włączone), lub ręcznie:
**Stacks** → `motoserwis` → **Pull and redeploy**

---

## Backup bazy danych

```bash
# Skopiuj bazę z volumenu na dysk hosta
docker run --rm \
  -v motoserwis_motoserwis_data:/data \
  -v $(pwd):/backup \
  alpine cp /data/motowarsztat.db /backup/backup-$(date +%Y%m%d-%H%M).db
```

---

## Logi

```bash
docker logs motoserwis_app -f     # logi aplikacji
docker logs motoserwis_tunnel -f  # logi tunelu Cloudflare
```

---

## Zmienne środowiskowe — wszystkie

| Zmienna | Opis | Wymagane |
|---|---|---|
| `JWT_SECRET` | Klucz do podpisywania tokenów (min. 32 znaki) | ✅ Tak |
| `CLOUDFLARE_TUNNEL_TOKEN` | Token tunelu z Zero Trust | ✅ Tak |
| `PORT` | Port HTTP serwera (domyślnie 5000) | Nie |
| `DATABASE_PATH` | Ścieżka SQLite (domyślnie `/app/data/motowarsztat.db`) | Nie |
| `UPLOADS_PATH` | Katalog zdjęć (domyślnie `/app/uploads`) | Nie |

---

## Wymagania systemowe (Raspberry Pi 4)

| Zasób | Zużycie |
|---|---|
| RAM | ~120 MB (app 80MB + cloudflared 40MB) |
| CPU | Minimalny (idle) |
| Architektura | ARM64 ✓ / x86_64 ✓ |
| Docker | 20+ |
