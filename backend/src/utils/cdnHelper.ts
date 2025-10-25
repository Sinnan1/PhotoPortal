/**
 * CDN Helper - Converts B2 URLs to CDN URLs when CDN is configured
 */

const CDN_URL = process.env.CDN_URL;
const B2_ENDPOINT = `https://s3.${process.env.AWS_REGION || 'us-west-004'}.backblazeb2.com`;
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

/**
 * Convert a B2 URL to CDN URL if CDN is configured
 */
export function toCDNUrl(b2Url: string): string {
    if (!CDN_URL) {
        return b2Url; // No CDN configured, return original URL
    }

    // Replace B2 endpoint with CDN URL
    const cdnUrl = b2Url.replace(
        `${B2_ENDPOINT}/${BUCKET_NAME}`,
        CDN_URL
    );

    return cdnUrl;
}

/**
 * Generate photo URLs with CDN support
 */
export function generatePhotoUrls(key: string) {
    const bucketName = BUCKET_NAME!;
    const endpoint = B2_ENDPOINT;
    
    const originalUrl = `${endpoint}/${bucketName}/${key}`;
    
    // Extract base name for thumbnails
    const keyBaseName = key.substring(0, key.lastIndexOf('.')) || key;
    const galleryId = key.split('/')[0];
    
    const thumbnailKey = `${galleryId}/thumbnails/${keyBaseName.split('/').pop()}_small.jpg`;
    const mediumKey = `${galleryId}/thumbnails/${keyBaseName.split('/').pop()}_medium.jpg`;
    const largeKey = `${galleryId}/thumbnails/${keyBaseName.split('/').pop()}_large.jpg`;
    
    return {
        originalUrl: toCDNUrl(originalUrl),
        thumbnailUrl: toCDNUrl(`${endpoint}/${bucketName}/${thumbnailKey}`),
        mediumUrl: toCDNUrl(`${endpoint}/${bucketName}/${mediumKey}`),
        largeUrl: toCDNUrl(`${endpoint}/${bucketName}/${largeKey}`)
    };
}
