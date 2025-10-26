import { Request, Response } from "express";
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { UPLOAD_CONFIG } from "../config/uploadConfig";

const prisma = new PrismaClient();

// B2 S3-Compatible Client Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-005",
  endpoint: `https://s3.${
    process.env.AWS_REGION || "us-east-005"
  }.backblazeb2.com`,
  forcePathStyle: true, // Required for B2
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Enhanced error handling for B2 operations
const handleB2Error = (error: any, operation: string) => {
  console.error(`B2 ${operation} error:`, error);
  return {
    success: false,
    error: error instanceof Error ? error.message : `${operation} failed`,
  };
};

export const createMultipartUpload = async (req: Request, res: Response) => {
  try {
    const { filename, contentType, galleryId, folderId } = req.body;
    const photographerId = (req as any).user?.id;

    // Validate required fields
    if (!filename || !contentType || !galleryId || !folderId) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: filename, contentType, galleryId, folderId",
      });
    }

    // Verify folder exists and belongs to photographer
    const folder = await prisma.folder.findFirst({
      where: { id: folderId },
      include: { gallery: true },
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: "Folder not found",
      });
    }

    if (folder.gallery.photographerId !== photographerId) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    // Generate unique B2 key with proper structure
    const uniqueId = uuidv4();
    const fileExtension = path.extname(filename);
    const baseName = path.basename(filename, fileExtension);
    const b2Key = `${galleryId}/${uniqueId}_${baseName}${fileExtension}`;

    console.log(`🚀 Creating B2 multipart upload: ${filename} -> ${b2Key}`);

    const command = new CreateMultipartUploadCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: b2Key,
      ContentType: contentType,
      Metadata: {
        originalFilename: filename,
        galleryId,
        folderId,
        photographerId,
        uploadedAt: new Date().toISOString(),
        storageProvider: "backblaze-b2",
      },
    });

    const result = await s3Client.send(command);

    console.log(`✅ B2 multipart upload created: ${result.UploadId}`);

    res.json({
      success: true,
      uploadId: result.UploadId,
      key: result.Key,
      originalFilename: filename,
    });
  } catch (error) {
    const errorResponse = handleB2Error(error, "Create multipart upload");
    res.status(500).json(errorResponse);
  }
};

export const signMultipartPart = async (req: Request, res: Response) => {
  try {
    const { key, uploadId, partNumber } = req.query;

    // Validate required parameters
    if (!key || !uploadId || !partNumber) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: key, uploadId, partNumber",
      });
    }

    const partNum = parseInt(partNumber as string);
    if (isNaN(partNum) || partNum < 1 || partNum > 10000) {
      return res.status(400).json({
        success: false,
        error: "Invalid part number. Must be between 1 and 10000",
      });
    }

    console.log(`🔑 Signing B2 part ${partNum} for upload ${uploadId}`);

    const command = new UploadPartCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key as string,
      UploadId: uploadId as string,
      PartNumber: partNum,
    });

    // Generate signed URL for B2 with 1 hour expiration
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    console.log(`✅ B2 signed URL generated for part ${partNum}`);

    res.json({
      success: true,
      signedUrl,
      partNumber: partNum,
      expiresIn: 3600,
    });
  } catch (error) {
    const errorResponse = handleB2Error(error, "Sign multipart part");
    res.status(500).json(errorResponse);
  }
};

export const completeMultipartUpload = async (req: Request, res: Response) => {
  try {
    const { key, uploadId, parts } = req.body;

    // Validate required fields
    if (!key || !uploadId || !parts || !Array.isArray(parts)) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: key, uploadId, parts",
      });
    }

    // Validate parts array
    if (parts.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Parts array cannot be empty",
      });
    }

    // Validate each part has required fields
    for (const part of parts) {
      if (!part.ETag || !part.PartNumber) {
        return res.status(400).json({
          success: false,
          error: "Each part must have ETag and PartNumber",
        });
      }
    }

    console.log(
      `🔗 Completing B2 multipart upload: ${uploadId} with ${parts.length} parts`
    );

    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber), // Ensure parts are in order
      },
    });

    const result = await s3Client.send(command);

    console.log(`✅ B2 multipart upload completed: ${result.Key}`);

    res.json({
      success: true,
      location: result.Location,
      bucket: result.Bucket,
      key: result.Key,
      etag: result.ETag,
      partsCount: parts.length,
    });
  } catch (error) {
    const errorResponse = handleB2Error(error, "Complete multipart upload");
    res.status(500).json(errorResponse);
  }
};

