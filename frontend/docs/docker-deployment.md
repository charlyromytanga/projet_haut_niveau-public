# 🚀 Guide de déploiement Docker

> Synthèse — Décisions de déploiement (Décembre 2025)

Le frontend Angular est packagé en deux modes : développement (hot-reload sur port 4200 dans le conteneur, exposé en 4310/4311/4312 côté hôte selon disponibilité) et production (Nginx, image légère). L’API FastAPI est exposée en 8000 (conteneur) et mappée en 8100 (hôte). La configuration CORS a été rendue permissive pour éviter les échecs de préflight en dev. Le projet Compose est isolé par nom et remap de ports pour prévenir les chevauchements avec d’autres stacks locales. Les tests `curl` `/health`, `/docs` et `/projects` ont validé le bon couplage.

## Table des matières
1. [Build et lancement](#build-et-lancement)
2. [Développement](#développement)
3. [Production](#production)
4. [Intégration avec docker-compose](#intégration-avec-docker-compose)

---

## Build et lancement

### Développement (avec hot-reload)

```bash
# Build de l'image de développement
docker build -f Dockerfile.dev -t angular-frontend:dev .

# Lancer le conteneur
docker run -p 4200:4200 -v $(pwd):/app angular-frontend:dev

# Accès : http://localhost:4200
```

**Avantages** :
- ✅ Hot-reload (modifications visibles immédiatement)
- ✅ Volume monté (pas besoin de rebuild)
- ✅ Debugging facile

### Production (optimisé)

```bash
# Build de l'image de production
docker build -t angular-frontend:prod .

# Lancer le conteneur
docker run -p 80:80 angular-frontend:prod

# Accès : http://localhost
```

**Avantages** :
- ✅ Image légère (~50MB vs 400MB en dev)
- ✅ Nginx optimisé (compression, cache)
- ✅ Multi-stage build (sécurité)

---

## Développement

### Avec docker-compose

Créer `docker-compose.dev.yml` :

```yaml
version: '3.8'

services:
  angular-frontend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "4200:4200"
    volumes:
      - ./src:/app/src          # Hot-reload
      - ./angular.json:/app/angular.json
      - ./tsconfig.json:/app/tsconfig.json
    environment:
      - NODE_ENV=development
```

```bash
# Lancer
docker-compose -f docker-compose.dev.yml up

# Logs en temps réel
docker-compose -f docker-compose.dev.yml logs -f
```

---

## Production

### Build optimisé

Le Dockerfile utilise un **multi-stage build** :

```dockerfile
# Stage 1 : Compiler l'application (node:20-alpine)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build:prod

# Stage 2 : Servir avec Nginx (nginx:alpine)
FROM nginx:alpine
COPY --from=builder /app/dist/angular-frontend/browser /usr/share/nginx/html
```

**Résultat** :
- 📦 Image finale : ~50MB (sans Node.js)
- ⚡ Performances : Nginx optimisé
- 🔒 Sécurité : Pas d'outils de build en production

### Variables d'environnement

Pour changer l'URL de l'API en production, modifier `src/environments/environment.production.ts` avant le build :

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.votre-domaine.com' // ✅ URL de production
};
```

---

## Intégration avec docker-compose

### Structure complète

```yaml
version: '3.8'

services:
  # Backend API
  api:
    build: ./api
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/dbname
    depends_on:
      - db

  # Frontend Angular
  angular-frontend:
    build: 
      context: ./Modelisation/angular-frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - api

  # Base de données
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=dbname
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

### Lancement

```bash
# Build et lancement
docker-compose up --build

# En arrière-plan
docker-compose up -d

# Vérifier les logs
docker-compose logs -f angular-frontend

# Arrêter
docker-compose down
```

---

## Commandes utiles

### Debugging

```bash
# Voir les logs du conteneur
docker logs -f <container_id>

# Accéder au shell du conteneur
docker exec -it <container_id> sh

# Inspecter l'image
docker image inspect angular-frontend:prod

# Voir la taille de l'image
docker images | grep angular-frontend
```

### Nettoyage

```bash
# Supprimer les images non utilisées
docker image prune

# Supprimer tous les conteneurs arrêtés
docker container prune

# Nettoyage complet
docker system prune -a
```

---

## Optimisations avancées

### 1. Cache npm optimisé

```dockerfile
# Copier uniquement package.json en premier
COPY package*.json ./
RUN npm ci

# Puis copier le reste (cache Docker optimisé)
COPY . .
```

### 2. Compression Nginx

La configuration Nginx active automatiquement :
- ✅ Compression Gzip
- ✅ Cache des assets (1 an)
- ✅ Security headers

### 3. Healthcheck

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1
```

---

## Troubleshooting

### Problème : "Cannot GET /"

**Cause** : Routing Angular pas configuré dans Nginx

**Solution** : Vérifier que `nginx.conf` contient :
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Problème : "API calls fail with CORS error"

**Solution** : Ajouter le proxy dans `nginx.conf` :
```nginx
location /api/ {
    proxy_pass http://api:8000;
}
```

### Problème : "Module not found"

**Cause** : Dépendances mal installées

**Solution** :
```bash
# Rebuild sans cache
docker build --no-cache -t angular-frontend:prod .
```

---

## Checklist de déploiement

- [ ] Build de production testé localement
- [ ] Variables d'environnement configurées
- [ ] nginx.conf adapté (API URL)
- [ ] Healthcheck fonctionnel
- [ ] Tests E2E passent
- [ ] Images Docker taggées avec version
- [ ] Documentation mise à jour

**Bon déploiement ! 🚀**
