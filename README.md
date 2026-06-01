# Warehouse Management System — Kubernetes + OAuth2

**Autor:** Weronika Skakovska

Projekt łączący:
- **Bezpieczeństwo aplikacji webowych** — OAuth 2.0 + PKCE z Keycloak
- **Kubernetes — aplikacja wieloserwisowa z CI/CD** — klaster K8s + GitHub Actions

---

## Architektura

```
┌─────────────────────────────────────────────────┐
│                  Klaster Kubernetes              │
│  namespace: warehouse                            │
│                                                  │
│  ┌──────────┐   ┌──────────┐   ┌─────────────┐  │
│  │ Frontend │   │ Backend  │   │  Keycloak   │  │
│  │ (nginx)  │   │(Node.js) │   │(auth server)│  │
│  │ Deployment   │ 2 repliki│   │ StatefulSet │  │
│  └────┬─────┘   └────┬─────┘   └──────┬──────┘  │
│       │              │                │          │
│  ┌────▼──────────────▼──────────┐     │          │
│  │         Ingress (nginx)      │     │          │
│  └──────────────────────────────┘     │          │
│              │                 ┌──────▼──────┐   │
│    ┌─────────▼──────┐          │   MongoDB   │   │
│    │     Redis      │          │ StatefulSet │   │
│    │  (dodatkowy    │          │   + PVC     │   │
│    │   komponent)   │          └─────────────┘   │
│    └────────────────┘                            │
└─────────────────────────────────────────────────┘
```

**Serwisy:**
- `backend` — Node.js/Express API, 2 repliki, rolling update
- `mongo` — MongoDB StatefulSet z PersistentVolumeClaim
- `keycloak` — Authorization Server (OAuth2/PKCE), StatefulSet z PVC
- `redis` — cache/broker (dodatkowy komponent)
- `frontend` — statyczny HTML serwowany przez nginx

**Zabezpieczenia OAuth2:**
- `/health`, `/metrics` — niezabezpieczone
- `GET /api/products`, `/api/orders`, `/api/suppliers` — wymagają tokenu (rola: user)
- `POST/PUT/DELETE /api/products`, `/api/suppliers` — wymagają roli admin/moderator
- `GET /api/users` — tylko admin

---

## Szybki start

Pełna instrukcja z komendami kubectl i przykładowymi odpowiedziami: **[CHECKLIST.md](./CHECKLIST.md)**

```bash
# 1. Utwórz klaster
kind create cluster --name warehouse

# 2. Zainstaluj Ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# 3. Deploy
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/keycloak/
kubectl apply -f k8s/mongo/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/networkpolicy.yaml

# 4. Health check
curl http://warehouse.local/health
```

Dodaj do `/etc/hosts`: `127.0.0.1 warehouse.local auth.warehouse.local`

---

## CI/CD

GitHub Actions (`.github/workflows/deploy.yaml`):
1. **Build & Test** — `npm ci`, lint, testy
2. **Docker Build & Push** — obraz do GHCR z tagiem SHA
3. **Deploy** — `kubectl apply` + `kubectl rollout status`

**Wymagane sekrety GitHub:** `KUBECONFIG` (base64 kubeconfig klastra)

---

## Struktura repozytorium

```
tech_bezp/
├── warehouse/              # Aplikacja Node.js (backend + frontend)
│   ├── server.js
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── public/             # Frontend (HTML/JS)
│   └── Dockerfile
├── k8s/
│   ├── namespace.yaml
│   ├── ingress.yaml
│   ├── networkpolicy.yaml
│   ├── backend/
│   │   ├── configmap.yaml
│   │   ├── secret.yaml
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── redis.yaml
│   ├── mongo/
│   │   └── statefulset.yaml
│   └── keycloak/
│       ├── statefulset.yaml
│       └── realm-configmap.yaml
├── .github/workflows/
│   └── deploy.yaml
├── CHECKLIST.md            # Instrukcja uruchomienia + komendy kubectl
└── README.md               # Ten plik
```
