# System Patterns: WordWiseAI

## Architecture Overview

### Application Type
- **Framework**: Next.js 15 with App Router
- **Architecture**: Full-stack React application with API routes
- **Deployment**: Serverless architecture (Vercel)
- **Database**: PostgreSQL (Neon) with Redis caching

### Key Architectural Decisions

#### 1. Optimized Monolithic Full-Stack Structure
- Single Next.js application handles both frontend and backend
- API routes provide serverless backend functionality
- Simplified deployment and development workflow
- Shared TypeScript types between frontend and backend
- **Production-optimized**: 74 unused dependencies removed, 30+ unused components eliminated
- **Streamlined architecture**: Clean, focused codebase with zero redundancy

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

### 3. Enhanced Real-Time Analysis Pattern
- **Multi-Stage Spelling Engine**: Implemented sophisticated suggestion ranking system combining:
  - **Frequency Analysis**: 370k+ word dictionary with frequency weighting
  - **Keyboard Distance**: QWERTY-aware proximity scoring for typo detection
  - **Phonetic Matching**: Simplified Soundex algorithm for pronunciation-based errors
  - **Context Awareness**: N-gram analysis using surrounding words for better suggestions
  - **Confidence Scoring**: Multi-dimensional confidence calculation with intelligent filtering
- **Frontend / Backend Decoupling**: The backend grammar engine operates on plain text for simplicity and performance. The frontend is responsible for translating rich-text editor content into plain text for the API and then mapping the returned suggestion offsets back to the editor's coordinate system.
- **Position Mapping**: To ensure highlighting and replacements are accurate, the frontend generates a position map on each analysis request. This map links the index of every character in the plain-text string to its corresponding position in the editor's document model (ProseMirror). This is critical because ProseMirror uses a double space (`"  "`) to separate block nodes, causing a divergence from a simple text representation.
- **Debouncing**: User input is debounced (1000ms for grammar, 2000ms for tone) to prevent excessive API calls during typing.
- **Intelligent Caching**: Analysis results cached in Redis with keyboard distance caching and frequency lookup optimization.

### 4. Editor Integration Pattern
- **Editor**: TipTap rich text editor
- **Extensions**: Custom grammar highlighting extension (`grammar-highlight-extension.ts`) to visually mark suggestions.
- **State Management**: React hooks for editor state
- **Actions**: Exposed editor actions for external control

### 5. Decoration-Based Highlight Pattern (NEW)
- **Problem**: Mark-based highlights mutated the document, triggering extra `onUpdate` cycles, causing flicker and incorrect suggestion clearing.
- **Solution**: Use a dedicated TipTap `Extension` that manages a ProseMirror `DecorationSet` keyed by a plugin. Decorations are applied by passing suggestion arrays via transaction metadata. Because decorations are external to the document state, they do not trigger `onUpdate`, maintaining stability and performance.
- **Implementation**: `components/grammar-highlight-extension.ts` defines the plugin with `grammarHighlightKey`; helper functions `applyGrammarHighlights` and `clearGrammarHighlights` dispatch transactions carrying suggestion data.
- **Benefits**:
  * No document mutation → eliminates highlight-induced loops.
  * Offsets automatically remapped via transaction mapping.
  * Simpler removal/refresh logic; decorations removed when suggestions array emptied.
- **Considerations**: Offset mapping must include two-space block separators to stay aligned with backend analysis.

### 6. Ref-Based Debounce Pattern (CRITICAL)
- **Problem**: `useCallback` with debounced functions can capture stale closures when function dependencies change on every render, causing debounced callbacks to use outdated references.
- **Symptom**: Grammar checking stops working when typing new content because debounced functions reference stale `editor` instances or other state.
- **Solution**: Use `useRef` to maintain current function references while keeping stable debounced functions:
  ```typescript
  const checkGrammarRef = useRef<(text: string) => Promise<void>>()
  checkGrammarRef.current = checkGrammar // Update on every render
  
  const debouncedCheckGrammar = useCallback(
    debounce((text: string) => checkGrammarRef.current?.(text), 1000),
    [documentId] // Only recreate when documentId changes
  )
  ```
- **Benefits**:
  * Preserves debounce behavior (functions only recreated when truly needed)
  * Always calls current function version (no stale closures)
  * Maintains performance (avoids excessive debounce recreation)
- **Implementation**: `components/editor-panel.tsx` uses this pattern for both `checkGrammar` and `analyzeTone` debounced functions.

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