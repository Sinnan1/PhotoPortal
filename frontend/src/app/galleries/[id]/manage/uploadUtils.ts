import { v4 as uuidv4 } from 'uuid'

const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks for multipart upload

export async function uploadFileToB2(
    file: File,
    galleryId: string,
    folderId: string,
    onProgress: (percent: number) => void,
    token: string,
    BASE_URL: string
): Promise<{ key: string }> {
    const uniqueId = uuidv4()
    const key = `${galleryId}/${uniqueId}_${file.name}`

    try {
        // Step 1: Initialize multipart upload
        const initResponse = await fetch(`${BASE_URL}/uploads/multipart/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                filename: key,
                contentType: file.type || 'application/octet-stream'
            })
        })

        if (!initResponse.ok) {
            const text = await initResponse.text().catch(() => '<no body>')
            throw new Error(`Failed to initialize upload: ${initResponse.status} ${initResponse.statusText} - ${text}`)
        }

        const { uploadId } = await initResponse.json()

        // Step 2: Split file into chunks and get signed URLs
        const chunks: Blob[] = []
        let start = 0
        while (start < file.size) {
            chunks.push(file.slice(start, start + CHUNK_SIZE))
            start += CHUNK_SIZE
        }

        const parts: { ETag: string, PartNumber: number }[] = []
        let uploadedSize = 0

        // Step 3: Upload each chunk
        for (let i = 0; i < chunks.length; i++) {
            const partNumber = i + 1
            const chunk = chunks[i]

            // Get signed URL for this part
            const signResponse = await fetch(
                `${BASE_URL}/uploads/multipart/sign?key=${encodeURIComponent(key)}&uploadId=${uploadId}&partNumber=${partNumber}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }
            )

            if (!signResponse.ok) {
                const error = await signResponse.text()
                throw new Error(`Failed to get signed URL: ${error}`)
            }

            const { signedUrl } = await signResponse.json()

            // Upload chunk directly to B2 (no credentials, set content-type)
            console.debug('Uploading part', partNumber, 'to signedUrl:', signedUrl)
            const uploadResponse = await fetch(signedUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/octet-stream'
                },
                body: chunk
            })

            if (!uploadResponse.ok) {
                const text = await uploadResponse.text().catch(() => '<no body>')
                throw new Error(`Failed to upload part ${partNumber}: ${uploadResponse.status} ${uploadResponse.statusText} - ${text}`)
            }

            const etag = uploadResponse.headers.get('ETag') || uploadResponse.headers.get('etag')
            if (!etag) {
                throw new Error('Missing ETag from upload response')
            }

            parts.push({
                ETag: etag,
                PartNumber: partNumber
            })

            // Update progress
            uploadedSize += chunk.size
            onProgress(Math.round((uploadedSize / file.size) * 100))
        }

        // Step 4: Complete multipart upload
        const completeResponse = await fetch(`${BASE_URL}/uploads/multipart/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key,
                uploadId,
                parts
            })
        })

        if (!completeResponse.ok) {
            const text = await completeResponse.text().catch(() => '<no body>')
            throw new Error(`Failed to complete upload: ${completeResponse.status} ${completeResponse.statusText} - ${text}`)
        }

        // Step 5: Generate thumbnail
        const thumbnailResponse = await fetch(`${BASE_URL}/uploads/thumbnail/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key,
                galleryId
            })
        })

        if (!thumbnailResponse.ok) {
            const text = await thumbnailResponse.text().catch(() => '<no body>')
            console.warn('Thumbnail generation may have failed, but file upload succeeded:', thumbnailResponse.status, thumbnailResponse.statusText, text)
        }

        // Step 6: Register photo in database
        const registerResponse = await fetch(`${BASE_URL}/uploads/register`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key,
                filename: file.name,
                folderId,
                fileSize: file.size
            })
        })

        if (!registerResponse.ok) {
            const text = await registerResponse.text().catch(() => '<no body>')
            throw new Error(`Failed to register photo: ${registerResponse.status} ${registerResponse.statusText} - ${text}`)
        }

        return { key }
    } catch (error) {
        console.error('Upload failed:', error)
        throw error
    }
}