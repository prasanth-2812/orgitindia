# ORGIT - Complete Codebase Analysis

## Executive Summary

**ORGIT** is a comprehensive enterprise communication and task management platform designed for internal organizational use. It provides real-time messaging, task management, document handling, and compliance tracking capabilities across mobile (React Native) and web (React) platforms.

**Project Type:** Full-Stack Enterprise Application  
**Architecture:** Monorepo with separate frontend (web/mobile) and backend  
**Database:** PostgreSQL  
**Real-time:** Socket.io  
**Deployment Status:** Development/Production Ready

---

## 1. Project Architecture

### 1.1 High-Level Structure

```
orgitindia/
├── backend/          # Node.js/Express TypeScript API Server
├── web/              # React TypeScript Web Application
├── mobile/           # React Native (Expo) Mobile Application
├── stitch_*/         # UI Mockups/Design References
└── *.sql            # Database Schema Scripts
```

### 1.2 Technology Stack

#### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (pg driver)
- **Real-time:** Socket.io v4.6.1
- **Authentication:** JWT (jsonwebtoken)
- **File Storage:** AWS S3 (aws-sdk v2)
- **PDF Generation:** Puppeteer
- **Scheduling:** node-cron
- **Validation:** express-validator
- **Security:** Helmet, bcryptjs
- **Logging:** Winston, Morgan

#### Web Frontend
- **Framework:** React 18.2.0
- **Language:** TypeScript 5.3.3
- **Build Tool:** Vite 5.0.8
- **Routing:** React Router DOM 6.21.1
- **State Management:** Zustand 4.4.7
- **Data Fetching:** React Query 3.39.3
- **Forms:** React Hook Form 7.49.2 + Zod 3.22.4
- **Styling:** Tailwind CSS 3.4.0
- **Drag & Drop:** @dnd-kit
- **Real-time:** Socket.io Client 4.6.1

#### Mobile Frontend
- **Framework:** React Native 0.81.5
- **Platform:** Expo ~54.0.0
- **Navigation:** React Navigation 6.x
- **State Management:** Context API
- **Real-time:** Socket.io Client 4.6.1
- **Media:** Expo Camera, Image Picker, Document Picker, AV
- **Storage:** AsyncStorage
- **Contacts:** Expo Contacts

---

## 2. Database Schema

### 2.1 Core Tables (29 Total)

#### User & Organization Management
- **organizations** - Company/org details (name, logo, GST, PAN, CIN, etc.)
- **users** - User accounts (mobile, name, role, status, profile)
- **user_organizations** - Many-to-many user-org relationship (department, designation, reporting_to)
- **sessions** - Active user sessions (device tracking, token management)
- **contacts** - User's phone contacts (synced from mobile)

#### Messaging System
- **conversations** - Chat conversations (direct/group/task-group)
- **conversation_members** - Conversation participants
- **messages** - All message types (text, image, video, audio, document, location, voice_note)
- **message_status** - Message delivery/read status per user
- **message_reactions** - Message reactions/emojis
- **starred_messages** - User's starred messages

#### Task Management
- **tasks** - Task definitions (one-time/recurring, dates, category, compliance link)
- **task_assignments** - Task assignments (assigned_to, assigned_by, status)
- **task_assignees** - Task assignee tracking
- **task_activities** - Task activity log
- **task_status_logs** - Task status change history

#### Document Management
- **document_templates** - Reusable document templates (invoice, contract, etc.)
- **document_template_versions** - Template versioning
- **documents** - Created documents from templates
- **document_versions** - Document version history
- **document_instances** - Document instances (filled templates)

#### Compliance
- **compliance_master** - Compliance requirements/regulations
- **compliance_documents** - Compliance document tracking

#### System
- **groups** - Chat groups (regular or task-specific)
- **group_members** - Group membership
- **notifications** - System notifications
- **otp_verifications** - OTP verification records
- **profiles** - Extended user profiles
- **platform_settings** - System-wide configuration

### 2.2 Key Relationships

