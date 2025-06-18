# Technical Context: WordWiseAI

## Technology Stack

### Frontend Technologies
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5
- **UI Library**: React 19
- **Styling**: Tailwind CSS 3.4.17
- **Component Library**: shadcn/ui (Radix UI primitives)
- **Rich Text Editor**: TipTap (with Starter Kit)
- **Icons**: Lucide React
- **Theme Management**: next-themes

### Backend Technologies
- **Runtime**: Next.js API Routes (Node.js)
- **Authentication**: NextAuth.js 5.0 (beta)
- **Password Hashing**: bcryptjs
- **Database Driver**: @neondatabase/serverless
- **Caching**: @upstash/redis
- **Validation**: Zod 3.24.1
- **Utilities**: Lodash, date-fns

### Database & Infrastructure
- **Primary Database**: Neon PostgreSQL (serverless)
- **Caching Layer**: Upstash Redis
- **Hosting**: Vercel (serverless deployment)
- **CDN**: Vercel Edge Network
- **Domain**: Custom domain support

### Development Tools
- **Package Manager**: npm
- **Build Tool**: Next.js built-in bundler
- **CSS Processor**: PostCSS with Autoprefixer
- **Type Checking**: TypeScript compiler
- **Linting**: Next.js ESLint configuration

## Development Environment Setup

### Prerequisites
- Node.js 18+ (recommended: latest LTS)
- npm package manager
- Git for version control

### Environment Variables Required
```env
# Database
DATABASE_URL=postgresql://[connection-string]

# Redis Cache
UPSTASH_REDIS_REST_URL=https://[redis-url]
UPSTASH_REDIS_REST_TOKEN=[redis-token]

# NextAuth
NEXTAUTH_SECRET=[random-secret-key]
NEXTAUTH_URL=http://localhost:3000 (or production URL)
```

### Development Workflow
1. **Installation**: `npm install`
2. **Development Server**: `npm run dev` (runs on localhost:3000)
3. **Build**: `npm run build`
4. **Production Server**: `npm start`
5. **Linting**: `npm run lint`

### Database Setup
1. Create Neon PostgreSQL database
2. Run schema migration: `scripts/001-initial-schema.sql`
3. Configure connection string in environment variables

## Architecture Constraints

### Performance Requirements
- **Real-time Response**: Grammar checking must respond within 2 seconds
- **Auto-save Timing**: Document auto-save every 2 seconds of inactivity
- **Editor Responsiveness**: Text input must feel immediate (<100ms)
- **Page Load**: Initial page load under 3 seconds

### Scalability Considerations
- **Serverless Architecture**: Scales automatically with Vercel
- **Database Connections**: Neon handles connection pooling
- **Caching Strategy**: Redis reduces database load
- **Static Assets**: CDN delivery for optimal performance

### Security Requirements
- **Authentication**: Secure user sessions with JWT
- **Password Security**: bcrypt hashing with salt rounds
- **Data Protection**: User documents isolated by user ID
- **Input Validation**: All user inputs validated and sanitized

## Technical Dependencies

### Core Dependencies Analysis
- **Next.js 15**: Latest stable version with App Router
- **React 19**: Latest version for improved performance
- **TypeScript**: Strict typing for development safety
- **Tailwind CSS**: Utility-first styling approach
- **TipTap**: Modern rich text editor with extensibility

### Database Schema Design
```sql
-- Users table with authentication data
users (id, email, name, password_hash, created_at, updated_at)

-- Documents with user relationship
documents (id, user_id, title, content, tone, word_count, created_at, updated_at)

-- Suggestions caching for performance
suggestions (id, document_id, text_hash, suggestions, created_at)
```

### API Design Patterns
- **RESTful Endpoints**: Standard HTTP methods
- **Consistent Responses**: Structured JSON responses
- **Error Handling**: Proper HTTP status codes
- **Authentication**: Session-based protection

## Development Patterns

### File Organization
```
/app                 # Next.js App Router
  /api              # Backend API routes
  /auth             # Authentication pages
  /dashboard        # Main application
/components         # React components
  /ui               # shadcn/ui components
/lib                # Shared utilities
/hooks              # Custom React hooks
/scripts            # Database migrations
/styles             # Global styles
```

### Code Quality Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended configuration
- **Component Structure**: Functional components with hooks
- **Error Boundaries**: Graceful error handling
- **Loading States**: User feedback during async operations

### Testing Strategy (Future)
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API route testing
- **E2E Tests**: User workflow testing
- **Performance Tests**: Load and response time testing

## Deployment Configuration

### Vercel Deployment
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Node.js Version**: 18.x
- **Environment Variables**: Configured in Vercel dashboard

### Production Optimizations
- **Static Assets**: Automatic optimization and CDN
- **Code Splitting**: Automatic with Next.js
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: Built-in bundle analyzer

### Monitoring & Analytics
- **Vercel Analytics**: Built-in performance monitoring
- **Error Tracking**: Console logging (Sentry integration planned)
- **Performance Metrics**: Core Web Vitals tracking
- **User Analytics**: Privacy-focused analytics 