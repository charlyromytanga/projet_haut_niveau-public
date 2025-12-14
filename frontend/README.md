# Angular Frontend - Projet Haut Niveau

> Synthèse — Migration et intégration (Décembre 2025)

Ce frontend Angular 17+ a été migré et intégré dans `frontend/` pour remplacer l’ancien Next.js (archivé sous `frontend-nextjs-backup/`). Il implémente une architecture enterprise (core/services, stores RxJS, features lazy-loaded), des alias TypeScript et une configuration stricte. Le couplage avec l’API FastAPI a été stabilisé par une configuration CORS permissive côté dev, et l’`environment.ts` cible `http://localhost:8100`. L’orchestration via Docker Compose isole les ports pour éviter les conflits (frontend en 4310/4311/4312 → 4200 dans le conteneur, API en 8100 → 8000). Des vérifications par `curl` et via le navigateur confirment la disponibilité de `/health`, `/docs` et la consommation de `/projects`.

## 🎯 Objectif pédagogique

Ce projet Angular est conçu comme **un projet d'apprentissage et de démonstration de compétences** pour valoriser :
- La maîtrise d'**Angular 17+** (Standalone Components)
- La **programmation réactive avec RxJS**
- L'architecture **enterprise-grade** (scalable, maintenable)
- Les **design patterns modernes** (MVVM, Reactive Programming)

---

## 📚 Architecture du projet

### Vue d'ensemble

```
angular-frontend/
├── src/
│   ├── app/
│   │   ├── core/              # Services singleton (API, Auth, State)
│   │   ├── features/          # Modules fonctionnels (lazy-loaded)
│   │   └── shared/            # Composants/pipes/directives réutilisables
│   ├── assets/                # Images, fonts, fichiers statiques
│   └── environments/          # Configuration par environnement
├── docs/                      # Documentation détaillée
└── config/                    # Configuration build/test
```

### Philosophie d'organisation

#### 1. **Core Module** (Singleton Services)
- Services instanciés **une seule fois** dans l'application
- Exemples : `ApiService`, `AuthService`, `StateService`
- ❌ Ne contient **jamais** de composants UI

#### 2. **Features Modules** (Lazy Loading)
- Modules chargés **à la demande** (améliore les performances)
- Chaque feature = une fonctionnalité métier complète
- Exemples : `DashboardModule`, `ProjectsModule`, `CvGenerationModule`

#### 3. **Shared Module**
- Composants/pipes/directives **réutilisés** à travers l'app
- Exemples : `ButtonComponent`, `LoaderComponent`, `DatePipe`

---

## 🚀 Guide de démarrage rapide

### Prérequis

```bash
# Vérifier Node.js (version 18+)
node --version

# Installer Angular CLI globalement
npm install -g @angular/cli@latest
```

### Installation et lancement

```bash
# 1. Naviguer dans le dossier
cd Modelisation/angular-frontend

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement
ng serve

# Accéder à : http://localhost:4200
```

### Commandes essentielles

```bash
# Générer un nouveau composant
ng generate component features/projects/project-list

# Générer un service
ng generate service core/services/api

# Build de production
ng build --configuration production

# Tests unitaires
ng test

# Linter (analyse du code)
ng lint
```

---

## 📖 Concepts clés à maîtriser

### 1. Standalone Components (Angular 17+)

**Avant** (modules NgModule) :
```typescript
@NgModule({
  declarations: [MyComponent],
  imports: [CommonModule]
})
export class MyModule {}
```

**Maintenant** (standalone) :
```typescript
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule],
  template: `...`
})
export class MyComponent {}
```

**Avantages** :
- ✅ Moins de boilerplate
- ✅ Tree-shaking optimisé (bundle plus léger)
- ✅ Lazy loading simplifié

---

### 2. Programmation Réactive avec RxJS

#### Observable vs Promise

| Observable | Promise |
|------------|---------|
| Flux de **plusieurs valeurs** | **Une seule valeur** |
| Lazy (démarre à la souscription) | Eager (exécution immédiate) |
| Annulable (`.unsubscribe()`) | Non annulable |
| Opérateurs puissants (`map`, `filter`, etc.) | `.then()` / `.catch()` |

#### Exemple pratique

```typescript
// ❌ Approche impérative (ancienne)
getProjects() {
  this.loading = true;
  this.http.get('/api/projects').subscribe({
    next: (data) => {
      this.projects = data;
      this.loading = false;
    },
    error: (err) => {
      this.error = err;
      this.loading = false;
    }
  });
}

// ✅ Approche réactive (moderne)
projects$ = this.http.get<Project[]>('/api/projects').pipe(
  catchError(err => {
    console.error(err);
    return of([]); // Valeur par défaut en cas d'erreur
  }),
  shareReplay(1) // Cache le résultat
);
```

**Dans le template** :
```html
<!-- Avec async pipe (pas besoin d'unsubscribe) -->
<div *ngFor="let project of projects$ | async">
  {{ project.name }}
</div>
```

---

