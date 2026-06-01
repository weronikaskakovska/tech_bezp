# CHECKLIST.md — Warehouse K8s + OAuth2

## Autor
Weronika Skakovska

---

## Wymagania wstępne

- `kind` / `minikube` / `k3d` zainstalowany
- `kubectl` zainstalowany
- `docker` zainstalowany
- `git` zainstalowany

---

## 1. Uruchomienie klastra lokalnie

### Opcja A — kind (zalecane)

```bash
kind create cluster --name warehouse
kubectl cluster-info --context kind-warehouse
```

### Opcja B — k3d

```bash
k3d cluster create warehouse --port "80:80@loadbalancer"
```

### Opcja C — minikube

```bash
minikube start --driver=docker
minikube addons enable ingress
```

---

## 2. Instalacja Ingress Controller (kind / minikube bez addona)

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

---

## 3. Konfiguracja /etc/hosts

```bash
# Linux/Mac:
echo "127.0.0.1 warehouse.local auth.warehouse.local" | sudo tee -a /etc/hosts

# Windows (jako Administrator):
# Dodaj do C:\Windows\System32\drivers\etc\hosts:
# 127.0.0.1 warehouse.local auth.warehouse.local
```

---

## 4. Deploy aplikacji

```bash
# Sklonuj repo
git clone https://github.com/weronikaskakovska/tech_bezp.git
cd tech_bezp

# Zastosuj wszystkie manifesty
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/keycloak/realm-configmap.yaml
kubectl apply -f k8s/keycloak/statefulset.yaml
kubectl apply -f k8s/mongo/statefulset.yaml
kubectl apply -f k8s/backend/configmap.yaml
kubectl apply -f k8s/backend/secret.yaml
kubectl apply -f k8s/backend/redis.yaml
kubectl apply -f k8s/backend/deployment.yaml
kubectl apply -f k8s/backend/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/networkpolicy.yaml

# Poczekaj na gotowość
kubectl rollout status deployment/backend -n warehouse --timeout=180s
kubectl rollout status statefulset/mongo -n warehouse --timeout=120s
kubectl rollout status statefulset/keycloak -n warehouse --timeout=180s
```

---

## 5. Weryfikacja zasobów Kubernetes

### Lista zasobów

| Zasób | Nazwa | Przestrzeń nazw |
|---|---|---|
| Namespace | warehouse | — |
| Deployment | backend | warehouse |
| StatefulSet | mongo | warehouse |
| StatefulSet | keycloak | warehouse |
| Deployment | redis | warehouse |
| Service | backend-service | warehouse |
| Service | mongo-service (headless) | warehouse |
| Service | keycloak-service | warehouse |
| Service | redis-service | warehouse |
| Ingress | warehouse-ingress | warehouse |
| ConfigMap | backend-config | warehouse |
| ConfigMap | keycloak-realm-config | warehouse |
| Secret | backend-secrets | warehouse |
| Secret | mongo-secrets | warehouse |
| Secret | keycloak-secrets | warehouse |
| PVC (via StatefulSet) | mongo-data-mongo-0 | warehouse |
| PVC (via StatefulSet) | keycloak-data-keycloak-0 | warehouse |
| PodDisruptionBudget | backend-pdb | warehouse |
| NetworkPolicy | mongo-allow-backend-only | warehouse |
| NetworkPolicy | redis-allow-backend-only | warehouse |
| NetworkPolicy | backend-allow-ingress | warehouse |

### Komendy kubectl

```bash
# Wszystkie zasoby w namespace
kubectl get all -n warehouse

# Pody
kubectl get pods -n warehouse

# Przykładowe wyjście:
# NAME                       READY   STATUS    RESTARTS   AGE
# backend-6d8f7c9b4-abc12    1/1     Running   0          5m
# backend-6d8f7c9b4-def34    1/1     Running   0          5m
# keycloak-0                 1/1     Running   0          8m
# mongo-0                    1/1     Running   0          8m
# redis-7c9d5f8b6-xyz99      1/1     Running   0          5m

# Szczegóły poda (sondy, limity)
kubectl describe pod -l app=backend -n warehouse

# PersistentVolumeClaims
kubectl get pvc -n warehouse

# Sprawdzenie NetworkPolicy
kubectl get networkpolicy -n warehouse

# Rollout status
kubectl rollout status deployment/backend -n warehouse

# Logi backendu
kubectl logs -l app=backend -n warehouse --tail=50
```

