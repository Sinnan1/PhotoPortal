/**
 * CDN Helper - Converts B2 URLs to CDN URLs when CDN is configured
 */

const CDN_URL = process.env.CDN_URL;
// Use correct S3-compatible URL format: bucket-name.s3.region.backblazeb2.com
const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION || 'us-west-004';
const B2_ENDPOINT = `https://${BUCKET_NAME}.s3.${AWS_REGION}.backblazeb2.com`;

/**
 * Convert a B2 URL to CDN URL if CDN is configured
 */
export function toCDNUrl(b2Url: string): string {
    if (!CDN_URL) {
        return b2Url; // No CDN configured, return original URL
    }

    // Replace B2 endpoint with CDN URL
    const cdnUrl = b2Url.replace(B2_ENDPOINT, CDN_URL);

    return cdnUrl;
}

/**
 * Generate photo URLs with CDN support
 */
export function generatePhotoUrls(key: string) {
    const endpoint = B2_ENDPOINT;
    
    // S3-compatible URL format: https://bucket-name.s3.region.backblazeb2.com/path/to/file
    const originalUrl = `${endpoint}/${key}`;
    
    // Extract base name for thumbnails
    const keyBaseName = key.substring(0, key.lastIndexOf('.')) || key;
    const galleryId = key.split('/')[0];
    
    const thumbnailKey = `${galleryId}/thumbnails/${keyBaseName.split('/').pop()}_small.jpg`;
    const mediumKey = `${galleryId}/thumbnails/${keyBaseName.split('/').pop()}_medium.jpg`;
    const largeKey = `${galleryId}/thumbnails/${keyBaseName.split('/').pop()}_large.jpg`;
    
    return {
        originalUrl: toCDNUrl(originalUrl),
        thumbnailUrl: toCDNUrl(`${endpoint}/${thumbnailKey}`),
        mediumUrl: toCDNUrl(`${endpoint}/${mediumKey}`),
        largeUrl: toCDNUrl(`${endpoint}/${largeKey}`)
    };
}
