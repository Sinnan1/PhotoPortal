# Frontend Components Documentation

This document provides comprehensive documentation for the Photo Portal frontend components, including UI components, design system, and component architecture.

## 🎨 Design System Overview

The Photo Portal frontend uses a modern, accessible design system built with:

- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Unstyled, accessible component primitives
- **Custom Components**: Tailored UI components for the photo gallery experience
- **Responsive Design**: Mobile-first approach with breakpoint system

## 🎯 Component Architecture

### Component Hierarchy
```
App Layout
├── Navigation
├── Authentication Forms
├── Dashboard
│   ├── Gallery Management
│   ├── Photo Upload
│   └── Client Management
├── Gallery Viewer
│   ├── Photo Grid
│   ├── Photo Lightbox
│   └── Download Interface
└── Shared Components
    ├── UI Primitives
    ├── Forms
    └── Feedback
```

## 🧩 Core UI Components

### Button Component
**Location**: `@/components/ui/button`

**Usage**:
```tsx
import { Button } from "@/components/ui/button"

// Primary button
<Button>Click me</Button>

// Secondary button with variant
<Button variant="secondary" size="lg">
  Secondary Action
</Button>

// Destructive button
<Button variant="destructive">
  Delete
</Button>
```

**Variants**:
- `default`: Primary button (emerald theme)
- `secondary`: Secondary button
- `destructive`: Danger/delete actions
- `outline`: Outlined button
- `ghost`: Minimal button
- `link`: Link-style button

**Sizes**:
- `sm`: Small button
- `default`: Standard size
- `lg`: Large button
- `icon`: Square icon button

### Input Component
**Location**: `@/components/ui/input`

**Usage**:
```tsx
import { Input } from "@/components/ui/input"

<Input 
  type="email" 
  placeholder="Enter your email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

**Features**:
- Automatic focus states
- Error state support
- Accessible labels
- Responsive sizing

### Card Component
**Location**: `@/components/ui/card`

**Usage**:
```tsx
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"

<Card>
  <CardHeader>
    <h3>Gallery Title</h3>
  </CardHeader>
  <CardContent>
    <p>Gallery description</p>
  </CardContent>
  <CardFooter>
    <Button>View Gallery</Button>
  </CardFooter>
</Card>
```

## 🖼️ Gallery-Specific Components

### Photo Grid Component
**Location**: `@/components/gallery/PhotoGrid`

**Purpose**: Displays photos in a responsive grid layout

**Props**:
```tsx
interface PhotoGridProps {
  photos: Photo[]
  onPhotoClick: (photo: Photo) => void
  onPhotoLike: (photoId: string) => void
  onPhotoFavorite: (photoId: string) => void
  isClient?: boolean
}
```

**Usage**:
```tsx
import { PhotoGrid } from "@/components/gallery/PhotoGrid"

<PhotoGrid
  photos={galleryPhotos}
  onPhotoClick={handlePhotoClick}
  onPhotoLike={handlePhotoLike}
  onPhotoFavorite={handlePhotoFavorite}
  isClient={userRole === 'CLIENT'}
/>
```

**Features**:
- Responsive grid (1-6 columns based on screen size)
- Lazy loading for performance
- Hover effects with action buttons
- Accessibility support (ARIA labels, keyboard navigation)

### Photo Lightbox Component
**Location**: `@/components/gallery/PhotoLightbox`

**Purpose**: Full-screen photo viewer with navigation

**Props**:
```tsx
interface PhotoLightboxProps {
  photo: Photo
  isOpen: boolean
  onClose: () => void
  onNext: () => void
  onPrevious: () => void
  hasNext: boolean
  hasPrevious: boolean
}
```

**Usage**:
```tsx
import { PhotoLightbox } from "@/components/gallery/PhotoLightbox"

<PhotoLightbox
  photo={selectedPhoto}
  isOpen={lightboxOpen}
  onClose={() => setLightboxOpen(false)}
  onNext={handleNextPhoto}
  onPrevious={handlePreviousPhoto}
  hasNext={currentIndex < photos.length - 1}
  hasPrevious={currentIndex > 0}
