# Design Document

## Overview

The Photo Selection Tracking feature provides real-time counting and display of client photo selections across different event categories (folders) within galleries. The system leverages the existing photo interaction infrastructure (likes, favorites, and posts) to track selections and provides comprehensive analytics for both clients and photographers.

The feature builds upon the current gallery structure where folders represent event types (barat, walima, mehendi, etc.) and integrates seamlessly with the existing photo management system.

## Architecture

### System Integration Points

The feature integrates with existing components:

- **Database Layer**: Utilizes existing `LikedPhoto`, `FavoritedPhoto`, and `PostPhoto` models for selection tracking
- **API Layer**: Extends current photo controller endpoints and adds new selection analytics endpoints
- **Frontend Components**: Enhances gallery page with selection counters and adds admin analytics views
- **Authentication**: Uses existing auth middleware for user verification and role-based access

### Data Flow

1. **Client Selection**: User interacts with photos (like/favorite/post) → API updates selection tables → Real-time UI updates
2. **Count Calculation**: Aggregation queries count selections per folder and gallery → Cached for performance
3. **Analytics Display**: Admin dashboard queries selection statistics → Filtered and sorted data presentation

## Components and Interfaces

### Backend Components

#### 1. Selection Analytics Service (`src/services/selectionAnalyticsService.ts`)
```typescript
interface SelectionCounts {
  folderId: string
  folderName: string
  totalPhotos: number
  selectedPhotos: number
  likedPhotos: number
  favoritedPhotos: number
  postedPhotos: number
}

interface GallerySelectionSummary {
  galleryId: string
  galleryTitle: string
  totalPhotos: number
  totalSelections: number
  folderBreakdown: SelectionCounts[]
  lastActivity: Date
}

class SelectionAnalyticsService {
  async getFolderSelectionCounts(folderId: string, userId: string): Promise<SelectionCounts>
  async getGallerySelectionSummary(galleryId: string, userId: string): Promise<GallerySelectionSummary>
  async getPhotographerAnalytics(photographerId: string, filters?: AnalyticsFilters): Promise<PhotographerAnalytics>
}
```

#### 2. Selection Analytics Controller (`src/controllers/selectionAnalyticsController.ts`)
```typescript
// GET /api/analytics/gallery/:galleryId/selections
export const getGallerySelections = async (req: AuthRequest, res: Response)

// GET /api/analytics/folder/:folderId/selections  
export const getFolderSelections = async (req: AuthRequest, res: Response)

// GET /api/analytics/photographer/selections
export const getPhotographerSelections = async (req: AuthRequest, res: Response)
```

#### 3. Real-time Selection Updates
Extend existing photo interaction endpoints to include selection count updates:
- `likePhoto` → Update folder selection counts
- `favoritePhoto` → Update folder selection counts  
- `postPhoto` → Update folder selection counts

### Frontend Components

#### 1. Selection Counter Component (`components/ui/selection-counter.tsx`)
```typescript
interface SelectionCounterProps {
  folderId: string
  totalPhotos: number
  selectedCount: number
  likedCount: number
  favoritedCount: number
  postedCount: number
  compact?: boolean
}

export function SelectionCounter({ folderId, totalPhotos, selectedCount, ... }: SelectionCounterProps)
```

#### 2. Gallery Selection Summary (`components/ui/gallery-selection-summary.tsx`)
```typescript
interface GallerySelectionSummaryProps {
  galleryId: string
  folderBreakdown: SelectionCounts[]
  totalSelections: number
  totalPhotos: number
}

export function GallerySelectionSummary({ galleryId, folderBreakdown, ... }: GallerySelectionSummaryProps)
```

#### 3. Photographer Analytics Dashboard (`components/admin/SelectionAnalytics.tsx`)
```typescript
interface SelectionAnalyticsProps {
  photographerId: string
  galleries: GallerySelectionSummary[]
  filters: AnalyticsFilters
  onFilterChange: (filters: AnalyticsFilters) => void
}

export function SelectionAnalytics({ photographerId, galleries, ... }: SelectionAnalyticsProps)
```

## Data Models