---

## 6. Testowanie endpointów

### Health check (niezabezpieczony)

```bash
curl http://warehouse.local/health
# Oczekiwany wynik:
# {"status":"ok","timestamp":"2026-05-30T12:00:00.000Z","service":"warehouse-backend"}
```

### Pobierz token OAuth2 (Keycloak)

```bash
TOKEN=$(curl -s -X POST \
  http://auth.warehouse.local/realms/warehouse/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=warehouse-frontend&username=admin&password=Admin123!&scope=openid" \
  | jq -r '.access_token')

echo "Token: ${TOKEN:0:50}..."
```

### Endpointy chronione (wymagają tokenu)

```bash
# Produkty — GET (wymaga roli user/moderator/admin)
curl -H "Authorization: Bearer $TOKEN" http://warehouse.local/api/products
# Przykładowy wynik:
# [{"_id":"...","name":"Produkt A","quantity":100,"category":"elektronika"}]

# Produkty — POST (wymaga roli admin/moderator)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Testowy Produkt","quantity":50,"price":29.99,"category":"test"}' \
  http://warehouse.local/api/products
# {"_id":"...","name":"Testowy Produkt","quantity":50}

# Zamówienia — GET
curl -H "Authorization: Bearer $TOKEN" http://warehouse.local/api/orders

# Dostawcy — GET
curl -H "Authorization: Bearer $TOKEN" http://warehouse.local/api/suppliers

# Użytkownicy — GET (tylko admin)
ADMIN_TOKEN=$(curl -s -X POST \
  http://auth.warehouse.local/realms/warehouse/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=warehouse-frontend&username=admin&password=Admin123!&scope=openid" \
  | jq -r '.access_token')

curl -H "Authorization: Bearer $ADMIN_TOKEN" http://warehouse.local/api/users
```

---

## 7. Test trwałości danych MongoDB

```bash
# Dodaj produkt
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Trwaly Produkt","quantity":999}' \
  http://warehouse.local/api/products

# Usuń pod MongoDB (symulacja awarii)
kubectl delete pod mongo-0 -n warehouse

# Poczekaj na odtworzenie
kubectl wait --for=condition=ready pod/mongo-0 -n warehouse --timeout=60s

# Sprawdź czy dane przetrwały
curl -H "Authorization: Bearer $TOKEN" http://warehouse.local/api/products
# Trwaly Produkt nadal widoczny — PVC zachowało dane ✅
```

---

## 8. Test Redis (dodatkowy komponent)

```bash
# Wejdź do poda Redis
kubectl exec -it deployment/redis -n warehouse -- redis-cli ping
# PONG ✅

kubectl exec -it deployment/redis -n warehouse -- redis-cli set test "warehouse_ok"
kubectl exec -it deployment/redis -n warehouse -- redis-cli get test
# warehouse_ok ✅
```

---

## 9. Metryki / obserwowalność

```bash
# Endpoint /metrics (Prometheus-compatible)
curl http://warehouse.local/metrics
# warehouse_up 1 ✅

# Logi
kubectl logs -l app=backend -n warehouse -f
```

---

## 10. Link do ostatniego udanego workflow GitHub Actions

> ➡️ https://github.com/weronikaskakovska/tech_bezp/actions

(Link do konkretnego runu pojawi się po pierwszym poprawnym wykonaniu pipeline.)

---

## Wyjaśnienie PKCE (na prezentację)

**PKCE** (Proof Key for Code Exchange, RFC 7636) chroni Authorization Code Flow przed przechwyceniem kodu przez złośliwą aplikację.

**Jak działa:**
1. Frontend generuje losowy `code_verifier` (min. 43 znaki)
2. Oblicza `code_challenge = BASE64URL(SHA256(code_verifier))`
3. Wysyła `code_challenge` do authorization servera przy żądaniu autoryzacji
4. Authorization server zwraca `code`
5. Frontend wysyła `code` + `code_verifier` po token
6. Server weryfikuje: `SHA256(code_verifier) == code_challenge` → jeśli tak, wydaje token

**Dlaczego to ważne:** Nawet jeśli kod autoryzacyjny zostanie przechwycony, atakujący nie ma `code_verifier`, więc nie może wymienić kodu na token.

W tym projekcie PKCE jest włączone w konfiguracji Keycloak dla klienta `warehouse-frontend`:
```json
"attributes": { "pkce.code.challenge.method": "S256" }
```
