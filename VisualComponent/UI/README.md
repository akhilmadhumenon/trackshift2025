# F1 Tyre Visual Difference Engine

Real-time web dashboard for F1 pit stop inspection teams to analyze tyre quality through computer vision and 3D reconstruction.

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Three.js + React Three Fiber
- TailwindCSS (Ferrari theme)
- Zustand (state management)
- Socket.io-client

### Backend
- Node.js + Express + TypeScript
- Socket.io
- Multer (file uploads)

### Python Service
- FastAPI
- OpenCV
- NumPy
- TripoSR (3D reconstruction)

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose (optional)

### Local Development

#### 1. Install Frontend Dependencies
```bash
npm install
```

#### 2. Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

#### 3. Install Python Dependencies
```bash
cd python-service
pip install -r requirements.txt
cd ..
```

#### 4. Set up Environment Variables
```bash
# Backend
cp backend/.env.example backend/.env

# Python Service
cp python-service/.env.example python-service/.env
```

#### 5. Run Services

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
npm run backend
```

**Terminal 3 - Python Service:**
```bash
cd python-service
python main.py
```

### Docker Development

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down
```

## Project Structure

```
f1-tyre-visual-difference-engine/
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── store/             # Zustand state management
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── backend/               # Node.js Express backend
│   └── src/
│       ├── routes/        # API routes
│       ├── services/      # Business logic
│       └── server.ts      # Entry point
├── python-service/        # FastAPI CV service
│   ├── main.py           # Entry point
│   ├── cv/               # Computer vision modules
│   └── models/           # ML models
└── docker-compose.yml    # Docker orchestration
```

## Ferrari Theme Colors

- Ferrari Red: `#FF1801`
- Black: `#000000`
- Soft White: `#F5F5F5`
- Graphite Grey: `#1A1A1A`

## Available Scripts

- `npm run dev` - Start frontend dev server
- `npm run build` - Build frontend for production
- `npm run backend` - Start backend dev server
- `npm run docker:up` - Start all services with Docker
- `npm run docker:down` - Stop Docker services

## License

MIT
