# Photo Portal

A full-stack web application for photographers to create, manage, and share private photo galleries with their clients. Built with modern technologies including Next.js, Express.js, Prisma, and PostgreSQL.

## 🚀 Features

### For Photographers
- **Gallery Management**: Create, edit, and organize photo galleries with timeline organization
- **Gallery Groups**: Group related galleries into events (e.g., weddings, functions) for better organization
- **Gallery Locking**: Lock galleries to prevent further edits or deletions while maintaining client access
- **Client Management**: Manage client relationships and access permissions
- **Photo Upload**: Batch upload high-resolution photos with automatic thumbnail generation and resumable uploads
- **Selection Analytics**: Track which photos clients liked, favorited, or selected for better insights
- **Client Feedback**: Request and collect structured feedback from clients with ratings and comments
- **Timeline Organization**: Organize galleries by shoot date with automatic year/month indexing
- **Advanced Analytics**: Track gallery views, downloads, photo selections, and client engagement
- **Customization**: Set gallery passwords, expiration dates, and download limits

### For Clients
- **Private Access**: Secure, password-protected gallery access
- **High-Quality Viewing**: Responsive gallery interface optimized for all devices
- **Download Options**: Server-side processed downloads with real-time progress tracking
  - Download all photos in a gallery
  - Download photos from specific folders
  - Download liked or favorited photos
  - Unified progress tracking across all download types
- **Social Features**: Like, favorite, and post photos and galleries
- **Feedback System**: Provide ratings and feedback on selection process and portal experience
- **Mobile Optimized**: Seamless experience across all devices

### For Administrators
- **Admin Dashboard**: Comprehensive system overview with real-time statistics
- **User Management**: Create, suspend, activate, and manage all users with role-based access control
- **Photographer Approval**: Review and approve photographer registration requests
- **Analytics Dashboard**: System-wide analytics including user activity, storage usage, and performance metrics
- **Security Monitoring**: Track security events, failed login attempts, and suspicious activities
- **System Alerts**: Automated alerts for storage limits, user thresholds, and security events
- **Audit Logging**: Complete audit trail of all admin actions with IP tracking
- **System Configuration**: Manage system-wide settings including user limits and storage quotas
- **Admin Invitations**: Invite new administrators with secure token-based activation
- **Session Management**: Monitor and manage admin sessions with CSRF protection
- **Export Capabilities**: Export analytics data in JSON and CSV formats

## 🏗️ Architecture

### Frontend (Next.js 15)
- **Framework**: Next.js 15 with App Router
- **UI Components**: Radix UI primitives with custom styling
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React hooks and context
- **Authentication**: JWT-based authentication system
- **Responsive Design**: Mobile-first approach with modern UI/UX

### Backend (Express.js)
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 5
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt password hashing, separate admin authentication with CSRF protection
- **File Storage**: AWS S3 and Backblaze B2 integration
- **Image Processing**: Sharp for thumbnail generation and optimization with EXIF data extraction
- **Download System**: Server-side zip creation with Archiver and S3 streaming
- **Security**: Helmet.js, CORS, rate limiting, CSRF protection for admin routes
- **Admin System**: Role-based access control, audit logging, session management
- **Analytics**: Comprehensive selection tracking, user analytics, and system monitoring
- **Scheduled Tasks**: Node-cron for automated maintenance and cleanup

### Database Schema
- **Users**: Photographers, clients, and administrators with role-based access and approval workflow
- **Galleries**: Photo collections with metadata, access controls, timeline organization, and locking
- **Gallery Groups**: Event-based grouping for organizing multiple related galleries
- **Folders**: Hierarchical folder structure within galleries
- **Photos**: Individual images with download tracking, EXIF capture dates, and selection tracking
- **Interactions**: Likes, favorites, posts, and access permissions
- **Relationships**: Photographer-client associations
- **Upload Sessions**: Resumable upload tracking with progress monitoring
- **Client Feedback**: Structured feedback collection with ratings
- **Admin System**: Audit logs, system configuration, session management, and admin invitations

## 🛠️ Tech Stack