/>
```

**Features**:
- Full-screen overlay
- Keyboard navigation (arrow keys, ESC)
- Touch gestures for mobile
- Download button
- Social interaction buttons (like, favorite)

### Gallery Header Component
**Location**: `@/components/gallery/GalleryHeader`

**Purpose**: Displays gallery information and controls

**Props**:
```tsx
interface GalleryHeaderProps {
  gallery: Gallery
  onDownloadAll: () => void
  onShare: () => void
  isOwner: boolean
}
```

**Usage**:
```tsx
import { GalleryHeader } from "@/components/gallery/GalleryHeader"

<GalleryHeader
  gallery={currentGallery}
  onDownloadAll={handleDownloadAll}
  onShare={handleShare}
  isOwner={user.id === gallery.photographerId}
/>
```

## 📝 Form Components

### Login Form Component
**Location**: `@/components/auth/LoginForm`

**Purpose**: User authentication form

**Features**:
- Email and password validation
- Error handling and display
- Loading states
- Remember me functionality

**Usage**:
```tsx
import { LoginForm } from "@/components/auth/LoginForm"

<LoginForm 
  onSubmit={handleLogin}
  isLoading={isLoading}
  error={error}
/>
```

### Registration Form Component
**Location**: `@/components/auth/RegisterForm`

**Purpose**: New user registration

**Features**:
- Form validation with Zod schema
- Password strength indicator
- Role selection (Photographer/Client)
- Terms and conditions acceptance

**Usage**:
```tsx
import { RegisterForm } from "@/components/auth/RegisterForm"

<RegisterForm 
  onSubmit={handleRegister}
  isLoading={isLoading}
  error={error}
/>
```

### Photo Upload Component
**Location**: `@/components/upload/PhotoUpload`

**Purpose**: Batch photo upload interface

**Features**:
- Drag and drop file upload
- File type validation
- Progress indicators
- Batch processing
- Error handling

**Usage**:
```tsx
import { PhotoUpload } from "@/components/upload/PhotoUpload"

<PhotoUpload
  galleryId={gallery.id}
  onUploadComplete={handleUploadComplete}
  maxFiles={50}
  maxFileSize={50 * 1024 * 1024} // 50MB
/>
```

## 🎨 Design System Components

### Color Palette
The design system uses a carefully crafted color palette:

**Primary Colors**:
- `emerald-700`: Main brand color
- `emerald-600`: Hover states
- `emerald-500`: Accent elements

**Neutral Colors**:
- `gray-50` to `gray-900`: Text and backgrounds
- `white`: Pure white
- `black`: Pure black

**Semantic Colors**:
- `red-500`: Error states
- `yellow-500`: Warning states
- `green-500`: Success states
- `blue-500`: Information states

### Typography Scale
```css
/* Headings */
.text-4xl /* 36px */ - Hero titles
.text-3xl /* 30px */ - Section headings
.text-2xl /* 24px */ - Subsection headings
.text-xl  /* 20px */ - Card titles
.text-lg  /* 18px */ - Body large
.text-base /* 16px */ - Body default
.text-sm  /* 14px */ - Body small
.text-xs  /* 12px */ - Captions

/* Font weights */
.font-light    /* 300 */
.font-normal   /* 400 */
.font-medium   /* 500 */
.font-semibold /* 600 */
.font-bold     /* 700 */
.font-extrabold /* 800 */
```

### Spacing System
```css
/* Spacing scale (4px base unit) */
.space-1  /* 4px */
.space-2  /* 8px */
.space-3  /* 12px */
.space-4  /* 16px */
.space-5  /* 20px */
.space-6  /* 24px */
.space-8  /* 32px */
.space-10 /* 40px */
.space-12 /* 48px */
.space-16 /* 64px */
.space-20 /* 80px */
.space-24 /* 96px */
```

### Border Radius
```css
/* Border radius scale */
.rounded-sm   /* 2px */
.rounded      /* 4px */
.rounded-md   /* 6px */
.rounded-lg   /* 8px */
.rounded-xl   /* 12px */
.rounded-2xl  /* 16px */
.rounded-3xl  /* 24px */
.rounded-full /* 50% */
```

## 📱 Responsive Design

### Breakpoint System
```css
/* Tailwind CSS breakpoints */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X large devices */
```

### Mobile-First Approach
- Base styles target mobile devices
- Progressive enhancement for larger screens
- Touch-friendly interactions
- Optimized layouts for small screens

### Responsive Utilities
```tsx
// Conditional rendering based on screen size
import { useMediaQuery } from "@/hooks/useMediaQuery"

