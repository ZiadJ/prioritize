-- CreateEnum
CREATE TYPE "RevisionType" AS ENUM ('Self', 'Suggestion', 'Deduplication', 'ModeratorFlag');

-- CreateEnum
CREATE TYPE "relationType" AS ENUM ('Enabler', 'Disabler', 'Multiplier', 'Incrementor');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ServiceTime', 'Material', 'Digital');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('Emotional', 'Observational', 'Material');

-- CreateEnum
CREATE TYPE "RequestLevel" AS ENUM ('Safety', 'Health', 'Belonging', 'Esteem', 'SelfActualization');

-- CreateEnum
CREATE TYPE "UnitOfMeasure" AS ENUM ('Unit', 'Time', 'Energy', 'Weight', 'Volume', 'Area', 'Length');

-- CreateTable
CREATE TABLE "FeedbackNode" (
    "id" SERIAL NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "path" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "numchild" INTEGER NOT NULL DEFAULT 0,
    "parentId" INTEGER,
    "userId" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requireCommentOnNeg" BOOLEAN NOT NULL,
    "requestId" INTEGER,
    "requestNodeId" INTEGER,
    "proposalNodeId" INTEGER,
    "effectId" INTEGER,

    CONSTRAINT "FeedbackNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "firstname" TEXT NOT NULL DEFAULT '',
    "lastname" TEXT NOT NULL DEFAULT '',
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "picture" TEXT,
    "githubId" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "lastTimeVisit" TIMESTAMP(3),
    "dateOfBirth" TIMESTAMP(3),
    "longitude" INTEGER NOT NULL DEFAULT 0,
    "lattitude" INTEGER NOT NULL DEFAULT 0,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" SERIAL NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRelation" (
    "id" SERIAL NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'friend',
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,

    CONSTRAINT "UserRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionNode" (
    "id" SERIAL NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDirty" BOOLEAN,
    "path" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "numchild" INTEGER NOT NULL DEFAULT 0,
    "parentId" INTEGER,
    "data" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "isApproved" BOOLEAN NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL,
    "isLastApplied" BOOLEAN NOT NULL,
    "isRejected" BOOLEAN NOT NULL,
    "rejectedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" INTEGER,
    "requestNodeId" INTEGER,
    "proposalNodeId" INTEGER,
    "stepId" INTEGER,
    "stepCostId" INTEGER,
    "effectId" INTEGER,
    "expertiseNodeId" INTEGER,
    "resourceNodeId" INTEGER,
    "effectHookId" INTEGER,

    CONSTRAINT "RevisionNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CognitiveBias" (
    "id" SERIAL NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isLogicalFallacy" BOOLEAN NOT NULL,
    "courseUrl" TEXT NOT NULL,

    CONSTRAINT "CognitiveBias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignedCognitiveBias" (
    "id" SERIAL NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL,
    "cognitiveBiasId" INTEGER NOT NULL,
    "proposalNodeId" INTEGER NOT NULL,
    "requestNodeId" INTEGER NOT NULL,

    CONSTRAINT "AssignedCognitiveBias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpertiseNode" (
    "id" SERIAL NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDirty" BOOLEAN,
    "path" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "numchild" INTEGER NOT NULL DEFAULT 0,
    "parentId" INTEGER,

    CONSTRAINT "ExpertiseNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" SERIAL NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDirty" BOOLEAN,
    "path" TEXT NOT NULL DEFAULT '',
    "depth" INTEGER NOT NULL DEFAULT 0,
    "numchild" INTEGER NOT NULL DEFAULT 0,
    "parentId" INTEGER,
    "type" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "recurrencePeriod" INTEGER NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestNode" (
    "id" SERIAL NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDirty" BOOLEAN,
    "path" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "numchild" INTEGER NOT NULL DEFAULT 0,
    "parentId" INTEGER,
    "requestId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "ppp" INTEGER NOT NULL,
    "isTemplate" BOOLEAN NOT NULL,
    "isVariantsGroup" BOOLEAN NOT NULL,
    "isNonNegotiable" BOOLEAN NOT NULL,
    "requestedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "deliveryAt" TIMESTAMP(3),

    CONSTRAINT "RequestNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" SERIAL NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDirty" BOOLEAN,
    "path" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "numchild" INTEGER NOT NULL DEFAULT 0,
    "parentId" INTEGER,
    "requestNodeId" INTEGER NOT NULL,
    "stepNodeId" INTEGER NOT NULL,
    "isComplete" BOOLEAN NOT NULL,
    "stepCount" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3),
    "duration" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL,
    "riskFactor" INTEGER NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "deliveryDays" INTEGER NOT NULL,
    "avgRating" INTEGER NOT NULL DEFAULT 0,
    "minRating" INTEGER NOT NULL,
    "maxRating" INTEGER NOT NULL,
    "isTemplate" BOOLEAN NOT NULL,
    "isDraft" BOOLEAN,
    "isUnavailable" BOOLEAN,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepNode" (
    "id" SERIAL NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDirty" BOOLEAN,
    "path" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "numchild" INTEGER NOT NULL DEFAULT 0,
    "parentId" INTEGER,
    "nextId" INTEGER,
    "resourceNodeId" INTEGER,
    "duration" INTEGER NOT NULL,
    "durationVariance" INTEGER NOT NULL,

    CONSTRAINT "StepNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalStepCost" (
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

    CONSTRAINT "ProposalStepCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Effect" (
    "id" SERIAL NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDirty" BOOLEAN,
    "requestId" INTEGER,
    "isOpportunistic" BOOLEAN NOT NULL,
    "delay" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "relationType" "relationType" NOT NULL,
    "relationFormula" TEXT NOT NULL,

    CONSTRAINT "Effect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Effector" (
    "id" SERIAL NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDirty" BOOLEAN,
    "fromId" INTEGER NOT NULL,
    "toId" INTEGER NOT NULL,
    "strength" INTEGER NOT NULL,

    CONSTRAINT "Effector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceNode" (
    "id" SERIAL NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDirty" BOOLEAN,
    "path" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "numchild" INTEGER NOT NULL DEFAULT 0,
    "parentId" INTEGER,
    "type" INTEGER NOT NULL,
    "unitOfMeasure" INTEGER NOT NULL,
    "quantityAvailable" DOUBLE PRECISION NOT NULL,
    "renewalCapacity" DOUBLE PRECISION NOT NULL,
    "managedRenewalCapacity" DOUBLE PRECISION NOT NULL,
    "minQuantity" DOUBLE PRECISION NOT NULL,
    "reservedQuantity" DOUBLE PRECISION NOT NULL,
    "monetaryValue" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ResourceNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FeedbackNodeToRevisionNode" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_FeedbackNodeToRevisionNode_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TagToUser" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TagToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ExpertiseNodeToUser" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ExpertiseNodeToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ExpertiseNodeToRequest" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ExpertiseNodeToRequest_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RequestToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_RequestToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RequestNodeToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_RequestNodeToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RelatedRequests" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_RelatedRequests_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProposalToRequestNode" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProposalToRequestNode_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProposalToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProposalToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_StepNodeToUser" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StepNodeToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_StepNodeToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_StepNodeToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_StepCostToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_StepCostToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EffectToStepNode" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_EffectToStepNode_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EffectToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_EffectToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EffectToExpertiseNode" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_EffectToExpertiseNode_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ResourceNodeToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ResourceNodeToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackNode_path_key" ON "FeedbackNode"("path");

-- CreateIndex
CREATE INDEX "FeedbackNode_path_idx" ON "FeedbackNode"("path");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackNode_requestId_requestNodeId_proposalNodeId_effectI_key" ON "FeedbackNode"("requestId", "requestNodeId", "proposalNodeId", "effectId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "Token_accessToken_key" ON "Token"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "Token_refreshToken_key" ON "Token"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "RevisionNode_path_key" ON "RevisionNode"("path");

-- CreateIndex
CREATE INDEX "RevisionNode_path_idx" ON "RevisionNode"("path");

-- CreateIndex
CREATE UNIQUE INDEX "CognitiveBias_title_key" ON "CognitiveBias"("title");

-- CreateIndex
CREATE UNIQUE INDEX "AssignedCognitiveBias_title_key" ON "AssignedCognitiveBias"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExpertiseNode_title_key" ON "ExpertiseNode"("title");

-- CreateIndex
CREATE UNIQUE INDEX "ExpertiseNode_path_key" ON "ExpertiseNode"("path");

-- CreateIndex
CREATE INDEX "ExpertiseNode_path_idx" ON "ExpertiseNode"("path");

-- CreateIndex
CREATE UNIQUE INDEX "Request_title_key" ON "Request"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Request_path_key" ON "Request"("path");

-- CreateIndex
CREATE INDEX "Request_path_idx" ON "Request"("path");

-- CreateIndex
CREATE UNIQUE INDEX "RequestNode_title_key" ON "RequestNode"("title");

-- CreateIndex
CREATE UNIQUE INDEX "RequestNode_path_key" ON "RequestNode"("path");

-- CreateIndex
CREATE INDEX "RequestNode_path_idx" ON "RequestNode"("path");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_title_key" ON "Proposal"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_path_key" ON "Proposal"("path");

-- CreateIndex
CREATE INDEX "Proposal_path_idx" ON "Proposal"("path");

-- CreateIndex
CREATE UNIQUE INDEX "StepNode_title_key" ON "StepNode"("title");

-- CreateIndex
CREATE UNIQUE INDEX "StepNode_path_key" ON "StepNode"("path");

-- CreateIndex
CREATE UNIQUE INDEX "StepNode_nextId_key" ON "StepNode"("nextId");

-- CreateIndex
CREATE INDEX "StepNode_path_idx" ON "StepNode"("path");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalStepCost_title_key" ON "ProposalStepCost"("title");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalStepCost_resourceNodeId_stepNodeId_key" ON "ProposalStepCost"("resourceNodeId", "stepNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "Effect_title_key" ON "Effect"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Effector_title_key" ON "Effector"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Effector_fromId_toId_key" ON "Effector"("fromId", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceNode_title_key" ON "ResourceNode"("title");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceNode_path_key" ON "ResourceNode"("path");

-- CreateIndex
CREATE INDEX "ResourceNode_path_idx" ON "ResourceNode"("path");

-- CreateIndex
CREATE INDEX "_FeedbackNodeToRevisionNode_B_index" ON "_FeedbackNodeToRevisionNode"("B");

-- CreateIndex
CREATE INDEX "_TagToUser_B_index" ON "_TagToUser"("B");

-- CreateIndex
CREATE INDEX "_ExpertiseNodeToUser_B_index" ON "_ExpertiseNodeToUser"("B");

-- CreateIndex
CREATE INDEX "_ExpertiseNodeToRequest_B_index" ON "_ExpertiseNodeToRequest"("B");

-- CreateIndex
CREATE INDEX "_RequestToTag_B_index" ON "_RequestToTag"("B");

-- CreateIndex
CREATE INDEX "_RequestNodeToTag_B_index" ON "_RequestNodeToTag"("B");

-- CreateIndex
CREATE INDEX "_RelatedRequests_B_index" ON "_RelatedRequests"("B");

-- CreateIndex
CREATE INDEX "_ProposalToRequestNode_B_index" ON "_ProposalToRequestNode"("B");

-- CreateIndex
CREATE INDEX "_ProposalToTag_B_index" ON "_ProposalToTag"("B");

-- CreateIndex
CREATE INDEX "_StepNodeToUser_B_index" ON "_StepNodeToUser"("B");

-- CreateIndex
CREATE INDEX "_StepNodeToTag_B_index" ON "_StepNodeToTag"("B");

-- CreateIndex
CREATE INDEX "_StepCostToTag_B_index" ON "_StepCostToTag"("B");

-- CreateIndex
CREATE INDEX "_EffectToStepNode_B_index" ON "_EffectToStepNode"("B");

-- CreateIndex
CREATE INDEX "_EffectToTag_B_index" ON "_EffectToTag"("B");

-- CreateIndex
CREATE INDEX "_EffectToExpertiseNode_B_index" ON "_EffectToExpertiseNode"("B");

-- CreateIndex
CREATE INDEX "_ResourceNodeToTag_B_index" ON "_ResourceNodeToTag"("B");

-- AddForeignKey
ALTER TABLE "FeedbackNode" ADD CONSTRAINT "FeedbackNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FeedbackNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackNode" ADD CONSTRAINT "FeedbackNode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackNode" ADD CONSTRAINT "FeedbackNode_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackNode" ADD CONSTRAINT "FeedbackNode_requestNodeId_fkey" FOREIGN KEY ("requestNodeId") REFERENCES "RequestNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackNode" ADD CONSTRAINT "FeedbackNode_proposalNodeId_fkey" FOREIGN KEY ("proposalNodeId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackNode" ADD CONSTRAINT "FeedbackNode_effectId_fkey" FOREIGN KEY ("effectId") REFERENCES "Effect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRelation" ADD CONSTRAINT "UserRelation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRelation" ADD CONSTRAINT "UserRelation_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionNode" ADD CONSTRAINT "RevisionNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RevisionNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionNode" ADD CONSTRAINT "RevisionNode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionNode" ADD CONSTRAINT "RevisionNode_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionNode" ADD CONSTRAINT "RevisionNode_requestNodeId_fkey" FOREIGN KEY ("requestNodeId") REFERENCES "RequestNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionNode" ADD CONSTRAINT "RevisionNode_proposalNodeId_fkey" FOREIGN KEY ("proposalNodeId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionNode" ADD CONSTRAINT "RevisionNode_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "StepNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionNode" ADD CONSTRAINT "RevisionNode_stepCostId_fkey" FOREIGN KEY ("stepCostId") REFERENCES "ProposalStepCost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionNode" ADD CONSTRAINT "RevisionNode_effectId_fkey" FOREIGN KEY ("effectId") REFERENCES "Effect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionNode" ADD CONSTRAINT "RevisionNode_expertiseNodeId_fkey" FOREIGN KEY ("expertiseNodeId") REFERENCES "ExpertiseNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionNode" ADD CONSTRAINT "RevisionNode_resourceNodeId_fkey" FOREIGN KEY ("resourceNodeId") REFERENCES "ResourceNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionNode" ADD CONSTRAINT "RevisionNode_effectHookId_fkey" FOREIGN KEY ("effectHookId") REFERENCES "Effector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedCognitiveBias" ADD CONSTRAINT "AssignedCognitiveBias_cognitiveBiasId_fkey" FOREIGN KEY ("cognitiveBiasId") REFERENCES "CognitiveBias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedCognitiveBias" ADD CONSTRAINT "AssignedCognitiveBias_proposalNodeId_fkey" FOREIGN KEY ("proposalNodeId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedCognitiveBias" ADD CONSTRAINT "AssignedCognitiveBias_requestNodeId_fkey" FOREIGN KEY ("requestNodeId") REFERENCES "RequestNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertiseNode" ADD CONSTRAINT "ExpertiseNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ExpertiseNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestNode" ADD CONSTRAINT "RequestNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RequestNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestNode" ADD CONSTRAINT "RequestNode_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_stepNodeId_fkey" FOREIGN KEY ("stepNodeId") REFERENCES "StepNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepNode" ADD CONSTRAINT "StepNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "StepNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepNode" ADD CONSTRAINT "StepNode_nextId_fkey" FOREIGN KEY ("nextId") REFERENCES "StepNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepNode" ADD CONSTRAINT "StepNode_resourceNodeId_fkey" FOREIGN KEY ("resourceNodeId") REFERENCES "ResourceNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalStepCost" ADD CONSTRAINT "ProposalStepCost_resourceNodeId_fkey" FOREIGN KEY ("resourceNodeId") REFERENCES "ResourceNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalStepCost" ADD CONSTRAINT "ProposalStepCost_stepNodeId_fkey" FOREIGN KEY ("stepNodeId") REFERENCES "StepNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Effect" ADD CONSTRAINT "Effect_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Effector" ADD CONSTRAINT "Effector_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Effect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Effector" ADD CONSTRAINT "Effector_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Effect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceNode" ADD CONSTRAINT "ResourceNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ResourceNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FeedbackNodeToRevisionNode" ADD CONSTRAINT "_FeedbackNodeToRevisionNode_A_fkey" FOREIGN KEY ("A") REFERENCES "FeedbackNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FeedbackNodeToRevisionNode" ADD CONSTRAINT "_FeedbackNodeToRevisionNode_B_fkey" FOREIGN KEY ("B") REFERENCES "RevisionNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToUser" ADD CONSTRAINT "_TagToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToUser" ADD CONSTRAINT "_TagToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExpertiseNodeToUser" ADD CONSTRAINT "_ExpertiseNodeToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "ExpertiseNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExpertiseNodeToUser" ADD CONSTRAINT "_ExpertiseNodeToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExpertiseNodeToRequest" ADD CONSTRAINT "_ExpertiseNodeToRequest_A_fkey" FOREIGN KEY ("A") REFERENCES "ExpertiseNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExpertiseNodeToRequest" ADD CONSTRAINT "_ExpertiseNodeToRequest_B_fkey" FOREIGN KEY ("B") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RequestToTag" ADD CONSTRAINT "_RequestToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RequestToTag" ADD CONSTRAINT "_RequestToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RequestNodeToTag" ADD CONSTRAINT "_RequestNodeToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "RequestNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RequestNodeToTag" ADD CONSTRAINT "_RequestNodeToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RelatedRequests" ADD CONSTRAINT "_RelatedRequests_A_fkey" FOREIGN KEY ("A") REFERENCES "RequestNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RelatedRequests" ADD CONSTRAINT "_RelatedRequests_B_fkey" FOREIGN KEY ("B") REFERENCES "RequestNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProposalToRequestNode" ADD CONSTRAINT "_ProposalToRequestNode_A_fkey" FOREIGN KEY ("A") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProposalToRequestNode" ADD CONSTRAINT "_ProposalToRequestNode_B_fkey" FOREIGN KEY ("B") REFERENCES "RequestNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProposalToTag" ADD CONSTRAINT "_ProposalToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProposalToTag" ADD CONSTRAINT "_ProposalToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StepNodeToUser" ADD CONSTRAINT "_StepNodeToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "StepNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StepNodeToUser" ADD CONSTRAINT "_StepNodeToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StepNodeToTag" ADD CONSTRAINT "_StepNodeToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "StepNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StepNodeToTag" ADD CONSTRAINT "_StepNodeToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StepCostToTag" ADD CONSTRAINT "_StepCostToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "ProposalStepCost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StepCostToTag" ADD CONSTRAINT "_StepCostToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EffectToStepNode" ADD CONSTRAINT "_EffectToStepNode_A_fkey" FOREIGN KEY ("A") REFERENCES "Effect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EffectToStepNode" ADD CONSTRAINT "_EffectToStepNode_B_fkey" FOREIGN KEY ("B") REFERENCES "StepNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EffectToTag" ADD CONSTRAINT "_EffectToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Effect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EffectToTag" ADD CONSTRAINT "_EffectToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EffectToExpertiseNode" ADD CONSTRAINT "_EffectToExpertiseNode_A_fkey" FOREIGN KEY ("A") REFERENCES "Effect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EffectToExpertiseNode" ADD CONSTRAINT "_EffectToExpertiseNode_B_fkey" FOREIGN KEY ("B") REFERENCES "ExpertiseNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResourceNodeToTag" ADD CONSTRAINT "_ResourceNodeToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "ResourceNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResourceNodeToTag" ADD CONSTRAINT "_ResourceNodeToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
