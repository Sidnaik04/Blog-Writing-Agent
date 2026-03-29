# Blog Writing Agent

An AI-powered blog generation platform that creates professional blog posts using multi-agent systems, retrieval-augmented generation (RAG), and real-time streaming pipelines.

---

## 📌 What It Does

Blog Writing Agent automatically generates high-quality, well-researched blog posts on any topic. It combines an intelligent multi-agent system (powered by LangGraph) with vector-based retrieval to produce coherent, SEO-ready content in minutes.

**Key Capabilities:**

- Generate blogs in one click with real-time progress tracking
- Use free tier (3 blogs) or bring your own Gemini API key
- Download generated content in multiple formats
- Manage all blogs in a user-friendly dashboard
- Secure authentication via Google OAuth

---

## ✨ Features

- **AI-Powered Generation**: Multi-stage pipeline for research, writing, and refinement
- **Google OAuth Integration**: Secure, one-click authentication
- **Free + Premium Tiers**: 3 free generations, or use your own API key
- **Blog Management**: View, edit, and organize your generated content
- **Image Integration**: Automatic image selection via Cloudinary
- **Responsive Design**: Works seamlessly on desktop and mobile

---

## 🛠 Tech Stack

### Backend

- **FastAPI** - High-performance Python web framework
- **LangGraph** - Multi-agent orchestration
- **OpenAI API** - LLM backbone
- **SQLAlchemy** - Database ORM
- **Uvicorn** - ASGI server
- **PostgreSQL/SQLite** - Data persistence

### Frontend

- **React 18** - UI framework
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Context** - State management

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 16+
- Git

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with required keys
cat > .env << EOF
DATABASE_URL=sqlite:///./blog.db
SECRET_KEY=your-secret-key
GOOGLE_API_KEY=sk-...
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
EOF

# Run server
uvicorn app.main:app --reload
```

Backend will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
EOF

# Start dev server
npm run dev
```

Frontend will be available at `http://localhost:5173`

---

## 💻 How to Use

1. **Sign In**: Use Google OAuth to authenticate
2. **Generate Blog**:
   - Enter a topic
   - Choose free generation OR provide your OpenAI key
   - Click "Generate Blog"
3. **Monitor Progress**: Watch real-time pipeline execution
4. **Download & Edit**: Customize content and export to various formats
5. **Manage**: Access all blogs from "My Blogs" page

---

## 🏃 Common Commands

```bash
# Backend - Run with auto-reload
cd backend && source venv/bin/activate
uvicorn app.main:app --reload

# Frontend - Start dev server
cd frontend && npm run dev

# Frontend - Build for production
cd frontend && npm run build
```

---

## 📋 Environment Variables

| Variable                | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `DATABASE_URL`          | Database connection string (PostgreSQL or SQLite) |
| `SECRET_KEY`            | JWT signing secret (generate a random string)     |
| `GOOGLE_API_KEY`        | GOOGLE API key for LLM access                     |
| `GOOGLE_CLIENT_ID`      | Google OAuth client ID                            |
| `GOOGLE_CLIENT_SECRET`  | Google OAuth client secret                        |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name                           |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                                |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret                             |

---

## 🔍 Key Features Explained

**Blog Generation Pipeline:**

- Research phase: Gathers contextual information
- Writing phase: Generates initial content
- Refinement phase: Enhances and polishes the blog

**Free vs Premium:**

- Free tier: 3 blogs, uses shared API quota
- Premium: Unlimited generation using your own Gemini key

**Download Formats:**

- Multiple export options for download and publishing

---

**Built with ❤️ by Sidhant Naik**
