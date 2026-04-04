# IGCSE Study Hub

A modern web platform for IGCSE students to upload, discover, and share study resources including notes, flashcards, revision guides, and question banks.

## 🚀 Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Deployment**: Vercel

## 📋 Features

### Current Implementation
- ✅ Next.js project setup with TypeScript
- ✅ Tailwind CSS configuration with custom colors
- ✅ Project structure (src directory with app router)
- ✅ Constants for subjects and resource types
- ✅ Database type definitions
- ✅ Basic homepage with hero section

### Planned Features
- [ ] User authentication (Email/Password + Google OAuth)
- [ ] Resource upload with form validation
- [ ] Browse resources by subject
- [ ] Filter by resource type
- [ ] My Uploads page (edit/delete)
- [ ] Upvote system
- [ ] Search functionality
- [ ] User profiles

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (for backend)

### Installation

1. **Clone the repository**
   ```bash
   cd C:\Users\HP\Desktop\igcse-study-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase credentials:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
igcse-study-hub/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Homepage
│   │   └── globals.css         # Global styles
│   ├── components/             # React components (to be created)
│   ├── lib/
│   │   ├── constants/          # App constants
│   │   │   ├── subjects.ts     # Subject definitions
│   │   │   └── resourceTypes.ts # Resource type definitions
│   │   ├── types/              # TypeScript types
│   │   │   └── database.types.ts # Database types
│   │   └── supabase/           # Supabase utilities (to be created)
│   └── hooks/                  # Custom React hooks (to be created)
├── public/                     # Static assets
├── .env.local.example          # Environment variables template
├── next.config.js              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies

```

## 🎨 Design System

### Colors
- **Primary Blue**: #3B82F6 - Trust, education
- **Secondary Purple**: #8B5CF6 - Creativity
- **Success Green**: #10B981 - Success, growth
- **Subject Colors**: Unique color per subject for visual distinction

### Typography
- **Font**: Inter (Google Fonts)
- **Headings**: Bold, clear hierarchy
- **Body**: Readable, comfortable line-height

## 📚 Subjects Supported

1. Mathematics (0580) - 📐
2. Physics (0625) - ⚛️
3. Chemistry (0620) - 🧪
4. Biology (0610) - 🧬
5. English (0500) - 📚
6. Economics (0455) - 💰
7. Global Perspectives (0457) - 🌍
8. ICT (0417) - 💻
9. Business Studies (0450) - 📊

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Next Steps

1. **Install Supabase dependencies**
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   ```

2. **Set up Supabase project**
   - Create project at [supabase.com](https://supabase.com)
   - Run database migrations (SQL from planning doc)
   - Configure authentication providers

3. **Build core features**
   - Create Supabase client utilities
   - Implement authentication
   - Build main layout (Navbar + Footer)
   - Create resource cards and grids
   - Implement upload form

## 📖 Documentation

- [Technical Plan](../IGCSE_Study_Hub_Plan.md) - Complete implementation plan
- [Project Status](../PROJECT_STATUS.md) - Current status and next steps
- [Quick Start Guide](../QUICK_START_GUIDE.md) - Step-by-step guide
- [Prototype](../igcse-study-hub-prototype/) - HTML/CSS design reference

## 🤝 Contributing

This is a student project. Contributions, issues, and feature requests are welcome!

## 📝 License

This project is for educational purposes.

## 👨‍💻 Author

Built with ❤️ for IGCSE students

---

**Status**: 🚧 In Development  
**Last Updated**: March 31, 2026  
**Version**: 0.1.0