### Existing Models (No Changes Required)
The feature leverages existing database models:
- `LikedPhoto` - Tracks photo likes (primary selection indicator)
- `FavoritedPhoto` - Tracks photo favorites (secondary selection indicator)  
- `PostPhoto` - Tracks photos marked for posting (tertiary selection indicator)
- `Photo` - Contains photo metadata and folder relationships
- `Folder` - Contains folder structure and photo counts
- `Gallery` - Contains gallery metadata and folder relationships

### New Computed Fields
Selection counts will be calculated dynamically using aggregation queries:

```sql
-- Folder selection counts
SELECT 
  f.id as folderId,
  f.name as folderName,
  COUNT(p.id) as totalPhotos,
  COUNT(DISTINCT COALESCE(lp.photoId, fp.photoId, pp.photoId)) as selectedPhotos,
  COUNT(lp.photoId) as likedPhotos,
  COUNT(fp.photoId) as favoritedPhotos,
  COUNT(pp.photoId) as postedPhotos
FROM folders f
LEFT JOIN photos p ON p.folderId = f.id
LEFT JOIN liked_photos lp ON lp.photoId = p.id AND lp.userId = ?
LEFT JOIN favorited_photos fp ON fp.photoId = p.id AND fp.userId = ?
LEFT JOIN post_photos pp ON pp.photoId = p.id AND pp.userId = ?
WHERE f.id = ?
GROUP BY f.id, f.name
```

## Error Handling

### Client-Side Error Handling
- **Network Failures**: Retry logic for selection count updates with exponential backoff
- **Stale Data**: Refresh selection counts when returning to gallery after extended absence
- **Permission Errors**: Clear error messages when user lacks access to analytics

### Server-Side Error Handling
- **Database Errors**: Graceful degradation when selection counts cannot be calculated
- **Performance Issues**: Query timeouts and fallback to cached counts
- **Authorization Failures**: Proper HTTP status codes and error messages

### Data Consistency
- **Selection Sync**: Ensure selection counts remain consistent with actual photo interactions
- **Cleanup Operations**: Handle photo/folder deletions by updating related selection counts
- **Migration Safety**: Provide tools to recalculate counts if inconsistencies are detected

## Testing Strategy

### Unit Tests
- **Selection Analytics Service**: Test count calculations with various selection combinations
- **API Endpoints**: Test authorization, filtering, and response formats
- **Frontend Components**: Test counter displays and real-time updates

### Integration Tests
- **End-to-End Selection Flow**: Test photo selection → count update → display refresh
- **Multi-User Scenarios**: Test selection counts with multiple clients in same gallery
- **Performance Tests**: Test selection count queries with large datasets

### Test Data Scenarios
- **Empty Galleries**: Galleries with no photos or selections
- **Mixed Selections**: Folders with various combinations of likes/favorites/posts
- **Large Datasets**: Galleries with 1000+ photos across multiple folders
- **Edge Cases**: Deleted photos, renamed folders, expired galleries

## Performance Considerations

### Database Optimization
- **Indexed Queries**: Ensure proper indexes on userId, photoId, folderId for selection tables
- **Query Caching**: Cache frequently accessed selection counts with appropriate TTL
- **Batch Operations**: Group selection count updates to reduce database load

### Frontend Optimization
- **Lazy Loading**: Load selection counts only when folders are viewed
- **Debounced Updates**: Batch rapid selection changes to prevent excessive API calls
- **Optimistic Updates**: Update UI immediately, sync with server in background

### Scalability
- **Pagination**: Implement pagination for photographer analytics with large gallery counts
- **Background Processing**: Move heavy analytics calculations to background jobs
- **CDN Integration**: Cache static selection count data at edge locations

## Security Considerations

### Access Control
- **Gallery Permissions**: Verify user has access to gallery before showing selection counts
- **Photographer Analytics**: Restrict analytics access to gallery owners only
- **Data Privacy**: Ensure selection counts don't leak information about other users

### Data Validation
- **Input Sanitization**: Validate all filter parameters and user inputs
- **Rate Limiting**: Prevent abuse of analytics endpoints
- **Audit Logging**: Log access to sensitive selection analytics data