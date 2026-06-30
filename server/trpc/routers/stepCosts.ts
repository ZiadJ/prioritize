import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'
import { StepCostSchema } from '~~/prisma/generated/zod/schemas/models/StepCost.schema'
import { assertCanEditProposal } from './stepNodes'

const COST_INCLUDE = {
	communityResource: { include: { resource: true } },
} satisfies Prisma.StepCostInclude

const createInput = StepCostSchema.pick({
	isActive: true,
	title: true,
	description: true,
	communityResourceId: true,
	measurementType: true,
	quantity: true,
	quantityMargin: true,
	monetaryValue: true,
	stepNodeId: true,
}).extend({
	stepNodeId: z.number().int(),
})

const updateInput = createInput.partial().extend({ id: z.number() })

export const stepCostsRouter = router({
	byStepNodeId: publicProcedure
		.input(z.object({ stepNodeId: z.number() }))
		.query(async ({ input }) => {
			return prisma.stepCost.findMany({
				where: { stepNodeId: input.stepNodeId },
				include: COST_INCLUDE,
				orderBy: { createdAt: 'asc' },
			})
		}),

	create: protectedProcedure
		.input(createInput)
		.mutation(async ({ ctx, input: raw }) => {
			const input = raw as z.infer<typeof createInput>
			const step = await prisma.stepNode.findUnique({
				where: { id: input.stepNodeId },
				select: { proposalId: true },
			})
			if (!step) throw new Error('Step not found')
			await assertCanEditProposal(ctx.user!.id, ctx.user!.role, step.proposalId)

			return prisma.stepCost.create({
				data: {
					title: input.title,
					description: input.description,
					measurementType: input.measurementType,
					quantity: input.quantity,
					quantityMargin: input.quantityMargin,
					monetaryValue: input.monetaryValue,
					consumedAt: new Date(),
					communityResource: { connect: { id: input.communityResourceId } },
					stepNode: { connect: { id: input.stepNodeId } },
					owner: { connect: { id: ctx.user!.id } },
				},
				include: COST_INCLUDE,
			})
		}),

	update: protectedProcedure
		.input(updateInput)
		.mutation(async ({ ctx, input }) => {
			const { id, ...patch } = input as z.infer<typeof updateInput>

			const existing = await prisma.stepCost.findUnique({
				where: { id },
				include: { stepNode: { select: { proposalId: true } } },
			})
			if (!existing) throw new Error('Step cost not found')

			const proposalId = existing.stepNode?.proposalId
			if (!proposalId) throw new Error('Associated step not found')
			await assertCanEditProposal(ctx.user!.id, ctx.user!.role, proposalId)

			const data: Prisma.StepCostUpdateInput = {}
			if (patch.title !== undefined) data.title = patch.title
			if (patch.description !== undefined) data.description = patch.description
			if (patch.measurementType !== undefined)
				data.measurementType = patch.measurementType
			if (patch.quantity !== undefined) data.quantity = patch.quantity
			if (patch.quantityMargin !== undefined)
				data.quantityMargin = patch.quantityMargin
			if (patch.monetaryValue !== undefined)
				data.monetaryValue = patch.monetaryValue
			if (patch.isActive !== undefined) data.isActive = patch.isActive
			if (patch.communityResourceId !== undefined) {
				data.communityResource = { connect: { id: patch.communityResourceId } }
			}

			return prisma.stepCost.update({
				where: { id },
				data,
				include: COST_INCLUDE,
			})
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const existing = await prisma.stepCost.findUnique({
				where: { id: input.id },
				include: { stepNode: { select: { proposalId: true } } },
			})
			if (!existing) throw new Error('Step cost not found')

			const proposalId = existing.stepNode?.proposalId
			if (!proposalId) throw new Error('Associated step not found')
			await assertCanEditProposal(ctx.user!.id, ctx.user!.role, proposalId)

			return prisma.stepCost.delete({ where: { id: input.id } })
		}),
})
