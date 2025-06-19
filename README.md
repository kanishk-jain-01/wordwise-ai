# WordWiseAI ✍️

An intelligent writing assistant that helps you write better with real-time grammar checking, enhanced spelling suggestions, and tone analysis.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-316192?style=flat-square&logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?style=flat-square&logo=redis)

## ✨ Features

- **🔍 Enhanced Spelling Engine**: Multi-stage ranking system with frequency analysis, keyboard distance awareness, and context-aware suggestions
- **📝 Grammar Checking**: Real-time grammar analysis with confidence scoring
- **🎭 Tone Analysis**: Automatic tone detection and explanations
- **📄 Document Management**: Create, edit, save, and organize documents
- **🚀 Real-time Editor**: TipTap-powered rich text editing with live feedback
- **🔐 Secure Authentication**: User accounts with encrypted passwords
- **🎨 Modern UI**: Clean, responsive design with dark/light mode
- **⚡ Performance**: Intelligent caching with Redis for fast suggestions

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Editor**: TipTap (ProseMirror-based)
- **Authentication**: NextAuth.js

### Backend
- **Runtime**: Node.js (Next.js API Routes)
- **Database**: Neon PostgreSQL
- **Caching**: Upstash Redis
- **Grammar Engine**: Custom rule-based system (370k+ word dictionary)
- **Deployment**: Vercel

### Key Libraries
- **UI Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **Validation**: Zod
- **Password Hashing**: bcryptjs
- **Utilities**: Lodash, date-fns

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL database (Neon recommended)
- Redis instance (Upstash recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/wordwise-ai.git
   cd wordwise-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Database
   DATABASE_URL=postgresql://your-neon-connection-string
   
   # Redis Cache
   UPSTASH_REDIS_REST_URL=https://your-redis-url
   UPSTASH_REDIS_REST_TOKEN=your-redis-token
   
   # NextAuth
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Set up the database**
   ```bash
   # Run the database schema
   psql $DATABASE_URL -f scripts/001-initial-schema.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
wordwise-ai/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main application
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Essential UI components only
│   └── *.tsx             # Feature components
├── lib/                   # Utilities and configurations
│   ├── enhanced-spelling-engine.ts  # Multi-stage spelling engine
│   ├── dictionary.ts     # Dictionary service
│   └── *.ts              # Other utilities
├── memory-bank/           # Project documentation
└── scripts/               # Database migrations
```

## 🧠 Enhanced Spelling Engine

WordWiseAI features a sophisticated spelling suggestion system that goes beyond simple edit distance:

- **Frequency Weighting**: Common words like "what" rank higher than rare words like "wat"
- **Keyboard Distance**: Adjacent key typos (e.g., "wah" → "what") get priority
- **Phonetic Matching**: Handles pronunciation-based errors using Soundex-like algorithms
- **Context Awareness**: Uses n-gram patterns to suggest contextually appropriate words
- **Confidence Scoring**: Multi-dimensional analysis provides reliability metrics

Example: "wah is up" → suggests ["what", "way", "was"] with "what" prioritized due to frequency and context.

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Documents
- `GET /api/documents` - List user documents
- `POST /api/documents` - Create new document
- `PUT /api/documents/[id]` - Update document
- `DELETE /api/documents/[id]` - Delete document

### Analysis
- `POST /api/grammar/check` - Grammar and spelling analysis
- `POST /api/tone/analyze` - Tone analysis

## 🧪 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Testing the Spelling Engine
1. Create a new document
2. Type "wah is up with this app"
3. Watch the enhanced suggestions appear with "what" as the top recommendation

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
- Set `NEXTAUTH_URL` to your production domain
- Configure database and Redis URLs for production
- Generate a secure `NEXTAUTH_SECRET`

## 📈 Performance

- **Grammar Analysis**: ~300-600ms with caching
- **Tone Analysis**: ~1-3 seconds
- **Auto-save**: 2-second debounce
- **Dictionary**: 370k+ words loaded on server start
- **Caching**: Redis for analysis results and keyboard distance calculations

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TipTap](https://tiptap.dev/) for the excellent rich text editor
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Neon](https://neon.tech/) for serverless PostgreSQL
- [Upstash](https://upstash.com/) for serverless Redis

---

**Built with ❤️ using Next.js, TypeScript, and modern web technologies.**