### Frontend Dependencies
- **Core**: Next.js 16, React 19, TypeScript
- **UI Components**: Radix UI (comprehensive component library), Tailwind CSS v4
- **Forms**: React Hook Form with Zod validation
- **State Management**: React hooks, context, and TanStack Query
- **Animations**: Framer Motion
- **Icons**: Lucide React icons
- **Notifications**: Sonner for toast notifications
- **Theming**: next-themes for dark/light mode
- **Charts**: Recharts for analytics visualization
- **Date Handling**: date-fns, react-day-picker
- **Carousels**: embla-carousel-react
- **Utilities**: clsx, class-variance-authority, tailwind-merge
- **Fonts**: Geist font family
- **Other**: vaul (drawer component), input-otp, cmdk (command menu)

### Backend Dependencies
- **Core**: Express.js 5, Node.js, TypeScript
- **Database**: Prisma ORM, PostgreSQL
- **Authentication**: JWT, bcryptjs
- **File Handling**: Multer, Sharp, AWS SDK, Backblaze B2
- **Image Processing**: Sharp for thumbnails, exif-reader for EXIF data
- **Archive Creation**: Archiver for zip downloads
- **Security**: Helmet, CORS, Morgan logging
- **Storage**: AWS S3, Backblaze B2
- **Validation**: Zod for schema validation
- **Testing**: Jest, Supertest, ts-jest
- **Scheduling**: node-cron for automated tasks
- **Utilities**: uuid, axios, node-fetch
- **Reporting**: ExcelJS for data exports

## 📁 Project Structure

```
photo-portal/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App Router pages and layouts
│   │   │   ├── (auth)/      # Authentication routes
│   │   │   ├── (dashboard)/ # Dashboard routes
│   │   │   ├── admin/       # Admin dashboard routes
│   │   │   ├── galleries/   # Gallery viewing routes
│   │   │   └── gallery/     # Gallery management routes
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions and configurations
│   │   └── styles/         # Global styles and CSS
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── backend/                 # Express.js backend API
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   │   ├── adminAuthController.ts
│   │   │   ├── adminUserController.ts
│   │   │   ├── adminAnalyticsController.ts
│   │   │   ├── galleryGroupController.ts
│   │   │   ├── feedbackController.ts
│   │   │   ├── selectionAnalyticsController.ts
│   │   │   └── ... (other controllers)
│   │   ├── middleware/     # Custom middleware
│   │   │   ├── adminAuth.ts        # Admin authentication
│   │   │   ├── csrf.ts             # CSRF protection
│   │   │   ├── rateLimiter.ts      # Rate limiting
│   │   │   ├── auditMiddleware.ts  # Audit logging
│   │   │   └── auth.ts             # User authentication
│   │   ├── routes/         # API route definitions
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   ├── tests/          # Test files
│   │   └── server.ts       # Main server file
│   ├── prisma/             # Database schema and migrations
│   │   ├── schema.prisma   # Prisma schema
│   │   └── migrations/     # Database migrations
│   ├── scripts/            # Utility scripts
│   │   └── backfill-exif-dates.ts
│   └── package.json        # Backend dependencies
├── nginx/                   # Nginx configuration
├── docker-compose.yml       # Docker Compose configuration
├── deploy.sh               # Deployment script
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/pnpm
- PostgreSQL database
- AWS S3 account (optional, for file storage)
- Backblaze B2 account (optional, for file storage)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd photo-portal
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Copy environment variables
   cp .env.example .env
   
   # Configure your environment variables
   DATABASE_URL="postgresql://username:password@localhost:5432/photo_portal"
   JWT_SECRET="your-secret-key"
   AWS_ACCESS_KEY_ID="your-aws-key"
   AWS_SECRET_ACCESS_KEY="your-aws-secret"
   AWS_REGION="us-east-1"
   S3_BUCKET_NAME="your-bucket-name"
   BACKBLAZE_APPLICATION_KEY_ID="your-b2-key"
   BACKBLAZE_APPLICATION_KEY="your-b2-secret"
   BACKBLAZE_BUCKET_ID="your-bucket-id"
   
   # Admin setup (optional - for first admin user)
   FIRST_ADMIN_EMAIL="admin@yourdomain.com"
   FIRST_ADMIN_PASSWORD="your-secure-admin-password"
   FIRST_ADMIN_NAME="Admin Name"
   
   # Run database migrations
   npx prisma migrate dev
   
   # (Optional) Create first admin user via script
   npm run create-admin
   
   # Start development server
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Copy environment variables
   cp .env.example .env
   
   # Configure your environment variables
   NEXT_PUBLIC_API_URL="http://localhost:5000/api"
   
   # Start development server
   npm run dev
   ```