export const uploadPartProxy = async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== "string") {
      return res.status(400).json({
        success: false,
        error: "URL parameter is required",
      });
    }

    const bodySize = req.body?.length || 0;
    console.log(`📤 Proxying upload to B2: ${bodySize} bytes`);

    // Set timeout for the B2 upload
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      UPLOAD_CONFIG.CHUNK_UPLOAD_TIMEOUT
    );

    const response = await fetch(url, {
      method: "PUT",
      body: req.body,
      headers: {
        "Content-Type":
          req.headers["content-type"] || "application/octet-stream",
        "Content-Length": bodySize.toString(),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`📊 B2 response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("❌ B2 upload failed:", errorText);
      throw new Error(
        `B2 upload failed with status: ${response.status} - ${errorText}`
      );
    }

    const etag = response.headers.get("etag") || response.headers.get("ETag");
    console.log(`✅ B2 upload successful, ETag: ${etag}`);

    if (!etag) {
      throw new Error("Missing ETag from B2 response");
    }

    res.json({
      success: true,
      etag,
      contentLength: bodySize,
    });
  } catch (error) {
    const errorResponse = handleB2Error(error, "Upload part proxy");
    res.status(500).json(errorResponse);
  }
};

export const registerPhoto = async (req: Request, res: Response) => {
  try {
    const { key, filename, folderId, fileSize, uploadSessionId } = req.body;
    const photographerId = (req as any).user?.id;

    // Validate required fields
    if (!key || !filename || !folderId || !photographerId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: key, filename, folderId",
      });
    }

    // Validate file size
    if (fileSize && fileSize > UPLOAD_CONFIG.MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        error: `File size ${fileSize} exceeds maximum allowed size of ${UPLOAD_CONFIG.MAX_FILE_SIZE}`,
      });
    }

    console.log(
      `📝 Registering photo in B2: ${filename} (${fileSize || 0} bytes)`
    );

    // Verify folder exists and belongs to photographer
    const folder = await prisma.folder.findFirst({
      where: { id: folderId },
      include: { gallery: true },
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: "Folder not found",
      });
    }

    if (folder.gallery.photographerId !== photographerId) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    // Generate B2 URLs
    const bucketName = process.env.S3_BUCKET_NAME!;
    const endpoint = `https://s3.${
      process.env.AWS_REGION || "us-east-005"
    }.backblazeb2.com`;
    const originalUrl = `${endpoint}/${bucketName}/${key}`;

    // Create photo record in database WITHOUT thumbnails (will be generated async)
    const photo = await prisma.photo.create({
      data: {
        filename,
        originalUrl,
        thumbnailUrl: null, // Will be set by thumbnail queue
        mediumUrl: null,
        largeUrl: null,
        thumbnailStatus: "PENDING",
        uploadStatus: "COMPLETED",
        fileSize: fileSize || 0,
        folderId,
        uploadSessionId: uploadSessionId || null,
      },
    });

    console.log(`✅ Photo registered in database: ${photo.id}`);

    // Queue thumbnail generation (non-blocking)
    const { thumbnailQueue } = await import("../services/thumbnailQueue");
    await thumbnailQueue.add({
      photoId: photo.id,
      s3Key: key,
      galleryId: folder.galleryId,
      originalFilename: filename,
    });

    console.log(`📸 Thumbnail generation queued for: ${filename}`);

    // Update upload session if provided
    if (uploadSessionId) {
      try {
        const { uploadSessionService } = await import(
          "../services/uploadSessionService"
        );
        const session = await uploadSessionService.getSession(uploadSessionId);
        if (session) {
          await uploadSessionService.updateProgress(
            uploadSessionId,
            session.uploadedFiles + 1,
            session.failedFiles,
            Number(session.uploadedBytes) + (fileSize || 0)
          );
          console.log(`📊 Upload session updated: ${uploadSessionId}`);
        }
      } catch (sessionError) {
        console.warn("Failed to update upload session:", sessionError);
        // Don't fail the entire operation for session update failure
      }
    }

    res.json({
      success: true,
      photo: {
        id: photo.id,
        filename: photo.filename,
        originalUrl: photo.originalUrl,
        fileSize: photo.fileSize,
        thumbnailStatus: photo.thumbnailStatus,
        uploadStatus: photo.uploadStatus,
        createdAt: photo.createdAt,
      },
      message:
        "Photo uploaded successfully to B2. Thumbnails are being generated in the background.",
    });
  } catch (error) {
    const errorResponse = handleB2Error(error, "Register photo");
    res.status(500).json(errorResponse);
  }
};
