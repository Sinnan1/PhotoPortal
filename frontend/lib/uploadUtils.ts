import { v4 as uuidv4 } from "uuid";
import { UPLOAD_CONFIG } from "@/src/config/uploadConfig";

const CHUNK_SIZE = UPLOAD_CONFIG.CHUNK_SIZE; // 10MB chunks for multipart upload

const getUploadState = (file: File): { uploadId: string; key: string } | null => {
  const state = localStorage.getItem(`upload-${file.name}-${file.size}`);
  return state ? JSON.parse(state) : null;
};

const saveUploadState = (file: File, state: { uploadId: string; key: string }) => {
  localStorage.setItem(`upload-${file.name}-${file.size}`, JSON.stringify(state));
};

const clearUploadState = (file: File) => {
  localStorage.removeItem(`upload-${file.name}-${file.size}`);
};

export async function uploadFileToB2(
  file: File,
  galleryId: string,
  folderId: string,
  onProgress: (percent: number) => void,
  token: string,
  BASE_URL: string,
  uploadSessionId?: string
): Promise<{ key: string }> {
  let uploadState = getUploadState(file);
  let key = uploadState?.key;
  let uploadId = uploadState?.uploadId;

  try {
    if (!uploadState) {
      const uniqueId = uuidv4();
      key = `${galleryId}/${uniqueId}_${file.name}`;
      // Step 1: Initialize multipart upload
      const initResponse = await fetch(`${BASE_URL}/uploads/multipart/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          galleryId,
          folderId,
        }),
      });

      if (!initResponse.ok) {
        const text = await initResponse.text().catch(() => "<no body>");
        throw new Error(
          `Failed to initialize B2 upload: ${initResponse.status} ${initResponse.statusText} - ${text}`
        );
      }

      const initData = await initResponse.json();
      if (!initData.success) {
        throw new Error(initData.error || "Failed to initialize B2 upload");
      }

      uploadId = initData.uploadId;
      key = initData.key;
      
      if (!uploadId || !key) {
        throw new Error("Failed to initialize B2 upload: missing uploadId or key");
      }
      
      saveUploadState(file, { uploadId, key });
      console.log(`✅ B2 multipart upload initialized: ${uploadId}`);
    }

    // Step 2: Split file into chunks and get signed URLs
    const chunks: Blob[] = [];
    let start = 0;
    while (start < file.size) {
      chunks.push(file.slice(start, start + CHUNK_SIZE));
      start += CHUNK_SIZE;
    }

    const parts: { ETag: string; PartNumber: number }[] = [];
    let uploadedSize = 0;

    // Ensure key and uploadId are defined before proceeding
    if (!key || !uploadId) {
      throw new Error("Upload initialization failed: missing key or uploadId");
    }

    if (uploadState) {
      const response = await fetch(`${BASE_URL}/uploads/multipart/parts?key=${encodeURIComponent(key)}&uploadId=${uploadId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const { parts: existingParts } = await response.json();
        parts.push(...existingParts);
        uploadedSize = existingParts.reduce((acc: number, part: any) => acc + part.Size, 0);
      }
    }

    // Step 3: Upload each chunk
    for (let i = 0; i < chunks.length; i++) {
      const partNumber = i + 1;
      const chunk = chunks[i];

      if (parts.some(p => p.PartNumber === partNumber)) {
        continue;
      }

      // Get signed URL for this part
      const signResponse = await fetch(
        `${BASE_URL}/uploads/multipart/sign?key=${encodeURIComponent(
          key
        )}&uploadId=${uploadId}&partNumber=${partNumber}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!signResponse.ok) {
        const error = await signResponse.text();
        throw new Error(`Failed to get B2 signed URL: ${error}`);
      }

      const signData = await signResponse.json();
      if (!signData.success) {
        throw new Error(signData.error || "Failed to get B2 signed URL");
      }

      const { signedUrl } = signData;

      // Upload chunk through backend proxy to avoid CORS issues
      console.debug("Uploading part", partNumber, "via proxy");
      const uploadResponse = await fetch(
        `${BASE_URL}/uploads/multipart/upload?url=${encodeURIComponent(
          signedUrl
        )}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/octet-stream",
          },
          credentials: "include",
          body: chunk,
        }
      );

      if (!uploadResponse.ok) {
        const text = await uploadResponse.text().catch(() => "<no body>");
        throw new Error(
          `Failed to upload B2 part ${partNumber}: ${uploadResponse.status} ${uploadResponse.statusText} - ${text}`
        );
      }

      // Get ETag from B2 proxy response
      const uploadResult = await uploadResponse.json();
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "B2 upload part failed");
      }

      const etag = uploadResult.etag;
      if (!etag) {
        throw new Error("Missing ETag from B2 upload response");
      }

      parts.push({
        ETag: etag,
        PartNumber: partNumber,
      });

      // Update progress
      uploadedSize += chunk.size;
      onProgress(Math.round((uploadedSize / file.size) * 100));
    }

    // Step 4: Complete multipart upload
    const completeResponse = await fetch(
      `${BASE_URL}/uploads/multipart/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key,
          uploadId,
          parts,
        }),
      }
    );

    if (!completeResponse.ok) {
      const text = await completeResponse.text().catch(() => "<no body>");
      throw new Error(
        `Failed to complete B2 upload: ${completeResponse.status} ${completeResponse.statusText} - ${text}`
      );
    }

    const completeData = await completeResponse.json();
    if (!completeData.success) {
      throw new Error(completeData.error || "Failed to complete B2 upload");
    }

    console.log(`✅ B2 multipart upload completed: ${completeData.key}`);
    clearUploadState(file);

    // Step 5: Generate thumbnail
    const thumbnailResponse = await fetch(
      `${BASE_URL}/uploads/thumbnail/generate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key,
          galleryId,
        }),
      }
    );

    if (!thumbnailResponse.ok) {
      const text = await thumbnailResponse.text().catch(() => "<no body>");
      console.warn(
        "Thumbnail generation may have failed, but file upload succeeded:",
        thumbnailResponse.status,
        thumbnailResponse.statusText,
        text
      );
    }

    // Step 6: Register photo in database
    const registerResponse = await fetch(`${BASE_URL}/uploads/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        filename: file.name,
        folderId,
        fileSize: file.size,
        uploadSessionId,
      }),
    });

    if (!registerResponse.ok) {
      const text = await registerResponse.text().catch(() => "<no body>");
      throw new Error(
        `Failed to register photo in B2: ${registerResponse.status} ${registerResponse.statusText} - ${text}`
      );
    }

    const registerData = await registerResponse.json();
    if (!registerData.success) {
      throw new Error(registerData.error || "Failed to register photo in B2");
    }

    console.log(`✅ Photo registered in B2: ${registerData.photo.id}`);
    return { key };
  } catch (error) {
    console.error("Upload failed:", error instanceof Error ? error.message : String(error));

    // If multipart upload was initialized, try to abort it
    if (uploadId) {
      try {
        await fetch(`${BASE_URL}/uploads/multipart/abort`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ key, uploadId }),
        });
        console.log(`🧹 Aborted multipart upload: ${uploadId}`);
      } catch (abortError) {
        console.error("Failed to abort multipart upload:", abortError);
      }
    }

    throw error;
  }
}