4. **Admin System Setup**
   
   After starting the backend, you can set up the admin system in two ways:
   
   **Option A: Using environment variables (recommended for first deployment)**
   - Set `FIRST_ADMIN_EMAIL`, `FIRST_ADMIN_PASSWORD`, and `FIRST_ADMIN_NAME` in `.env`
   - Run `npm run create-admin` in the backend directory
   
   **Option B: Using the setup UI**
   - Navigate to `/admin/setup` in your frontend
   - Fill in the first admin details through the web interface
   - This is only available when no admin users exist
   
   **Adding more admins:**
   - Log in to the admin dashboard
   - Navigate to the Admin Invitations section
   - Send invitation emails to new administrators
   - Invitees will receive a secure token to activate their accounts

### Database Setup

The application uses PostgreSQL with Prisma ORM. The schema includes:

- **Users**: Authentication and role management (PHOTOGRAPHER, CLIENT, ADMIN)
- **Galleries**: Photo collections with access controls, timeline organization, and locking
- **Gallery Groups**: Event-based grouping for multiple related galleries
- **Folders**: Hierarchical folder structure within galleries
- **Photos**: Individual images with metadata, EXIF capture dates, and selection tracking
- **Interactions**: User engagement tracking (likes, favorites, posts)
- **Access Control**: Permission management and gallery access
- **Upload Sessions**: Resumable upload tracking with progress monitoring
- **Client Feedback**: Structured feedback collection with ratings
- **Admin System**: Audit logs, system configuration, session management, and invitations

**Useful Commands:**
- `npx prisma studio` - View and manage your database through a web interface
- `npx prisma migrate dev` - Create and apply a new migration
- `npx prisma migrate deploy` - Apply migrations in production
- `npx prisma db push` - Push schema changes without creating a migration
- `npm run create-admin` - Create the first admin user

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration (requires admin approval for photographers)
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Admin Authentication
- `POST /api/admin/auth/login` - Admin login with enhanced security
- `POST /api/admin/auth/logout` - Admin logout with CSRF validation
- `GET /api/admin/auth/profile` - Get admin profile
- `GET /api/admin/auth/setup-status` - Check if admin system is initialized
- `POST /api/admin/auth/setup-first-admin` - Create first admin user
- `POST /api/admin/auth/invite-admin` - Invite new administrator
- `POST /api/admin/auth/verify-invitation/:token` - Verify admin invitation
- `POST /api/admin/auth/activate-account` - Activate admin account
- `GET /api/admin/auth/sessions` - List admin sessions
- `DELETE /api/admin/auth/sessions/:sessionId` - Revoke admin session
- `PUT /api/admin/auth/change-password` - Change admin password

### Admin User Management
- `GET /api/admin/users` - Get all users with filtering
- `GET /api/admin/users/search` - Search users
- `GET /api/admin/users/statistics` - Get user statistics
- `GET /api/admin/users/pending-approvals` - Get pending photographer approvals
- `GET /api/admin/users/:userId` - Get user details
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:userId/role` - Update user role
- `PUT /api/admin/users/:userId/approve` - Approve pending photographer
- `PUT /api/admin/users/:userId/suspend` - Suspend user
- `PUT /api/admin/users/:userId/activate` - Activate user
- `DELETE /api/admin/users/:userId` - Delete user

### Admin Analytics
- `GET /api/admin/analytics/system-stats` - Get comprehensive system statistics
- `GET /api/admin/analytics/user-analytics` - Get user analytics with time-based filtering
- `GET /api/admin/analytics/storage-analytics` - Get storage usage tracking
- `GET /api/admin/analytics/system-health` - Get system health and performance metrics
- `GET /api/admin/analytics/security-logs` - Get security event logs
- `GET /api/admin/analytics/system-alerts` - Get automated system alerts
- `GET /api/admin/analytics/export` - Export analytics data (JSON/CSV)

### Admin System Configuration
- `GET /api/admin/system-config` - Get all system configurations
- `GET /api/admin/system-config/:key` - Get specific configuration
- `PUT /api/admin/system-config/:key` - Update system configuration
- `DELETE /api/admin/system-config/:key` - Delete configuration
- `POST /api/admin/system-config/reset/:key` - Reset to default values

### Admin Galleries
- `GET /api/admin/galleries` - List all galleries with filtering
- `GET /api/admin/galleries/:id` - Get gallery details
- `DELETE /api/admin/galleries/:id` - Delete gallery

### Audit Logs
- `GET /api/audit/logs` - Get audit logs with filtering
- `GET /api/audit/logs/:id` - Get specific audit log entry
- `GET /api/audit/logs/user/:userId` - Get logs for specific user
- `GET /api/audit/logs/action/:action` - Get logs by action type
- `GET /api/audit/stats` - Get audit statistics

### Galleries
- `GET /api/galleries` - List galleries with timeline filtering
- `POST /api/galleries` - Create gallery
- `GET /api/galleries/:id` - Get gallery details
- `PUT /api/galleries/:id` - Update gallery
- `DELETE /api/galleries/:id` - Delete gallery
- `PUT /api/galleries/:id/lock` - Lock gallery
- `PUT /api/galleries/:id/unlock` - Unlock gallery

### Gallery Groups
- `GET /api/gallery-groups` - List gallery groups
- `POST /api/gallery-groups` - Create gallery group
- `GET /api/gallery-groups/:id` - Get group details
- `PATCH /api/gallery-groups/:id` - Update group
- `DELETE /api/gallery-groups/:id` - Delete group
- `POST /api/gallery-groups/:id/galleries` - Assign galleries to group
- `DELETE /api/gallery-groups/:id/galleries` - Remove galleries from group

### Photos
- `GET /api/photos` - List photos
- `POST /api/photos` - Upload photos
- `GET /api/photos/:id` - Get photo details
- `DELETE /api/photos/:id` - Delete photo

### Folders
- `GET /api/folders` - List folders
- `POST /api/folders` - Create folder
- `GET /api/folders/:id` - Get folder details
- `PUT /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder

