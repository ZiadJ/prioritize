import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'
import { StepCostSchema } from '~~/prisma/generated/zod/schemas/models/StepCost.schema'
import { assertCanEditProposal } from './steps'

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
	stepId: true,
}).extend({
	stepId: z.number().int(),
})

const updateInput = createInput.partial().extend({ id: z.number() })

/**
 * Recalculates and persists the netFeasibility for a single proposal.
 *
 * Iterates over every StepCost across the proposal's step nodes and computes
 * the ratio of the step cost quantity to the available quantity of the
 * community resource it draws from (stepCost.quantity / communityResource.quantity).
 * The proposal's netFeasibility is the sum of all those ratios.
 */
async function updateProposalNetFeasibility(proposalId: number) {
	const proposal = await prisma.proposal.findUnique({
		where: { id: proposalId },
		include: {
			steps: {
				include: {
					costs: {
						include: { communityResource: true },
					},
				},
			},
		},
	})

	let netFeasibility = 1

	if (proposal) {
		for (const step of proposal.steps) {
			for (const stepCost of step.costs) {
				const availability = stepCost.communityResource.quantity
				if (availability > 0) {
					// Available Qty = Stock Qty +Renewal RateTime
					const feasibility = availability / (availability + stepCost.quantity)
					netFeasibility *= feasibility
				}
			}
		}
	}

	await prisma.proposal.update({
		where: { id: proposalId },
		data: { netFeasibility: netFeasibility },
	})
}

export const stepCostsRouter = router({
	byStepId: publicProcedure
		.input(z.object({ stepId: z.number() }))
		.query(async ({ input }) => {
			return prisma.stepCost.findMany({
				where: { stepId: input.stepId },
				include: COST_INCLUDE,
				orderBy: { createdAt: 'asc' },
			})
		}),

	create: protectedProcedure
		.input(createInput)
		.mutation(async ({ ctx, input: raw }) => {
			const input = raw as z.infer<typeof createInput>
			const step = await prisma.step.findUnique({
				where: { id: input.stepId },
				select: { proposalId: true },
			})
			if (!step) throw new Error('Step not found')
			await assertCanEditProposal(ctx.user!.id, ctx.user!.role, step.proposalId)

			const created = await prisma.stepCost.create({
				data: {
					title: input.title,
					description: input.description,
					measurementType: input.measurementType,
					quantity: input.quantity,
					quantityMargin: input.quantityMargin,
					monetaryValue: input.monetaryValue,
					consumedAt: new Date(),
					communityResource: { connect: { id: input.communityResourceId } },
					step: { connect: { id: input.stepId } },
					owner: { connect: { id: ctx.user!.id } },
				},
				include: COST_INCLUDE,
			})

			await updateProposalNetFeasibility(step.proposalId)
			return created
		}),

	update: protectedProcedure
		.input(updateInput)
		.mutation(async ({ ctx, input }) => {
			const { id, ...patch } = input as z.infer<typeof updateInput>

			const existing = await prisma.stepCost.findUnique({
				where: { id },
				include: { step: { select: { proposalId: true } } },
			})
			if (!existing) throw new Error('Step cost not found')

			const proposalId = existing.step?.proposalId
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

			const updated = await prisma.stepCost.update({
				where: { id },
				data,
				include: COST_INCLUDE,
			})

			await updateProposalNetFeasibility(proposalId)
			return updated
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const existing = await prisma.stepCost.findUnique({
				where: { id: input.id },
				include: { step: { select: { proposalId: true } } },
			})
			if (!existing) throw new Error('Step cost not found')

			const proposalId = existing.step?.proposalId
			if (!proposalId) throw new Error('Associated step not found')
			await assertCanEditProposal(ctx.user!.id, ctx.user!.role, proposalId)

			await prisma.stepCost.delete({ where: { id: input.id } })
			await updateProposalNetFeasibility(proposalId)
			return { id: input.id }
		}),
})
