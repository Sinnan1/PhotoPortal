# Photo Portal

A full-stack web application for photographers to create, manage, and share private photo galleries with their clients. Built with modern technologies including Next.js, Express.js, Prisma, and PostgreSQL.

## 🚀 Features

### For Photographers
- **Gallery Management**: Create, edit, and organize photo galleries
- **Client Management**: Manage client relationships and access permissions
- **Photo Upload**: Batch upload high-resolution photos with automatic thumbnail generation
- **Analytics**: Track gallery views, downloads, and client engagement
- **Customization**: Set gallery passwords, expiration dates, and download limits

### For Clients
- **Private Access**: Secure, password-protected gallery access
- **High-Quality Viewing**: Responsive gallery interface optimized for all devices
- **Download Options**: Server-side processed downloads with real-time progress tracking
  - Download all photos in a gallery
  - Download photos from specific folders
  - Download liked or favorited photos
  - Unified progress tracking across all download types
- **Social Features**: Like and favorite photos and galleries
- **Mobile Optimized**: Seamless experience across all devices

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
- **Authentication**: JWT with bcrypt password hashing
- **File Storage**: AWS S3 and Backblaze B2 integration
- **Image Processing**: Sharp for thumbnail generation and optimization
- **Download System**: Server-side zip creation with Archiver and S3 streaming
- **Security**: Helmet.js, CORS, rate limiting

### Database Schema
- **Users**: Photographers and clients with role-based access
- **Galleries**: Photo collections with metadata and access controls
- **Photos**: Individual images with download tracking
- **Interactions**: Likes, favorites, and access permissions
- **Relationships**: Photographer-client associations

## 🛠️ Tech Stack

### Frontend Dependencies
- **Core**: Next.js 15, React 19, TypeScript
- **UI**: Radix UI, Tailwind CSS, Lucide React icons
- **Forms**: React Hook Form with Zod validation
- **State**: React hooks and context
- **Utilities**: date-fns, clsx, class-variance-authority

### Backend Dependencies
- **Core**: Express.js 5, Node.js, TypeScript
- **Database**: Prisma ORM, PostgreSQL
- **Authentication**: JWT, bcryptjs
- **File Handling**: Multer, Sharp, AWS SDK
- **Security**: Helmet, CORS, Morgan logging
- **Storage**: AWS S3, Backblaze B2

## 📁 Project Structure

```
photo-portal/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App Router pages and layouts
│   │   │   ├── (auth)/      # Authentication routes
│   │   │   ├── (dashboard)/ # Dashboard routes
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
│   │   ├── middleware/     # Custom middleware
│   │   ├── routes/         # API route definitions
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   └── server.ts       # Main server file
│   ├── prisma/             # Database schema and migrations
│   └── package.json        # Backend dependencies
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
   AWS_S3_BUCKET="your-bucket-name"
   BACKBLAZE_APPLICATION_KEY_ID="your-b2-key"
   BACKBLAZE_APPLICATION_KEY="your-b2-secret"
   BACKBLAZE_BUCKET_ID="your-bucket-id"
   
   # Run database migrations
   npx prisma migrate dev
   
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

### Database Setup

The application uses PostgreSQL with Prisma ORM. The schema includes:

- **Users**: Authentication and role management
- **Galleries**: Photo collections with access controls
- **Photos**: Individual images with metadata
- **Interactions**: User engagement tracking
- **Access Control**: Permission management

Run `npx prisma studio` to view and manage your database through a web interface.

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Galleries
- `GET /api/galleries` - List galleries
- `POST /api/galleries` - Create gallery
- `GET /api/galleries/:id` - Get gallery details
- `PUT /api/galleries/:id` - Update gallery
- `DELETE /api/galleries/:id` - Delete gallery

### Photos
- `GET /api/photos` - List photos
- `POST /api/photos` - Upload photos
- `GET /api/photos/:id` - Get photo details
- `DELETE /api/photos/:id` - Delete photo

### Downloads (Server-side Processing)
- `GET /api/photos/gallery/:id/download/all` - Download all photos in gallery
- `GET /api/photos/gallery/:id/download/folder/:folderId` - Download folder photos
- `GET /api/photos/gallery/:id/download/liked` - Download liked photos
- `GET /api/photos/gallery/:id/download/favorited` - Download favorited photos
- `GET /api/download-progress/:downloadId` - Get download progress

### Uploads
- `POST /api/uploads/photos` - Batch photo upload
- `GET /api/upload-config` - Get upload configuration

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Role-Based Access**: Photographer and client role separation
- **Gallery Privacy**: Password protection and access controls
- **File Validation**: Secure file upload with type checking
- **Rate Limiting**: Protection against abuse
- **CORS Configuration**: Controlled cross-origin access

## 📱 Frontend Features

### Responsive Design
- Mobile-first approach
- Tailwind CSS for consistent styling
- Dark/light theme support
- Optimized for all screen sizes

### User Experience
- Intuitive navigation
- Smooth animations and transitions
- Loading states and error handling
- Accessible UI components

### Gallery Interface
- Grid and list view options
- Photo lightbox with navigation
- Download functionality
- Social interaction features

## 🚀 Deployment

### Backend Deployment
1. Build the application: `npm run build`
2. Set production environment variables
3. Deploy to your preferred hosting service (Heroku, DigitalOcean, AWS, etc.)
4. Run database migrations: `npx prisma migrate deploy`

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy to Vercel, Netlify, or your preferred hosting service
3. Configure environment variables for production

### Environment Variables for Production
```bash
# Backend
NODE_ENV=production
PORT=5000
DATABASE_URL=your-production-db-url
JWT_SECRET=your-production-jwt-secret

# Frontend
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
```

## 🧪 Development

### Available Scripts

**Backend:**
- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npx prisma studio` - Open database management interface

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


## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔮 Future Enhancements

- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Mobile app development
- [ ] AI-powered photo organization
- [ ] Integration with popular photo editing software
- [ ] Advanced sharing and collaboration features