```
organizations (1) ──< (N) user_organizations (N) >── (1) users
users (1) ──< (N) conversations (N) >── (1) users (via conversation_members)
conversations (1) ──< (N) messages
tasks (1) ──< (N) task_assignments (N) >── (1) users
tasks (1) ──< (1) groups (task_group)
document_templates (1) ──< (N) documents
```

### 2.3 Indexes
- Comprehensive indexing on foreign keys, status fields, and frequently queried columns
- Indexes on `created_at` for time-based queries
- Composite indexes where needed

---

## 3. Backend Architecture

### 3.1 Project Structure

```
backend/
├── src/
│   ├── index.ts                    # Main entry point (TypeScript)
│   ├── config/
│   │   └── database.ts             # PostgreSQL connection pool
│   ├── controllers/                # 19 controllers (business logic)
│   ├── services/                   # 28 services (data access & business logic)
│   ├── routes/                     # 19 route files (API endpoints)
│   ├── middleware/                 # Auth, admin, super_admin middleware
│   ├── socket/                     # Socket.io message handlers
│   ├── jobs/                       # Scheduled tasks (cron jobs)
│   └── utils/                      # JWT, password hashing utilities
├── routes/                         # Legacy JavaScript routes
├── middleware/                     # Legacy JavaScript middleware
├── socket/                         # Legacy JavaScript socket handler
├── server.js                       # Legacy JavaScript entry point
└── package.json
```

### 3.2 API Architecture Pattern

**Layered Architecture:**
1. **Routes Layer** (`routes/*.ts`) - HTTP endpoint definitions, request validation
2. **Controller Layer** (`controllers/*.ts`) - Request/response handling, business logic orchestration
3. **Service Layer** (`services/*.ts`) - Core business logic, database operations
4. **Database Layer** (`config/database.ts`) - PostgreSQL connection pool

### 3.3 Key Services

#### Authentication & User Management
- **authController** - Login, registration, OTP verification, profile creation
- **userService** - User CRUD, profile management
- **otpService** - OTP generation and verification
- **contactSyncService** - Mobile contact synchronization

#### Messaging
- **messageService** - Message CRUD, status updates, media handling
- **conversationService** - Conversation management, member management
- **groupService** - Group creation, member management

#### Task Management
- **taskService** - Task CRUD, assignment, status updates
- **recurringTaskService** - Recurring task generation
- **taskMonitoringService** - Task monitoring and reporting
- **escalationService** - Auto-escalation logic
- **taskMentionService** - Task mentions in messages

#### Document Management
- **documentTemplateService** - Template CRUD, versioning
- **documentService** - Document creation from templates
- **documentInstanceService** - Filled document instances
- **pdfGenerationService** - PDF generation from templates
- **builderRendererService** - Document builder rendering

#### Compliance
- **complianceService** - Compliance requirement management
- **complianceDocumentService** - Compliance document tracking

#### System
- **notificationService** - System notifications
- **platformSettingsService** - Platform-wide settings
- **organizationService** - Organization management
- **superAdminDashboardService** - Super admin analytics
- **dashboardService** - Employee dashboard data
- **mediaUploadService** - File upload to S3

### 3.4 Authentication & Authorization

#### Authentication Flow
1. **Mobile Registration:**
   - User provides mobile number
   - OTP sent via SMS/Service
   - OTP verification
   - Profile creation
   - JWT token generation

2. **Session Management:**
   - JWT tokens stored in `sessions` table
   - Device tracking (mobile/web)
   - Token expiration handling
   - Refresh token support

#### Authorization Levels
- **super_admin** - Platform-wide access, org management
- **admin** - Organization-level access, user/task/document management
- **employee** - Standard user access, own tasks/messages

#### Middleware
- `authenticate` - JWT verification, session validation
- `authorize(...roles)` - Role-based access control
- `adminMiddleware` - Admin-only routes
- `superAdminMiddleware` - Super admin-only routes

### 3.5 Real-time Communication (Socket.io)

