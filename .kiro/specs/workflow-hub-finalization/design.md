# Design Document

## Overview

This design document outlines the finalization and enhancement of the WorkFlow Hub application. The focus is on creating a production-ready application with improved UX, complete functionality, and clean architecture while removing all Lovable dependencies and implementing a collapsible sidebar navigation.

## Architecture

### Current Architecture Analysis
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + Shadcn/UI components
- **State Management**: React Query for server state, React hooks for local state
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL with RLS
- **Routing**: React Router v6

### Enhanced Architecture
- **Navigation**: Collapsible sidebar with responsive behavior
- **State Management**: Add Zustand for global UI state (sidebar, theme)
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Performance**: Code splitting and lazy loading for better performance

## Components and Interfaces

### 1. Sidebar Navigation Component

```typescript
interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType;
  href: string;
  adminOnly?: boolean;
}
```

**Features:**
- Collapsible with smooth animations
- Auto-collapse on mobile when clicking outside
- Icon-only mode when collapsed with tooltips
- Responsive overlay behavior on mobile
- Admin-only menu items based on user role

### 2. Enhanced Layout System

```typescript
interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

interface PageLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}
```

### 3. Improved Extraction System

```typescript
interface ExtractionParams {
  country: string;
  sector: string;
  companyAge: string;
  fileFormat: 'csv' | 'excel';
  keywords?: string[];
  excludeKeywords?: string[];
}

interface ExtractionStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  message?: string;
  fileUrl?: string;
}
```

**Enhanced Features:**
- Real-time status updates via Supabase realtime
- Progress indicators for long-running extractions
- Retry mechanism for failed extractions
- Better error handling and user feedback

### 4. Admin Management System

```typescript
interface UserManagementProps {
  users: User[];
  onAddUser: (userData: CreateUserData) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onResetPassword: (userId: string) => Promise<void>;
  onToggleRole: (userId: string, role: 'admin' | 'user') => Promise<void>;
}

interface BrandingSettings {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}
```

## Data Models

### Enhanced Database Schema

```sql
-- Enhanced extractions table with additional fields
ALTER TABLE public.extractions ADD COLUMN IF NOT EXISTS keywords TEXT[];
ALTER TABLE public.extractions ADD COLUMN IF NOT EXISTS exclude_keywords TEXT[];
ALTER TABLE public.extractions ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE public.extractions ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.extractions ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- User preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sidebar_collapsed BOOLEAN DEFAULT false,
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'fr',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Audit log table for admin actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### State Management Models

```typescript
// Zustand store for UI state
interface UIStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  brandingSettings: BrandingSettings | null;
  setBrandingSettings: (settings: BrandingSettings) => void;
}

// Enhanced user context
interface UserContextType {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}
```

## Error Handling

### Error Boundary Implementation
- Global error boundary for unhandled errors
- Component-specific error boundaries for critical sections
- Graceful degradation for non-critical features
- User-friendly error messages with actionable suggestions

### API Error Handling
```typescript
interface APIError {
  code: string;
  message: string;
  details?: any;
}

class APIErrorHandler {
  static handle(error: APIError): void {
    // Log error for debugging
    console.error('API Error:', error);
    
    // Show user-friendly message
    const userMessage = this.getUserMessage(error.code);
    toast.error(userMessage);
  }
  
  private static getUserMessage(code: string): string {
    const messages: Record<string, string> = {
      'AUTH_ERROR': 'Erreur d\'authentification. Veuillez vous reconnecter.',
      'NETWORK_ERROR': 'Erreur de connexion. Vérifiez votre connexion internet.',
      'VALIDATION_ERROR': 'Données invalides. Vérifiez vos saisies.',
      'PERMISSION_ERROR': 'Vous n\'avez pas les permissions nécessaires.',
      'DEFAULT': 'Une erreur inattendue s\'est produite.'
    };
    
    return messages[code] || messages.DEFAULT;
  }
}
```

## Testing Strategy

### Unit Testing
- Component testing with React Testing Library
- Hook testing for custom hooks
- Utility function testing
- Mock Supabase client for isolated testing

### Integration Testing
- Authentication flow testing
- Extraction workflow testing
- Admin functionality testing
- API integration testing

### E2E Testing (Optional)
- Critical user journeys
- Cross-browser compatibility
- Mobile responsiveness

## Performance Optimizations

### Code Splitting
```typescript
// Lazy load admin components
const AdminPage = lazy(() => import('./pages/Admin'));
const UserManagement = lazy(() => import('./components/admin/UserManagement'));

// Route-based code splitting
const router = createBrowserRouter([
  {
    path: '/admin',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <AdminPage />
      </Suspense>
    )
  }
]);
```

### Optimization Strategies
- React.memo for expensive components
- useMemo and useCallback for expensive computations
- Virtual scrolling for large lists
- Image optimization and lazy loading
- Bundle size optimization

## Security Considerations

### Authentication & Authorization
- Secure token handling
- Role-based access control (RBAC)
- Session management
- Password reset security

### Data Protection
- Input validation and sanitization
- XSS prevention
- CSRF protection
- Secure file upload handling

### API Security
- Rate limiting
- Request validation
- Error message sanitization
- Audit logging for sensitive operations

## Deployment Configuration

### Environment Variables
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# n8n Webhook Configuration
VITE_N8N_WEBHOOK_URL=your_n8n_webhook_url

# Application Configuration
VITE_APP_NAME=WorkFlow Hub
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production
```

### Build Configuration
- Production build optimization
- Asset optimization
- Source map configuration
- Environment-specific builds

### GitHub Actions Workflow
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - name: Deploy to Vercel
        uses: vercel/action@v1
```

## Migration Strategy

### Lovable Removal Process
1. **Dependency Cleanup**: Remove `lovable-tagger` and related packages
2. **Code Cleanup**: Remove Lovable-specific comments and imports
3. **Component Refactoring**: Replace any Lovable-specific patterns
4. **Testing**: Ensure all functionality works without Lovable dependencies

### Database Migration
1. **Schema Updates**: Apply new table structures and columns
2. **Data Migration**: Migrate existing data to new schema
3. **Index Optimization**: Add performance indexes
4. **Backup Strategy**: Implement backup before migration

### Deployment Strategy
1. **Staging Deployment**: Test all changes in staging environment
2. **Database Migration**: Apply schema changes
3. **Production Deployment**: Deploy application with zero downtime
4. **Rollback Plan**: Prepare rollback strategy if issues arise