### Downloads (Server-side Processing)
- `GET /api/photos/gallery/:id/download/all` - Download all photos in gallery
- `GET /api/photos/gallery/:id/download/folder/:folderId` - Download folder photos
- `GET /api/photos/gallery/:id/download/liked` - Download liked photos
- `GET /api/photos/gallery/:id/download/favorited` - Download favorited photos
- `GET /api/download-progress/:downloadId` - Get download progress

### Uploads
- `POST /api/uploads/photos` - Batch photo upload with session tracking
- `GET /api/upload-config` - Get upload configuration
- `GET /api/uploads/sessions/:sessionId` - Get upload session status
- `PUT /api/uploads/sessions/:sessionId/pause` - Pause upload session
- `PUT /api/uploads/sessions/:sessionId/resume` - Resume upload session
- `DELETE /api/uploads/sessions/:sessionId` - Cancel upload session

### Selection Analytics
- `GET /api/analytics/gallery/:galleryId/selections` - Get gallery selection summary
- `GET /api/analytics/folder/:folderId/selections` - Get folder selection counts
- `GET /api/analytics/photographer/selections` - Get photographer analytics dashboard
- `GET /api/analytics/system/statistics` - Get system selection statistics (admin only)
- `POST /api/analytics/system/recalculate` - Recalculate selection counts (admin only)
- `POST /api/analytics/system/cleanup` - Cleanup orphaned selections (admin only)

### Client Feedback
- `POST /api/feedback` - Submit client feedback
- `POST /api/clients/:clientId/request-feedback` - Request feedback from client (photographer)
- `GET /api/feedback` - Get all feedback (photographer/admin)
- `GET /api/feedback/status` - Check feedback request status (client)

### Photographers
- `GET /api/photographers` - List photographers
- `GET /api/photographers/:id` - Get photographer details
- `GET /api/photographers/:id/galleries` - Get photographer's galleries

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication for users
- **Admin Authentication**: Enhanced authentication with CSRF protection and session management
- **Password Hashing**: bcrypt for secure password storage
- **Role-Based Access**: Photographer, client, and admin role separation with middleware protection
- **Photographer Approval**: Admin review required for new photographer registrations
- **Gallery Privacy**: Password protection and access controls
- **Gallery Locking**: Prevent modifications to finalized galleries
- **File Validation**: Secure file upload with type checking
- **Rate Limiting**: Protection against abuse on sensitive endpoints (login, password changes, user management)
- **CORS Configuration**: Controlled cross-origin access
- **CSRF Protection**: Cross-Site Request Forgery protection for admin routes
- **Audit Logging**: Complete audit trail of admin actions with IP and user agent tracking
- **Session Management**: Secure admin session handling with expiration and revocation
- **Security Monitoring**: Automated detection of suspicious activities and failed login attempts
- **Input Validation**: Zod schema validation for API requests