#### Socket Architecture
- **Authentication:** Token-based via `socket.handshake.auth.token`
- **Room Management:**
  - `user_${userId}` - Personal user room
  - `conversation_${conversationId}` - Conversation rooms
  - Auto-join on message send

#### Key Socket Events

**Client → Server:**
- `send_message` - Send new message
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room
- `mark_messages_read` - Mark messages as read
- `check_user_online` - Check user online status
- `typing_start` / `typing_stop` - Typing indicators

**Server → Client:**
- `new_message` - New message received
- `message_status_update` - Message status change (sent/delivered/read)
- `user_online` / `user_offline` - User presence updates
- `user_online_status` - Online status response
- `message_typing` - Typing indicator

#### Message Status Flow
1. **Sent** - Message created, single tick (✓)
2. **Delivered** - Recipient online, double tick (✓✓)
3. **Read** - Recipient opened conversation, blue double tick (✓✓)

### 3.6 Scheduled Jobs (Cron)

**Location:** `backend/src/jobs/taskJobs.ts`

**Jobs:**
1. **Hourly Job** (`0 * * * *`):
   - Update task statuses (overdue)
   - Escalate unaccepted tasks
   - Escalate overdue tasks
   - Escalate missed recurrences

2. **Daily Job** (`0 0 * * *`):
   - Generate next recurrence for recurring tasks

### 3.7 File Upload & Storage

- **Service:** `mediaUploadService.ts`
- **Storage:** AWS S3
- **Supported Types:** Images, videos, audio, documents, PDFs
- **Local Storage:** `/uploads` directory for development
- **File Size Limits:** 50MB (configured in Express)

---

## 4. Web Application Architecture

### 4.1 Project Structure

```
web/src/
├── main.tsx                        # Entry point
├── App.tsx                         # Root component, routing
├── components/
│   ├── admin/                      # Admin-specific components
│   ├── super-admin/                # Super admin components
│   ├── document-builder/           # Document template builder
│   ├── messaging/                  # Message components
│   ├── tasks/                      # Task components
│   └── shared/                     # Reusable components
├── screens/
│   ├── auth/                       # Authentication screens
│   ├── dashboard/                  # Employee dashboard
│   ├── messaging/                  # Chat screens
│   ├── tasks/                      # Task management screens
│   ├── documents/                  # Document screens
│   ├── compliance/                 # Compliance screens
│   ├── admin/                      # Admin screens
│   └── super-admin/                # Super admin screens
├── services/                       # API service layer
├── context/                        # React Context (Auth)
└── constants/                      # Constants (country codes, etc.)
```

### 4.2 Routing Structure

**Public Routes:**
- `/login` - Login screen
- `/register` - Mobile number registration
- `/otp-verification` - OTP verification
- `/profile-setup` - User profile creation

**Protected Employee Routes:**
- `/dashboard` - Employee dashboard
- `/messages` - Main messaging screen
- `/messages/new` - New chat screen
- `/messages/:conversationId` - Direct chat
- `/messages/task-group/:conversationId` - Task group chat
- `/tasks` - Task dashboard
- `/tasks/create` - Create task
- `/tasks/:taskId` - Task details
- `/documents` - Document management
- `/compliance` - Compliance management
- `/settings` - Admin settings

**Super Admin Routes:**
- `/super-admin` - Super admin dashboard
- `/super-admin/organizations` - Organization management
- `/super-admin/users` - User management
- `/super-admin/document-templates` - Template management
- `/super-admin/compliance` - Compliance management
- `/super-admin/tasks` - Task monitoring
- `/super-admin/settings` - Platform settings

**Admin Routes:**
- `/admin` - Admin dashboard
- `/admin/tasks` - Task management
- `/admin/documents` - Document library
- `/admin/compliance` - Compliance management
- `/admin/users` - User management
- `/admin/entity-master` - Entity master data
- `/admin/configuration/*` - Configuration screens

### 4.3 Key Features