### 3. Signals (Angular 16+) - Alternative moderne

```typescript
import { signal, computed } from '@angular/core';

export class ProjectService {
  // Signal mutable
  projects = signal<Project[]>([]);
  
  // Signal dérivé (computed)
  projectCount = computed(() => this.projects().length);
  
  // Mise à jour
  addProject(project: Project) {
    this.projects.update(current => [...current, project]);
  }
}
```

**Quand utiliser Signals vs Observables ?**
- **Signals** : État synchrone simple (compteurs, formulaires)
- **Observables** : Événements asynchrones (HTTP, WebSockets, timers)

---

## 🏗️ Patterns d'architecture

### 1. Service Pattern (Séparation des responsabilités)

```typescript
// ❌ Mauvais : logique métier dans le composant
export class ProjectListComponent {
  projects: Project[] = [];
  
  ngOnInit() {
    this.http.get<Project[]>('/api/projects')
      .subscribe(data => this.projects = data);
  }
}

// ✅ Bon : logique dans un service
export class ProjectService {
  private http = inject(HttpClient);
  
  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>('/api/projects');
  }
}

export class ProjectListComponent {
  private projectService = inject(ProjectService);
  projects$ = this.projectService.getProjects();
}
```

---

### 2. State Management Pattern

```typescript
// Store centralisé pour l'état global
@Injectable({ providedIn: 'root' })
export class ProjectStore {
  private projectsSubject = new BehaviorSubject<Project[]>([]);
  
  // Observable public (lecture seule)
  projects$ = this.projectsSubject.asObservable();
  
  // Actions (modifient l'état)
  setProjects(projects: Project[]) {
    this.projectsSubject.next(projects);
  }
  
  addProject(project: Project) {
    const current = this.projectsSubject.value;
    this.projectsSubject.next([...current, project]);
  }
}
```

---

## 🎨 Intégration avec l'API Backend

### Configuration de l'environnement

```typescript
// environments/environment.development.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000'
};

// environments/environment.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.production.com'
};
```

### Service API générique

```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  
  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`).pipe(
      retry(2), // Retry 2 fois en cas d'échec
      catchError(this.handleError)
    );
  }
  
  private handleError(error: HttpErrorResponse) {
    console.error('Erreur API:', error);
    return throwError(() => new Error('Une erreur est survenue'));
  }
}
```

---

## 🧪 Tests et qualité du code

### Tests unitaires (Jasmine + Karma)

```typescript
describe('ProjectService', () => {
  let service: ProjectService;
  let httpMock: HttpTestingController;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProjectService]
    });
    service = TestBed.inject(ProjectService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  
  it('devrait récupérer les projets', () => {
    const mockProjects = [{ id: 1, name: 'Test' }];
    
    service.getProjects().subscribe(projects => {
      expect(projects).toEqual(mockProjects);
    });
    
    const req = httpMock.expectOne('/api/projects');
    expect(req.request.method).toBe('GET');
    req.flush(mockProjects);
  });
  
  afterEach(() => {
    httpMock.verify();
  });
});
```

---

## 📊 Performance et optimisation

### 1. Lazy Loading des routes

```typescript
const routes: Routes = [
  {
    path: 'projects',
    loadComponent: () => import('./features/projects/project-list.component')
      .then(m => m.ProjectListComponent)
  }
];
```

### 2. OnPush Change Detection

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush, // ⚡ Plus performant
  // ...
})
```

### 3. TrackBy dans ngFor

```typescript
// Template
<div *ngFor="let item of items; trackBy: trackById">

// Component
trackById(index: number, item: any): number {
  return item.id; // Clé unique pour éviter les re-rendus inutiles
}
```

---

## 🔗 Ressources d'apprentissage

### Documentation officielle
- [Angular.io](https://angular.io) - Documentation complète
- [RxJS](https://rxjs.dev) - Opérateurs et guides
- [Angular Blog](https://blog.angular.io) - Nouveautés

### Tutoriels recommandés
- [Angular University](https://angular-university.io) - Cours avancés
- [Deborah Kurata](https://www.youtube.com/@deborah_kurata) - YouTube
- [Joshua Morony](https://www.youtube.com/@JoshuaMorony) - Patterns modernes

### Communauté
- [Stack Overflow](https://stackoverflow.com/questions/tagged/angular) - Questions/réponses
- [Angular Discord](https://discord.gg/angular) - Chat en direct
- [r/Angular2](https://www.reddit.com/r/Angular2/) - Reddit

---

## 🚢 Déploiement Docker

Le projet est intégré dans `docker-compose.yml` :

```bash
# Build et démarrage
docker compose up --build angular-frontend

# Accès
http://localhost:4200
```

---

## 📝 Prochaines étapes

1. ✅ Comprendre l'architecture des dossiers
2. 🔄 Explorer les composants de base (Dashboard, Projects)
3. 🔄 Maîtriser RxJS avec les exemples fournis
4. 🔄 Créer vos propres features
5. 🔄 Ajouter des tests

**Bon apprentissage ! 🎓**