const isMobile = useMediaQuery("(max-width: 768px)")

{isMobile ? <MobileLayout /> : <DesktopLayout />}
```

## ♿ Accessibility Features

### ARIA Support
- Proper labeling for screen readers
- Semantic HTML structure
- Keyboard navigation support
- Focus management

### Color Contrast
- WCAG AA compliance (4.5:1 ratio)
- High contrast mode support
- Color-blind friendly palette

### Screen Reader Support
- Descriptive alt text for images
- Proper heading hierarchy
- Form field associations
- Error message announcements

## 🔧 Component Development

### Creating New Components
1. **File Structure**:
   ```
   components/
   ├── ui/           # Base UI components
   ├── forms/        # Form components
   ├── gallery/      # Gallery-specific components
   └── shared/       # Shared utility components
   ```

2. **Component Template**:
   ```tsx
   import { cn } from "@/lib/utils"
   import { forwardRef } from "react"

   interface ComponentProps {
     className?: string
     children?: React.ReactNode
   }

   const Component = forwardRef<HTMLDivElement, ComponentProps>(
     ({ className, children, ...props }, ref) => {
       return (
         <div
           ref={ref}
           className={cn("base-styles", className)}
           {...props}
         >
           {children}
         </div>
       )
     }
   )

   Component.displayName = "Component"

   export { Component }
   ```

### Styling Guidelines
- Use Tailwind CSS utilities
- Follow design system spacing
- Maintain consistent color usage
- Ensure responsive behavior
- Test accessibility features

### Testing Components
- Unit tests for component logic
- Integration tests for user interactions
- Accessibility testing with tools
- Cross-browser compatibility
- Mobile device testing

## 📚 Component Library

### Available Components
- **UI Primitives**: Button, Input, Card, Modal, etc.
- **Layout**: Container, Grid, Flexbox utilities
- **Navigation**: Navbar, Sidebar, Breadcrumbs
- **Feedback**: Toast, Alert, Progress, Skeleton
- **Data Display**: Table, List, Badge, Avatar
- **Forms**: Input, Select, Checkbox, Radio, etc.

### Component Props
Each component includes:
- TypeScript interfaces
- Default values
- Required vs optional props
- Event handlers
- Styling customization

### Component States
- Default state
- Hover state
- Focus state
- Active state
- Disabled state
- Loading state
- Error state

## 🎭 Animation and Transitions

### CSS Transitions
```css
/* Smooth transitions */
.transition-all      /* All properties */
.transition-colors   /* Color changes */
.transition-opacity  /* Opacity changes */
.transition-transform /* Transform changes */

/* Duration */
.duration-75   /* 75ms */
.duration-100  /* 100ms */
.duration-150  /* 150ms */
.duration-200  /* 200ms */
.duration-300  /* 300ms */
.duration-500  /* 500ms */
```

### Animation Classes
```css
/* Fade in */
.animate-fade-in
/* Slide up */
.animate-slide-up
/* Scale in */
.animate-scale-in
/* Bounce */
.animate-bounce
```

### Hover Effects
- Subtle color changes
- Scale transformations
- Shadow enhancements
- Border animations

## 🔍 Performance Optimization

### Lazy Loading
- Component-level code splitting
- Image lazy loading
- Route-based chunking
- Dynamic imports

### Memoization
- React.memo for expensive components
- useMemo for computed values
- useCallback for event handlers
- Optimized re-renders

### Bundle Optimization
- Tree shaking
- Dead code elimination
- Minification
- Gzip compression

## 🧪 Testing Strategy

### Unit Testing
- Component rendering
- Props validation
- Event handling
- State changes

### Integration Testing
- User interactions
- Component communication
- Form submissions
- Navigation flows

### Visual Testing
- Screenshot comparisons
- Responsive design
- Cross-browser compatibility
- Accessibility compliance

## 📖 Documentation Standards

### Component Documentation
- Purpose and usage
- Props interface
- Examples and code snippets
- Accessibility notes
- Performance considerations

### Code Comments
- Complex logic explanation
- Business rule documentation
- Performance notes
- TODO items and future improvements

### Storybook Integration
- Interactive component examples
- Props documentation
- Visual testing
- Component playground