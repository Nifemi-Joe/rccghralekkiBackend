# ChurchPlus Backend API

Enterprise-grade Node.js backend for ChurchPlus Church Management System.

## 🏗️ Architecture

This backend follows clean architecture principles with clear separation of concerns:

```
src/
├── controllers/     # Handle HTTP requests/responses
├── services/        # Business logic layer
├── repositories/    # Data access layer
├── middleware/      # Express middleware
├── routes/          # API route definitions
├── validators/      # Request validation schemas
├── types/           # TypeScript type definitions
├── config/          # Configuration files
└── utils/           # Utility functions
```

### Design Patterns

- **Controller-Service-Repository Pattern**: Clean separation between request handling, business logic, and data access
- **Dependency Injection**: Services and repositories are injected into controllers
- **Error Handling**: Centralized error handling with custom AppError class
- **Validation**: Request validation using Joi schemas
- **Authentication**: JWT-based authentication with refresh tokens
- **Logging**: Winston logger for structured logging

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 13
- npm or yarn

### Installation

```bash
cd backend
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Database Setup

Create your PostgreSQL database and run migrations:

```bash
npm run migrate
```

### Development

```bash
npm run dev
```

Server will start on `http://localhost:5000`

### Production Build

```bash
npm run build
npm start
```

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api/v1
```

### Authentication

All protected endpoints require a Bearer token:

```
Authorization: Bearer <your_jwt_token>
```

### Endpoints

#### Auth
- `POST /auth/register` - Register new church admin
- `POST /auth/login` - Login user
- `POST /auth/verify-email` - Verify email address
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user

#### Churches
- `GET /churches/:id` - Get church details
- `PUT /churches/:id` - Update church settings
- `PUT /churches/:id/location` - Update church location for notifications

#### Members
- `GET /members` - Get all members (with pagination & filters)
- `GET /members/:id` - Get member by ID
- `POST /members` - Create new member
- `PUT /members/:id` - Update member
- `DELETE /members/:id` - Soft delete member
- `GET /members/:id/attendance` - Get member attendance history
- `GET /members/statistics` - Get member statistics
- `POST /members/qr-register` - Register member via QR code

#### Groups
- `GET /groups` - Get all groups
- `GET /groups/:id` - Get group by ID
- `POST /groups` - Create group
- `PUT /groups/:id` - Update group
- `DELETE /groups/:id` - Delete group
- `GET /groups/:id/members` - Get group members
- `POST /groups/:id/members` - Add member to group
- `DELETE /groups/:id/members/:memberId` - Remove member from group
- `GET /groups/types` - Get group types
- `POST /groups/types` - Create group type

#### Events
- `GET /events` - Get all events (with filters)
- `GET /events/:id` - Get event by ID
- `POST /events` - Create event (supports paid events, groups, banners)
- `PUT /events/:id` - Update event
- `DELETE /events/:id` - Delete event
- `GET /events/:id/qr` - Get event QR code
- `GET /events/:id/instances` - Get event instances
- `POST /events/:id/instances` - Create event instance
- `POST /events/:id/start` - Start new event instance for today

#### Attendance
- `POST /attendance/qr-checkin` - Check in via QR code scan
- `POST /attendance/checkin` - Manual check-in
- `POST /attendance/bulk-checkin` - Bulk check-in multiple members
- `POST /attendance/checkout` - Check out member
- `GET /attendance/event/:instanceId` - Get attendance for event instance
- `GET /attendance/inactive-members` - Get inactive members report

#### Financials
- `GET /financials/accounts` - Get all accounts (charts of accounts)
- `GET /financials/accounts/:id` - Get account by ID
- `POST /financials/accounts` - Create account
- `PUT /financials/accounts/:id` - Update account
- `POST /financials/offering` - Record offering
- `POST /financials/tithe` - Record tithe (requires member_id)
- `POST /financials/donation` - Record donation
- `POST /financials/expense` - Record expense
- `GET /financials/transactions` - Get all transactions (with filters)
- `GET /financials/summary` - Get financial summary
- `GET /financials/expense-categories` - Get expense categories
- `POST /financials/expense-categories` - Create expense category

#### Service Reports
- `GET /service-reports` - Get all service reports
- `GET /service-reports/:id` - Get service report by ID
- `POST /service-reports` - Create service report
- `PUT /service-reports/:id` - Update service report
- `DELETE /service-reports/:id` - Delete service report
- `GET /service-reports/summary` - Get service report summary

#### Reports
- `GET /reports/attendance-trends` - Attendance trends report
- `GET /reports/member-growth` - Member growth report
- `GET /reports/first-timer-conversion` - First-timer conversion report
- `GET /reports/financial-summary` - Financial summary report
- `GET /reports/inactive-members` - Inactive members report
- `GET /reports/event-performance` - Event performance report
- `GET /reports/family-attendance` - Family attendance report
- `GET /reports/dashboard` - Dashboard statistics

## 🔒 Security Features

- **Helmet**: Security headers
- **Rate Limiting**: Prevent abuse
- **CORS**: Configurable origins
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: Bcrypt with salt rounds
- **Input Validation**: Joi schema validation
- **SQL Injection Prevention**: Parameterized queries

## 📊 Logging

Winston logger with multiple transports:
- Console (development)
- File rotation (production)
- Error-specific logs

## 🧪 Testing

```bash
npm test
```

## 🚢 Deployment to Render

### Prerequisites
1. Create a Render account
2. Create a PostgreSQL database on Render

### Steps

1. **Connect Repository**
   - Go to Render dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub/GitLab repository

2. **Configure Service**
   - Name: `churchplus-backend`
   - Environment: `Node`
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm start`
   - Root Directory: Leave empty (or `/` if needed)

3. **Environment Variables**
   Add all variables from `.env.example`:
   - NODE_ENV=production
   - PORT=10000 (Render default)
   - DATABASE_URL (from Render PostgreSQL)
   - JWT_SECRET
   - All other required variables

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy

### Post-Deployment

1. Run migrations:
   ```bash
   # In Render shell
   npm run migrate
   ```

2. Test API:
   ```bash
   curl https://your-app.onrender.com/health
   ```

## 📝 Code Style

- ESLint for code quality
- TypeScript strict mode
- Consistent naming conventions
- Comprehensive error handling

## 🤝 Contributing

1. Follow the established architecture
2. Write tests for new features
3. Update documentation
4. Use meaningful commit messages

## 📄 License

MIT
