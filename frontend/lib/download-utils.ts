/**
 * Utility functions for download functionality
 */

/**
 * Generates a descriptive filename for filtered photo downloads
 * @param galleryTitle - The title of the gallery
 * @param filterType - The type of filter ('liked' | 'favorited')
 * @param photoCount - Number of photos in the download
 * @returns A clean, descriptive filename
 */
export function generateFilteredDownloadFilename(
  galleryTitle: string,
  filterType: 'liked' | 'favorited',
  photoCount: number
): string {
  // Clean the gallery title for use in filename
  const cleanTitle = galleryTitle
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters except spaces, hyphens, underscores
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .toLowerCase();

  // Create timestamp for uniqueness
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format

  // Generate descriptive filename
  return `${cleanTitle}_${filterType}_photos_${photoCount}items_${timestamp}.zip`;
}

/**
 * Validates if a download operation should proceed
 * @param photoCount - Number of photos to download
 * @param filterType - The type of filter
 * @returns Object with validation result and message
 */
export function validateDownloadRequest(
  photoCount: number,
  filterType: 'liked' | 'favorited'
): { isValid: boolean; message?: string } {
  if (photoCount === 0) {
    return {
      isValid: false,
      message: `No ${filterType} photos found in this gallery`
    };
  }

  if (photoCount > 1000) {
    return {
      isValid: false,
      message: `Too many photos selected (${photoCount}). Please select fewer than 1000 photos.`
    };
  }

  return { isValid: true };
}

/**
 * Formats download progress messages
 * @param status - Current download status
 * @param processedPhotos - Number of photos processed
 * @param totalPhotos - Total number of photos
 * @param filterType - The type of filter
 * @returns Formatted status message
 */
export function formatDownloadStatusMessage(
  status: 'preparing' | 'processing' | 'ready' | 'error',
  processedPhotos: number,
  totalPhotos: number,
  filterType: 'liked' | 'favorited'
): string {
  switch (status) {
    case 'preparing':
      return `Preparing ${filterType} photos download...`;
    case 'processing':
      return `Processing ${filterType} photos (${processedPhotos}/${totalPhotos})`;
    case 'ready':
      return `${filterType.charAt(0).toUpperCase() + filterType.slice(1)} photos download complete!`;
    case 'error':
      return `Failed to download ${filterType} photos`;
    default:
      return 'Processing download...';
  }
}

/**
 * Estimates download time based on photo count
 * @param totalPhotos - Total number of photos
 * @param processedPhotos - Number of photos already processed
 * @returns Estimated time remaining in seconds
 */
export function estimateDownloadTime(totalPhotos: number, processedPhotos: number): number {
  if (processedPhotos === 0 || totalPhotos === 0) {
    return 0;
  }

  // Estimate 2 seconds per photo on average
  const averageTimePerPhoto = 2;
  const remainingPhotos = totalPhotos - processedPhotos;
  
  return remainingPhotos * averageTimePerPhoto;
}

/**
 * Formats time duration in a human-readable format
 * @param seconds - Duration in seconds
 * @returns Formatted time string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.ceil(seconds)} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`;
  }
}