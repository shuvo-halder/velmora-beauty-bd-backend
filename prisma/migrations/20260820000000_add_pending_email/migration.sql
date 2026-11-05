-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "pendingEmail" TEXT,
ADD COLUMN     "pendingEmailVerificationExpires" TIMESTAMP(3),
ADD COLUMN     "pendingEmailVerificationToken" TEXT;