#### Document Template Builder
- **Visual Builder:** Drag-and-drop section builder
- **Section Types:** Text, Table, Key-Value, Signature, Amount Summary
- **Live Preview:** Real-time preview of document
- **Template Versioning:** Version control for templates
- **PDF Generation:** Export templates to PDF
- **Fill Mode:** Fill templates with data to create document instances

#### Messaging Interface
- **Message Types:** Text, Image, Video, Audio, Document, Location, Voice Note
- **Features:** Reply, Forward, Edit, Delete, Pin, Star
- **Real-time:** Socket.io integration for instant messaging
- **Status Indicators:** Sent, Delivered, Read indicators
- **Mentions:** User and task mentions
- **Reactions:** Message reactions/emojis

#### Task Management
- **Task Types:** One-time, Recurring
- **Recurrence:** Daily, Weekly, Monthly, Yearly
- **Status Tracking:** Pending, Accepted, In Progress, Completed, Rejected, Overdue
- **Auto-escalation:** Configurable escalation rules
- **Task Groups:** Automatic group creation for task communication

### 4.4 State Management

- **React Query:** Server state, caching, refetching
- **Zustand:** Client-side global state (if needed)
- **Context API:** Authentication state
- **React Hook Form:** Form state management

---

## 5. Mobile Application Architecture

### 5.1 Project Structure

```
mobile/
├── App.js                           # Root component, navigation
├── screens/                         # 14 screen components
├── services/                        # API service layer
├── context/                         # Auth & Notification contexts
└── config.js                        # API configuration
```

### 5.2 Navigation Structure

**Tab Navigator (Bottom Tabs):**
1. **Dashboard Tab** - Employee dashboard
2. **Chat Tab** - Conversations & chat
3. **Task Tab** - Task management
4. **Document Tab** - Document management
5. **Compliance Tab** - Compliance management
6. **Settings Tab** - Settings

**Stack Navigators:**
- **Auth Stack:** Login, Register
- **Chat Stack:** Conversations, Chat, NewChat, Profile, UserProfile, TaskDetail
- **Task Stack:** TaskDashboard, TaskCreate, TaskDetail, TaskChat

### 5.3 Key Screens

- **LoginScreen** - Mobile number + OTP login
- **RegisterScreen** - Mobile number registration
- **ConversationsScreen** - List of conversations
- **ChatScreen** - Individual chat interface
- **NewChatScreen** - Start new conversation
- **TaskDashboardScreen** - Task list and management
- **TaskCreateScreen** - Create new task
- **TaskDetailScreen** - Task details and actions
- **DashboardScreen** - Employee dashboard
- **DocumentScreen** - Document management
- **ComplianceScreen** - Compliance management
- **SettingsScreen** - User settings
- **ProfileScreen** - User profile
- **UserProfileScreen** - View other user profiles

### 5.4 Mobile-Specific Features

- **Contact Sync:** Sync phone contacts, identify registered users
- **Media Capture:** Camera, image picker, document picker
- **Location Sharing:** GPS location sharing
- **Voice Notes:** Audio recording and playback
- **Push Notifications:** (Via NotificationContext)
- **Offline Support:** AsyncStorage for local data

---

## 6. Key Features & Modules

### 6.1 Authentication & User Management

**Features:**
- Mobile number-based registration
- OTP verification
- JWT-based authentication
- Multi-device session management
- Profile management
- Contact synchronization

**User Roles:**
- **super_admin:** Platform administrator
- **admin:** Organization administrator
- **employee:** Standard user

### 6.2 Real-time Messaging

**Features:**
- One-to-one messaging
- Group messaging
- Task group messaging
- Message types: Text, Image, Video, Audio, Document, Location, Voice Note
- Message visibility modes: Org-Only, Shared-to-Group
- Read receipts (sent/delivered/read)
- Message reactions
- Reply, forward, edit, delete
- Pin and star messages
- User and task mentions
- Typing indicators
- Online/offline status

**Recent Fixes (from CRITICAL_FIXES_SUMMARY.md):**
- ✅ Real-time message delivery
- ✅ Online status detection
- ✅ Message status indicators

### 6.3 Task Management