## 📱 Frontend Features

### Responsive Design
- Mobile-first approach
- Tailwind CSS for consistent styling
- Dark/light theme support with next-themes
- Optimized for all screen sizes

### User Experience
- Intuitive navigation with App Router
- Smooth animations and transitions with Framer Motion
- Loading states and error handling
- Accessible UI components with Radix UI
- Toast notifications with Sonner

### Gallery Interface
- Grid and list view options
- Photo lightbox with navigation
- Folder hierarchy support
- Download functionality with progress tracking
- Social interaction features (like, favorite, post)
- Selection analytics visualization

### Admin Dashboard
- System overview with real-time statistics
- User management with search and filtering
- Analytics and reporting with Recharts
- Security monitoring and audit logs
- System configuration management
- Export capabilities for reports

## 👥 User Roles and Workflow

### Client Workflow
1. **Registration**: Sign up with email and password (no approval needed)
2. **Gallery Access**: Access galleries via password or direct assignment from photographer
3. **Photo Interaction**: View, like, favorite, and post photos
4. **Downloads**: Download selected photos with progress tracking
5. **Feedback**: Provide ratings and feedback when requested by photographer

### Photographer Workflow
1. **Registration**: Sign up and wait for admin approval
2. **Approval**: Admin reviews and approves photographer account
3. **Gallery Management**: Create and organize galleries with timeline features
4. **Photo Upload**: Batch upload photos with resumable sessions
5. **Client Management**: Invite clients and manage access permissions
6. **Analytics**: Track photo selections and client engagement
7. **Feedback Collection**: Request and review client feedback
8. **Gallery Organization**: Use gallery groups to organize events

### Administrator Workflow
1. **Initial Setup**: Create first admin via environment variables or setup UI
2. **User Management**: Approve photographer registrations, manage all users
3. **System Monitoring**: Track system health, storage, and performance
4. **Security Management**: Review security logs and manage alerts
5. **Configuration**: Set system-wide limits and configurations
6. **Admin Management**: Invite additional administrators
7. **Audit Review**: Monitor all administrative actions via audit logs

## 🚀 Deployment

### Backend Deployment
1. Build the application: `npm run build`
2. Set production environment variables
3. Deploy to your preferred hosting service (Heroku, DigitalOcean, AWS, etc.)
4. Run database migrations: `npx prisma migrate deploy`
5. Set up the first admin user using environment variables or the setup UI

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy to Vercel, Netlify, or your preferred hosting service
3. Configure environment variables for production

### Docker Deployment

The repository includes Docker configuration for easy deployment:

```bash
# Copy and configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Deploy with Docker Compose
./deploy.sh

# Or manually:
docker-compose up -d
```

The Docker setup includes:
- PostgreSQL database with persistent storage
- Backend API with health checks
- Frontend web application
- Nginx reverse proxy (optional)

### Environment Variables for Production
```bash
# Backend
NODE_ENV=production
PORT=5000
DATABASE_URL=your-production-db-url
JWT_SECRET=your-production-jwt-secret

# Admin Setup (for first admin)
FIRST_ADMIN_EMAIL=admin@yourdomain.com
FIRST_ADMIN_PASSWORD=your-secure-password
FIRST_ADMIN_NAME="Admin Name"

# Storage Configuration
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-west-004
S3_BUCKET_NAME=your-bucket

# Backblaze B2 (optional)
B2_KEY_ID=your-b2-key
B2_APPLICATION_KEY=your-b2-key
B2_BUCKET_NAME=your-bucket
B2_BUCKET_ID=your-bucket-id

# CDN (optional)
CDN_URL=https://cdn.yourdomain.com

# CORS
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Frontend
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
NEXT_PUBLIC_DIRECT_DOWNLOAD_URL=https://direct.yourdomain.com
```

### Post-Deployment Steps
1. **Set up admin account**: Use the `/admin/setup` route or the `npm run create-admin` command
2. **Approve photographer registrations**: New photographers require admin approval before they can access the system
3. **Configure system settings**: Use the admin dashboard to set user limits, storage quotas, and other system configurations
4. **Monitor system health**: Use the admin analytics dashboard to track system performance and security

## 🧪 Development

### Available Scripts

