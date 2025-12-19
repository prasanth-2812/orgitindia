# ORGIT - Internal Communication & Task Management Platform

A comprehensive role-based mobile and web application for enhancing internal communication, automating task assignments, managing documents, and facilitating real-time messaging.

## Architecture

- **Mobile App**: React Native (iOS/Android)
- **Web App**: React (TypeScript)
- **Backend API**: Node.js/Express (TypeScript)
- **Database**: PostgreSQL
- **Real-time**: Socket.io
- **File Storage**: AWS S3

## Project Structure

```
orgit22/
├── mobile/          # React Native mobile app
├── web/             # React web application
├── backend/         # Node.js/Express API server
├── shared/          # Shared types and utilities
└── database/        # Database migrations and schemas
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14.0
- AWS Account (for S3 file storage)

### Installation

1. Install all dependencies:
```bash
npm run install:all
```

2. Set up environment variables:
- Copy `.env.example` files in each subdirectory
- Configure database, JWT secrets, OTP service, and AWS credentials

3. Run database migrations:
```bash
cd backend
npm run migrate
```

4. Start development servers:
```bash
# Backend API
npm run dev:backend

# Web app (in another terminal)
npm run dev:web

# Mobile app (in another terminal)
npm run dev:mobile
```

## Features

### Core Modules

1. **User Authentication & Profile**
   - Mobile number registration with OTP verification
   - Contact synchronization
   - Profile management

2. **Messaging System**
   - One-to-one and group messaging
   - Message visibility modes (Org-Only, Shared-to-Group)
   - Real-time delivery with read receipts
   - Media support (images, videos, documents, audio, location)
   - User and task mentions

3. **Task Management**
   - One-Time and Recurring tasks
   - Task assignment and acceptance/rejection workflow
   - Auto-escalation rules
   - Task status tracking

4. **Dashboard**
   - Self Tasks and Assigned Tasks
   - Status-based categorization
   - Document Management and Compliance Management sections

## License

Private - All rights reserved