**Features:**
- One-time tasks
- Recurring tasks (Daily, Weekly, Monthly, Yearly)
- Task assignment workflow (Pending → Accepted/Rejected → In Progress → Completed)
- Task categories
- Due date tracking
- Auto-escalation rules
- Task status logging
- Task group chat (automatic)
- Task mentions in messages
- Task monitoring (super admin)

**Task Statuses:**
- `pending` - Awaiting acceptance
- `accepted` - Accepted by assignee
- `rejected` - Rejected by assignee
- `in_progress` - Work in progress
- `completed` - Task completed
- `overdue` - Past due date
- `cancelled` - Task cancelled

**Auto-escalation:**
- Escalate unaccepted tasks (configurable hours)
- Escalate overdue tasks (configurable days)
- Escalate missed recurrences

### 6.4 Document Management

**Features:**
- Document template builder (visual)
- Template versioning
- Document creation from templates
- Document instances (filled templates)
- PDF generation
- Document library
- Document sharing

**Template Builder:**
- Drag-and-drop sections
- Section types: Text, Table, Key-Value, Signature, Amount Summary
- Header/Footer configuration
- Live preview
- Template metadata (name, type, status, description)

### 6.5 Compliance Management

**Features:**
- Compliance requirement tracking
- Compliance document management
- Task-compliance linking
- Compliance status tracking

### 6.6 Dashboard & Analytics

**Employee Dashboard:**
- Self tasks (created by user)
- Assigned tasks (assigned to user)
- Task status breakdown
- Document management section
- Compliance management section

**Super Admin Dashboard:**
- Organization overview
- User statistics
- Task monitoring
- System-wide analytics

**Admin Dashboard:**
- Organization-specific analytics
- User management
- Task oversight
- Document management

### 6.7 Notifications

**Types:**
- Task assigned
- Task status updates
- Message notifications
- System notifications

**Delivery:**
- In-app notifications
- Real-time via Socket.io
- Notification counts per category

---

## 7. Security Features

### 7.1 Authentication Security
- JWT token-based authentication
- Session management with expiration
- Password hashing (bcryptjs)
- OTP verification for registration
- Device tracking

### 7.2 Authorization
- Role-based access control (RBAC)
- Route-level protection
- API endpoint authorization
- Organization-level data isolation

### 7.3 Data Security
- SQL injection prevention (parameterized queries)
- XSS protection (Helmet)
- CORS configuration
- File upload validation
- Input validation (express-validator)

### 7.4 API Security
- Bearer token authentication
- Session validation
- Rate limiting (via middleware)
- Request size limits

---

## 8. Code Quality & Patterns

### 8.1 Code Organization

**Strengths:**
- Clear separation of concerns (Routes → Controllers → Services)
- TypeScript for type safety
- Consistent naming conventions
- Modular service architecture
- Reusable utility functions

**Areas for Improvement:**
- Dual codebase (TypeScript + legacy JavaScript)
- Some code duplication between web/mobile services
- Missing comprehensive error handling in some areas
- Limited test coverage (only 2 test files found)

### 8.2 Design Patterns

- **Repository Pattern:** Service layer abstracts database access
- **Middleware Pattern:** Express middleware for auth/authorization
- **Factory Pattern:** Service creation patterns
- **Observer Pattern:** Socket.io event handling
- **Strategy Pattern:** Different handlers for different message types

### 8.3 Error Handling

- Try-catch blocks in async functions
- Express error middleware
- Database error handling
- Socket error handling
- Client-side error boundaries (React)

### 8.4 Testing

**Current State:**
- Jest configured
- 2 test files found:
  - `backend/src/services/__tests__/otpService.test.ts`
  - `backend/src/services/__tests__/taskService.test.ts`

**Recommendations:**
- Expand test coverage
- Add integration tests
- Add E2E tests for critical flows

---

## 9. Known Issues & Fixes

### 9.1 Recent Fixes (from CRITICAL_FIXES_SUMMARY.md)

