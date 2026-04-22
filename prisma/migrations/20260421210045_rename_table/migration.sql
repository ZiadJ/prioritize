/*
  Warnings:

  - You are about to drop the `ProposalStepCost` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `relationType` on the `Effect` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('Enabler', 'Disabler', 'Multiplier', 'Incrementor');

-- DropForeignKey
ALTER TABLE "ProposalStepCost" DROP CONSTRAINT "ProposalStepCost_resourceNodeId_fkey";

-- DropForeignKey
ALTER TABLE "ProposalStepCost" DROP CONSTRAINT "ProposalStepCost_stepNodeId_fkey";

-- DropForeignKey
ALTER TABLE "RevisionNode" DROP CONSTRAINT "RevisionNode_stepCostId_fkey";

-- DropForeignKey
ALTER TABLE "_StepCostToTag" DROP CONSTRAINT "_StepCostToTag_A_fkey";

-- AlterTable
ALTER TABLE "Effect" DROP COLUMN "relationType",
ADD COLUMN     "relationType" "RelationType" NOT NULL;

-- AlterTable
ALTER TABLE "Request" ALTER COLUMN "isActive" SET DEFAULT true;

-- DropTable
DROP TABLE "ProposalStepCost";

-- DropEnum
DROP TYPE "relationType";

-- CreateTable
CREATE TABLE "StepCost" (
    "id" SERIAL NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDirty" BOOLEAN,
    "resourceNodeId" INTEGER,
    "stepNodeId" INTEGER,
    "duration" INTEGER NOT NULL,
    "riskFactor" INTEGER NOT NULL,
    "isOpportunistic" BOOLEAN NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "quantityMargin" DOUBLE PRECISION NOT NULL,
    "costVariationType" INTEGER NOT NULL,

    CONSTRAINT "StepCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StepCost_title_key" ON "StepCost"("title");

-- CreateIndex
CREATE UNIQUE INDEX "StepCost_resourceNodeId_stepNodeId_key" ON "StepCost"("resourceNodeId", "stepNodeId");

-- AddForeignKey
ALTER TABLE "RevisionNode" ADD CONSTRAINT "RevisionNode_stepCostId_fkey" FOREIGN KEY ("stepCostId") REFERENCES "StepCost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepCost" ADD CONSTRAINT "StepCost_resourceNodeId_fkey" FOREIGN KEY ("resourceNodeId") REFERENCES "ResourceNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepCost" ADD CONSTRAINT "StepCost_stepNodeId_fkey" FOREIGN KEY ("stepNodeId") REFERENCES "StepNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StepCostToTag" ADD CONSTRAINT "_StepCostToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "StepCost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
