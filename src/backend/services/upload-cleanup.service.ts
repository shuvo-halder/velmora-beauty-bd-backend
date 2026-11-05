import { prisma } from "../config/db";
import { cloudinary, isCloudinaryConfigured } from "../config/cloudinary";

export class UploadCleanupService {
  static async cleanupExpiredReviewUploads() {
    console.log("[UploadCleanup] Starting cleanup of expired PENDING uploads...");
    const expiryHours = Number(process.env.REVIEW_UPLOAD_EXPIRY_HOURS) || 24;
    const thresholdDate = new Date(Date.now() - expiryHours * 60 * 60 * 1000);

    const candidates = await prisma.uploadTracker.findMany({
      where: {
        status: "PENDING",
        createdAt: { lt: thresholdDate }
      },
      take: 100,
      select: { id: true }
    });

    if (candidates.length === 0) {
      return { success: true, deleted: 0 };
    }

    const candidateIds = candidates.map(c => c.id);

    const lockResult = await prisma.uploadTracker.updateMany({
      where: { 
        id: { in: candidateIds }, 
        status: "PENDING"
      },
      data: { status: "PROCESSING" }
    });

    if (lockResult.count === 0) {
      return { success: true, deleted: 0 };
    }

    const lockedTrackers = await prisma.uploadTracker.findMany({
      where: { 
        id: { in: candidateIds }, 
        status: "PROCESSING" 
      }
    });

    let deletedCount = 0;

    for (const tracker of lockedTrackers) {
      try {
        if (tracker.publicId && isCloudinaryConfigured()) {
          await cloudinary.uploader.destroy(tracker.publicId);
        }
        await prisma.uploadTracker.delete({ where: { id: tracker.id } });
        deletedCount++;
      } catch (error: any) {
        if (error?.http_code === 404) {
          await prisma.uploadTracker.delete({ where: { id: tracker.id } }).catch(() => {});
          deletedCount++;
        } else {
          console.error("[UploadCleanup] Failed to clean up tracker " + tracker.id + " (" + tracker.publicId + "):", error.message);
          await prisma.uploadTracker.update({
            where: { id: tracker.id },
            data: { status: "PENDING" }
          }).catch(() => {});
        }
      }
    }

    if (deletedCount > 0) {
      console.log("[UploadCleanup] Cleanup complete. Deleted " + deletedCount + " orphaned uploads.");
    }
    return { success: true, deleted: deletedCount };
  }

  static startCleanupJob() {
    const isEnabled = process.env.REVIEW_UPLOAD_CLEANUP_ENABLED !== "false";
    if (!isEnabled) {
      console.log("[UploadCleanup] Review upload cleanup job is disabled via configuration.");
      return;
    }

    const intervalMinutes = Number(process.env.REVIEW_UPLOAD_CLEANUP_INTERVAL) || 60;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`[UploadCleanup] Scheduling review upload cleanup job every ${intervalMinutes} minutes.`);

    setInterval(async () => {
      try {
        await this.cleanupExpiredReviewUploads();
      } catch (error) {
        console.error("[UploadCleanup] Unexpected error during scheduled cleanup:", error);
      }
    }, intervalMs);
  }
}
