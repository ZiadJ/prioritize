import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'
import { ProposalSchema } from '~~/prisma/generated/zod/schemas/models/Proposal.schema'

const createInput = ProposalSchema.pick({
	title: true,
	description: true,
	isDirty: true,
	isComplete: true,
	stepCount: true,
	startsAt: true,
	duration: true,
	priority: true,
	riskFactor: true,
	deliveryDays: true,
	avgRating: true,
	isDraft: true,
	isUnavailable: true,
	requestId: true,
	tags: true,
	parentId: true,
}).extend({
	tagIds: z.array(z.number()).optional().default([]),
})

const updateInput = createInput.extend({
	id: z.number(),
})

export const proposalsRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          isActive: z.boolean().optional(),
          requestId: z.number().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const where: Prisma.ProposalWhereInput = {}
      if (input?.search) {
        where.OR = [
          { title: { contains: input.search, mode: 'insensitive' } },
          { description: { contains: input.search, mode: 'insensitive' } },
        ]
      }
      if (input?.isActive !== undefined) {
        where.isActive = input.isActive
      }
      if (input?.requestId !== undefined) {
        where.requestId = input.requestId
      }

      return prisma.proposal.findMany({
        where,
        include: {
          stepNodes: true,
          tags: true,
          owner: true,
          editors: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return prisma.proposal.findUnique({
        where: { id: input.id },
        include: {
          stepNodes: true,
          tags: true,
          owner: true,
          editors: true,
          children: true,
          parent: true,
        },
      })
    }),

  byRequestId: publicProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      return prisma.proposal.findMany({
        where: { requestId: input.requestId },
        include: {
          stepNodes: true,
          tags: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

create: protectedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const { tagIds, requestId, parentId, ...rest } = input as any

      const data: Prisma.ProposalCreateInput = {
        ...rest,
        request: { connect: { id: requestId } },
        owner: { connect: { id: ctx.user!.id } },
        tags: tagIds?.length
          ? {
              connect: tagIds.map((id: number) => ({ id })),
            }
          : undefined,
      }

      if (parentId !== undefined && parentId !== null) {
        data.parent = { connect: { id: parentId } }
      }

      const proposal = await prisma.proposal.create({
        data,
        include: {
          stepNodes: true,
          tags: true,
          owner: true,
        },
      })

      return proposal
    }),

update: protectedProcedure
    .input(updateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, tagIds, parentId, ...rest } = input as z.infer<
				typeof updateInput
			>

      const existingProposal = await prisma.proposal.findUnique({
        where: { id },
        include: { editors: true },
      })

      if (!existingProposal) {
        throw new Error('Proposal not found')
      }

      const isOwnerOrEditor =
        existingProposal.ownerId === ctx.user!.id ||
        existingProposal.editors.some(editor => editor.id === ctx.user!.id)

      if (!isOwnerOrEditor && ctx.user!.role !== 'admin') {
        throw new Error('Not authorized to update this proposal')
      }

      const updateData: Prisma.ProposalUpdateInput = {}
      if (Object.keys(rest).length > 0) {
        Object.assign(updateData, rest)
      }
      if (tagIds !== undefined) {
        updateData.tags = {
          set: tagIds.map((tagId: number) => ({ id: tagId })),
        }
      }
      if (parentId !== undefined) {
        updateData.parent = parentId
          ? {
              connect: { id: parentId },
            }
          : {
              disconnect: true,
            }
      }

      return prisma.proposal.update({
        where: { id },
        data: updateData,
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existingProposal = await prisma.proposal.findUnique({
        where: { id: input.id },
        include: { editors: true },
      })

      if (!existingProposal) {
        throw new Error('Proposal not found')
      }

      const isOwnerOrEditor =
        existingProposal.ownerId === ctx.user!.id ||
        existingProposal.editors.some(editor => editor.id === ctx.user!.id)

      if (!isOwnerOrEditor && ctx.user!.role !== 'admin') {
        throw new Error('Not authorized to delete this proposal')
      }

      await prisma.feedback.deleteMany({
        where: { proposalId: input.id },
      })

      return prisma.proposal.delete({
        where: { id: input.id },
      })
    }),
})
