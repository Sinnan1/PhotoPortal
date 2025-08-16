# Backblaze B2 Native API Migration Guide

## Overview

This guide documents the migration from S3-compatible API to native Backblaze B2 API for delete operations. The migration was implemented to resolve issues with file deletion and take advantage of B2's native `b2_delete_file_version` functionality.

## What Changed

### 1. New B2 Storage Utility (`src/utils/b2Storage.ts`)

- **Native B2 Client**: Uses the `backblaze-b2` npm package instead of AWS SDK
- **Improved Delete Operations**: Uses `b2_delete_file_version` for precise file deletion
- **Better Error Handling**: Handles B2-specific error cases more effectively
- **Batch Operations**: Optimized batch deletion with rate limiting

### 2. Updated Controllers

**Files Modified:**
- `src/controllers/photoController.ts`
- `src/controllers/galleryController.ts`

**Changes Made:**
- Replaced `deleteFromS3` imports with `deleteFromB2`
- All delete operations now use native B2 API

### 3. Environment Variables

The migration reuses existing environment variables:
- `AWS_ACCESS_KEY_ID` → Used as B2 Application Key ID
- `AWS_SECRET_ACCESS_KEY` → Used as B2 Application Key
- `S3_BUCKET_NAME` → Used as B2 Bucket Name

## Key Benefits

### 1. **Precise File Version Control**
- Uses `b2_delete_file_version` with specific `fileId` and `fileName`
- Eliminates potential versioning issues with S3-compatible API
- Perfect for single-version file configurations

### 2. **Better Error Handling**
- Native B2 error codes and messages
- Graceful handling of non-existent files
- More detailed logging for debugging

### 3. **Improved Performance**
- Direct B2 API calls without S3 compatibility layer
- Optimized batch operations with configurable batch sizes
- Built-in rate limiting to respect API limits

### 4. **Enhanced Debugging**
- File info retrieval functions
- Directory listing capabilities
- Comprehensive logging

## API Differences

### Old S3-Compatible API
```typescript
import { deleteFromS3 } from '../utils/s3Storage'

// Simple delete by key
await deleteFromS3(filename)
```

### New Native B2 API
```typescript
import { deleteFromB2 } from '../utils/b2Storage'

// Delete with file version lookup
await deleteFromB2(filename)
```

## How It Works

### 1. **Authorization Process**
```typescript
// Automatic authorization and bucket ID resolution
await authorizeB2() // Called automatically
```

### 2. **File Deletion Process**
1. **Authorize**: Authenticate with B2 API
2. **Lookup**: Find file version using `listFileVersions`
3. **Delete**: Remove specific version using `deleteFileVersion`
4. **Verify**: Confirm deletion or handle gracefully if file doesn't exist

### 3. **Batch Deletion**
- Processes files in configurable batches (default: 10)
- Includes delays between batches to respect API limits
- Continues processing even if individual files fail

## Testing

### Run B2 Integration Test
```bash
npm run test-b2
```

This test script:
- ✅ Verifies B2 connection and authorization
- ✅ Lists files to confirm bucket access
- ✅ Tests file info retrieval
- ✅ Tests delete operations safely (non-existent files)
- ✅ Tests batch delete operations

## Troubleshooting

### Common Issues

1. **Authorization Failures**
   - Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
   - Ensure B2 application key has proper permissions
   - Check that bucket name in `S3_BUCKET_NAME` is correct

2. **File Not Found Errors**
   - These are handled gracefully and logged
   - No error thrown for non-existent files (expected behavior)

3. **Rate Limiting**
   - Built-in delays between batch operations
   - Configurable batch sizes to prevent overwhelming API

### Debug Mode

Enable detailed logging by checking console output during operations. The B2 utility provides comprehensive logging for:
- Authorization status
- File lookup results
- Deletion confirmations
- Error details

## Rollback Plan

If needed, you can rollback by:

1. **Revert Controller Changes**
   ```typescript
   // Change back to S3 imports
   import { deleteFromS3 } from '../utils/s3Storage'
   ```

2. **Update Function Calls**
   ```typescript
   // Change deleteFromB2 back to deleteFromS3
   await deleteFromS3(filename)
   ```

The original S3 storage utility (`s3Storage.ts`) remains unchanged and functional.

## Performance Considerations

- **Single File Deletion**: Slightly slower due to file lookup, but more reliable
- **Batch Operations**: Optimized with batching and rate limiting
- **Memory Usage**: Minimal impact, no significant changes
- **API Calls**: More precise, fewer unnecessary operations

## Future Enhancements

1. **Upload Migration**: Consider migrating uploads to native B2 API
2. **Caching**: Implement bucket ID and file info caching
3. **Monitoring**: Add metrics for B2 API usage
4. **Retry Logic**: Implement exponential backoff for failed operations

## Conclusion

The migration to native B2 API provides better control over file deletion operations, improved error handling, and takes full advantage of Backblaze B2's capabilities. The implementation maintains backward compatibility while providing enhanced functionality for single-version file management.