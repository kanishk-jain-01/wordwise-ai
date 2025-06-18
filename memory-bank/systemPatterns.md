# System Patterns: WordWiseAI

## Architecture Overview

### Application Type
- **Framework**: Next.js 15 with App Router
- **Architecture**: Full-stack React application with API routes
- **Deployment**: Serverless architecture (Vercel)
- **Database**: PostgreSQL (Neon) with Redis caching

### Key Architectural Decisions

#### 1. Monolithic Full-Stack Structure
- Single Next.js application handles both frontend and backend
- API routes provide serverless backend functionality
- Simplified deployment and development workflow
- Shared TypeScript types between frontend and backend

#### 2. Component-Based Frontend Architecture
```
app/                    # Next.js App Router pages
components/            # Reusable UI components
  ui/                 # shadcn/ui components
  [feature-components] # Feature-specific components
lib/                   # Shared utilities and configurations
hooks/                 # Custom React hooks
```

#### 3. API Route Structure
```
app/api/
  auth/               # Authentication endpoints
  documents/          # Document CRUD operations
  grammar/            # Grammar checking services
  tone/              # Tone analysis services
```

## Core System Patterns

### 1. Authentication Pattern
- **Provider**: NextAuth.js with Credentials provider
- **Strategy**: JWT-based sessions
- **Security**: bcrypt password hashing
- **Flow**: Email/password authentication with secure session management

### 2. Database Access Pattern
- **ORM**: Direct SQL queries using Neon serverless driver
- **Type Safety**: TypeScript interfaces for database models
- **Connection**: Serverless-optimized connection pooling
- **Migrations**: SQL scripts in `/scripts` directory

### 3. Real-Time Analysis Pattern
- **Debouncing**: User input debounced to prevent excessive API calls
- **Parallel Processing**: Grammar and tone analysis run independently
- **Caching**: Redis caching for analysis results
- **Error Handling**: Graceful degradation when services fail

### 4. Editor Integration Pattern
- **Editor**: TipTap rich text editor
- **Extensions**: Custom grammar highlighting extension
- **State Management**: React hooks for editor state
- **Actions**: Exposed editor actions for external control

## Component Relationships

### Core Components
1. **Dashboard Page** (`app/dashboard/page.tsx`)
   - Orchestrates the main application interface
   - Manages document state and user interactions
   - Coordinates between sidebar, editor, and analysis panels

2. **Document Sidebar** (`components/document-sidebar.tsx`)
   - Document list and navigation
   - Document creation and deletion
   - Search and filtering capabilities

3. **Editor Panel** (`components/editor-panel.tsx`)
   - TipTap rich text editor integration
   - Real-time grammar and tone analysis
   - Suggestion highlighting and application

4. **Writing Issues** (`components/writing-issues.tsx`)
   - Grammar suggestion display
   - User interaction with suggestions
   - Error categorization and filtering

5. **Tone Indicator** (`components/tone-indicator.tsx`)
   - Tone analysis visualization
   - Tone explanation and context

### Data Flow Patterns

#### Document Management Flow
```
User Action → Dashboard → API Route → Database → Response → UI Update
```

#### Grammar Checking Flow
```
Text Input → Debounce → Grammar API → Engine → Suggestions → Editor Highlights
```

#### Auto-Save Flow
```
Content Change → Debounce → Save API → Database → UI Status Update
```

## Technical Design Patterns

### 1. Composition Pattern
- Components composed from smaller, reusable parts
- shadcn/ui provides base UI components
- Feature components combine UI components with business logic

### 2. Hook-Based State Management
- Custom hooks encapsulate complex state logic
- React Context for global state (auth, theme)
- Local state for component-specific data

### 3. API Route Pattern
- RESTful endpoints with proper HTTP methods
- Consistent error handling and response formats
- Authentication middleware for protected routes

### 4. Type Safety Pattern
- Shared TypeScript interfaces in `/lib/db.ts`
- Strict typing for API requests and responses
- Type-safe database queries and operations

## Performance Patterns

### 1. Debouncing Strategy
- Grammar checking: 1000ms debounce
- Tone analysis: 2000ms debounce
- Auto-save: 2000ms debounce
- Prevents excessive API calls during typing

### 2. Caching Strategy
- Redis caching for grammar analysis results
- Browser caching for static assets
- Database query optimization with indexes

### 3. Lazy Loading
- Components loaded on demand
- API calls only when necessary
- Progressive enhancement approach

## Security Patterns

### 1. Authentication Security
- Password hashing with bcrypt
- JWT token validation
- Protected routes with middleware
- Session management with NextAuth.js

### 2. Data Validation
- Zod schemas for input validation
- SQL injection prevention with parameterized queries
- XSS protection through React's built-in escaping

### 3. Authorization Pattern
- User-based document access control
- API route protection with session validation
- Client-side route protection with ProtectedRoute component 