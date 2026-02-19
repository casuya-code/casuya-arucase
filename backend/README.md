# Arusha Catholic Seminary - Node.js/Express Backend API

Complete Node.js backend for the School Management System.

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (Railway)
- **Authentication**: JWT
- **Real-time**: Socket.IO
- **File Upload**: Multer

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env file with your configuration
```

### Development

```bash
# Start development server with nodemon
npm run dev

# Or start normally
npm start
```

## Environment Variables

See `.env.example` for required environment variables.

Railway automatically provides PostgreSQL connection via:
- `DATABASE_URL`
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Public
- `GET /api/public/homepage` - Homepage data
- `GET /api/public/announcements` - Get announcements
- `GET /api/public/events` - Get events
- `GET /api/public/gallery` - Get gallery photos
- `GET /api/public/alumni` - Get alumni
- `GET /api/public/mass-reading` - Get mass reading
- `GET /api/public/faqs` - Get FAQs
- `POST /api/public/testimony` - Submit testimony
- `POST /api/public/donation` - Submit donation

### Admin (Protected)
- `GET /api/admin/users` - Get all users
- More admin endpoints...

### Students (Protected)
- `GET /api/students` - Get students
- More student endpoints...

## Deployment

This backend is designed to be deployed on Railway. See `railway.json` for configuration.

## Project Structure

```
backend/
├── config/          # Configuration files
├── middleware/      # Express middleware
├── routes/          # API routes
├── utils/           # Utility functions
├── server.js        # Main entry point
└── package.json     # Dependencies
```

