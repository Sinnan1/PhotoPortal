import { v4 as uuidv4 } from 'uuid'

const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks for multipart upload

export async function uploadFileToB2(
    file: File, 
    galleryId: string,
    folderId: string,
    onProgress: (percent: number) => void,
    token: string,
    BASE_URL: string
): Promise<{ key: string; photo: any }> {
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

        // Step 2: Upload chunks one at a time (streaming approach)
        const parts: { ETag: string, PartNumber: number }[] = []
        let uploadedSize = 0
        let start = 0
        let partNumber = 1

        // Step 3: Upload each chunk immediately (no memory storage)
        while (start < file.size) {
            const chunk = file.slice(start, start + CHUNK_SIZE)

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

            // Upload chunk through backend proxy to avoid CORS issues
            console.log('Uploading part', partNumber, 'through backend proxy')
            console.log('Chunk size:', chunk.size, 'bytes')
            const uploadResponse = await fetch(`${BASE_URL}/uploads/multipart/upload?url=${encodeURIComponent(signedUrl)}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/octet-stream'
                },
                body: chunk
            })
            
            console.log('Upload response status:', uploadResponse.status, uploadResponse.statusText)

            if (!uploadResponse.ok) {
                const text = await uploadResponse.text().catch(() => '<no body>')
                throw new Error(`Failed to upload part ${partNumber}: ${uploadResponse.status} ${uploadResponse.statusText} - ${text}`)
            }

            const responseData = await uploadResponse.json()
            const etag = responseData.etag
            
            if (!etag) {
                throw new Error('Missing ETag from upload response')
            }

            parts.push({
                ETag: etag,
                PartNumber: partNumber
            })

            // Update progress
            uploadedSize += chunk.size
            const progressPercent = Math.round((uploadedSize / file.size) * 100)
            console.log(`Progress: ${progressPercent}% (${uploadedSize}/${file.size} bytes)`)
            onProgress(progressPercent)
            
            // Move to next chunk
            start += CHUNK_SIZE
            partNumber++
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

        const { photo } = await registerResponse.json()

        return { key, photo }
    } catch (error) {
        console.error('Upload failed:', error)
        throw error
    }
}