**✅ Fixed: Real-time Message Delivery**
- Issue: Messages only appeared on reload
- Fix: Auto-join conversation rooms, emit to both conversation and user rooms

**✅ Fixed: Online Status**
- Issue: Users showed as offline when online
- Fix: Global broadcast for online/offline events, periodic status checks

**✅ Fixed: Message Status Indicators**
- Issue: Only single tick showing, no delivered/read indicators
- Fix: Enhanced status update emission, proper status handling in client

### 9.2 Technical Debt

1. **Dual Codebase:**
   - TypeScript (`backend/src/`) and JavaScript (`backend/routes/`, `backend/server.js`)
   - Recommendation: Migrate all JavaScript to TypeScript

2. **Legacy Routes:**
   - Old JavaScript routes still present
   - Recommendation: Remove or migrate to TypeScript routes

3. **Test Coverage:**
   - Limited test coverage
   - Recommendation: Add comprehensive test suite

4. **Error Handling:**
   - Some areas lack comprehensive error handling
   - Recommendation: Standardize error handling patterns

---

## 10. Deployment & Configuration

### 10.1 Environment Variables

**Backend Required:**
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `PORT` (default: 3000)
- `NODE_ENV`
- `SOCKET_CORS_ORIGIN`
- AWS S3 credentials (if using S3)
- OTP service credentials

**Web Required:**
- `VITE_API_URL` (backend API URL)

**Mobile Required:**
- API base URL in `config.js`

### 10.2 Database Setup

1. Create PostgreSQL database
2. Run `setup-all-tables-database.sql`
3. Configure connection in `.env`

### 10.3 Build & Run

**Backend:**
```bash
cd backend
npm install
npm run dev        # Development
npm run build      # Build
npm start          # Production
```

**Web:**
```bash
cd web
npm install
npm run dev        # Development
npm run build      # Production build
```

**Mobile:**
```bash
cd mobile
npm install
npm start          # Expo dev server
```

---

## 11. Recommendations

### 11.1 Immediate Improvements

1. **Migrate Legacy Code:**
   - Convert all JavaScript routes to TypeScript
   - Remove duplicate `server.js` if `index.ts` is primary

2. **Testing:**
   - Add unit tests for all services
   - Add integration tests for API endpoints
   - Add E2E tests for critical user flows

3. **Error Handling:**
   - Standardize error response format
   - Add comprehensive error logging
   - Implement error boundaries in React

4. **Documentation:**
   - API documentation (Swagger/OpenAPI)
   - Component documentation
   - Deployment guides

### 11.2 Long-term Enhancements

1. **Performance:**
   - Implement Redis for caching
   - Database query optimization
   - Image optimization and CDN

2. **Scalability:**
   - Horizontal scaling support
   - Load balancing
   - Database connection pooling optimization

3. **Features:**
   - Push notifications (FCM/APNS)
   - Advanced search
   - File versioning
   - Audit logging

4. **Monitoring:**
   - Application performance monitoring (APM)
   - Error tracking (Sentry)
   - Analytics dashboard

---

## 12. File Count Summary

- **Backend Controllers:** 19
- **Backend Services:** 28
- **Backend Routes:** 19
- **Web Screens:** ~30+
- **Web Components:** ~50+
- **Mobile Screens:** 14
- **Database Tables:** 29
- **Total TypeScript Files:** ~150+
- **Total JavaScript Files:** ~40+

---

## 13. Conclusion

ORGIT is a well-architected enterprise communication and task management platform with:

✅ **Strengths:**
- Comprehensive feature set
- Real-time messaging capabilities
- Multi-platform support (web + mobile)
- Role-based access control
- Document template builder
- Task automation and escalation

⚠️ **Areas for Improvement:**
- Code consolidation (TypeScript migration)
- Test coverage expansion
- Documentation enhancement
- Performance optimization

The codebase demonstrates good separation of concerns, modern technology choices, and a scalable architecture suitable for enterprise deployment.

---

**Analysis Date:** 2024  
**Codebase Version:** Current  
**Total Lines of Code:** ~50,000+ (estimated)