**Backend:**
- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run all tests
- `npm run test:admin` - Run admin-specific tests
- `npm run create-admin` - Create the first admin user
- `npm run admin-setup` - Interactive admin setup
- `npx prisma studio` - Open database management interface
- `npx prisma migrate dev` - Create and apply new migration
- `npx prisma migrate deploy` - Apply migrations in production

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Consistent code structure and naming conventions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 🔧 Troubleshooting

### Admin Access Issues
- **Problem**: Cannot access admin dashboard
  - **Solution**: Ensure you've created the first admin user using `npm run create-admin` or the `/admin/setup` route
  - **Check**: Verify admin user exists in database with role='ADMIN'

### Photographer Registration Pending
- **Problem**: Photographer cannot log in after registration
  - **Solution**: Photographers require admin approval. Admin must approve the registration via the admin dashboard (`/admin/users/pending-approvals`)

### Database Connection Errors
- **Problem**: Cannot connect to PostgreSQL
  - **Solution**: Verify `DATABASE_URL` in `.env` is correct
  - **Check**: Ensure PostgreSQL is running and accessible
  - **Docker**: If using Docker, ensure the postgres container is healthy

### Upload Failures
- **Problem**: Photos fail to upload
  - **Solution**: Check AWS/B2 credentials in environment variables
  - **Check**: Verify bucket permissions and CORS settings
  - **Storage**: Ensure sufficient storage space in your bucket

### CSRF Token Errors (Admin Routes)
- **Problem**: "Invalid CSRF token" errors in admin dashboard
  - **Solution**: Obtain a fresh CSRF token by calling `/api/admin/auth/csrf-token`
  - **Check**: Ensure cookies are enabled in your browser
  - **Note**: CSRF tokens expire with the session

### Rate Limiting
- **Problem**: "Too many requests" error
  - **Solution**: Wait for the rate limit window to reset
  - **Check**: Rate limits are: 5 login attempts per 15 min, 10 password changes per hour, 100 general admin requests per 15 min

### Migration Issues
- **Problem**: Database migration fails
  - **Solution**: Run `npx prisma migrate reset` to reset database (⚠️ deletes all data)
  - **Production**: Use `npx prisma migrate deploy` for production migrations
  - **Check**: Review migration files in `backend/prisma/migrations/`

### Build Errors
- **Problem**: Frontend or backend fails to build
  - **Solution**: Delete `node_modules` and `package-lock.json`, then run `npm install` again
  - **Check**: Ensure you're using Node.js 18+ and compatible npm version

### Docker Issues
- **Problem**: Docker containers fail to start
  - **Solution**: Check `.env` file has all required variables
  - **Check**: Run `docker-compose logs` to see error messages
  - **Health**: Use `docker-compose ps` to check container health status

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints
- Check the troubleshooting section above

## 🔮 Future Enhancements

- [ ] Real-time notifications with WebSockets
- [ ] Advanced AI-powered photo organization and tagging
- [ ] Mobile app development (iOS/Android)
- [ ] Integration with popular photo editing software
- [ ] Advanced sharing and collaboration features
- [ ] Video support for galleries
- [ ] Custom branding for photographers
- [ ] Client portal customization
- [ ] Automated backup and disaster recovery
- [ ] Multi-language support (i18n)

## 📝 Recent Updates

### Admin System (Latest)
- Comprehensive admin dashboard with system overview
- User management with photographer approval workflow
- Advanced analytics and reporting
- Security monitoring and audit logging
- System configuration management
- CSRF protection and rate limiting for admin routes
- Admin invitation system with secure token-based activation
- Session management with automatic expiration

### Gallery Features
- **Gallery Groups**: Organize multiple galleries into events
- **Timeline Organization**: Sort galleries by shoot date with year/month indexing
- **Gallery Locking**: Lock galleries to prevent modifications while maintaining client access
- **EXIF Data**: Automatic extraction of capture dates from photos

### Analytics and Feedback
- **Selection Analytics**: Track which photos clients liked, favorited, or posted
- **Client Feedback**: Structured feedback collection with ratings
- **Performance Metrics**: System-wide performance and storage tracking

### Upload System
- **Resumable Uploads**: Upload sessions with pause/resume capability
- **Progress Tracking**: Real-time upload progress monitoring
- **Batch Processing**: Efficient handling of large photo batches

### Security Enhancements
- Rate limiting on sensitive endpoints
- CSRF protection for admin operations
- Audit logging for all admin actions
- Security event monitoring and alerting
- Session management with IP tracking
