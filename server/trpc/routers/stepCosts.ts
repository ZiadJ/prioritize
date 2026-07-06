import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'
import { StepCostSchema } from '~~/prisma/generated/zod/schemas/models/StepCost.schema'
import { assertCanEditProposal } from './steps'
import { getStepCostsFeasibility } from '~~/lib/stepCostsFeasibility'

const COST_INCLUDE = {
	communityResource: { include: { resource: true } },
} satisfies Prisma.StepCostInclude

// Richer include for the listing/detail page: surfaces the owning step,
// its proposal and the community resource (with resource + community)
// so the table can render everything in a single round-trip.
const LIST_INCLUDE = {
	step: {
		select: {
			id: true,
			title: true,
			proposal: {
				select: { id: true, title: true, approvedAt: true, requestId: true },
			},
		},
	},
	communityResource: {
		select: {
			id: true,
			quantity: true,
			resource: {
				select: { id: true, title: true, measurementType: true },
			},
			community: { select: { id: true, title: true } },
		},
	},
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

const updateInput = createInput.extend({ id: z.number() })

/**
 * Recalculates and persists the netFeasibility for a single proposal.
 *
 * For each StepCost it computes a feasibility in [0, 1] via
 * `getStepCostsFeasibility` (see `lib/stepCostsFeasibility.ts`), consuming
 * shared community resources in order across all of the proposal's steps.
 * The proposal's netFeasibility is the product of every step cost's
 * feasibility.
 */
export async function updateProposalNetFeasibility(proposalId: number) {
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
		const allCosts = proposal.steps.flatMap((step) => step.costs)
		netFeasibility = getStepCostsFeasibility(allCosts)
	}

	await prisma.proposal.update({
		where: { id: proposalId },
		data: { netFeasibility: netFeasibility },
	})
}

export const stepCostsRouter = router({
	list: publicProcedure
		.input(
			z
				.object({
					search: z.string().optional(),
					id: z.number().optional(),
					stepId: z.number().optional(),
					communityResourceId: z.number().optional(),
					communityId: z.number().optional(),
					isActive: z.boolean().optional(),
					approvedOnly: z.boolean().optional(),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			const where: Prisma.StepCostWhereInput = {}
			if (input?.id !== undefined) {
				where.id = input.id
			}
			if (input?.stepId !== undefined) {
				where.stepId = input.stepId
			}
			if (input?.communityResourceId !== undefined) {
				where.communityResourceId = input.communityResourceId
			}
			if (input?.communityId !== undefined) {
				where.communityResource = { communityId: input.communityId }
			}
			if (input?.isActive !== undefined) {
				where.isActive = input.isActive
			}
			if (input?.approvedOnly) {
				// Only step costs whose step belongs to an approved proposal
				where.step = { proposal: { approvedAt: { not: null } } }
			}
			if (input?.search) {
				where.OR = [
					{ title: { contains: input.search, mode: 'insensitive' } },
					{ description: { contains: input.search, mode: 'insensitive' } },
					{
						communityResource: {
							resource: {
								title: { contains: input.search, mode: 'insensitive' },
							},
						},
					},
				]
			}

			return prisma.stepCost.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				include: LIST_INCLUDE,
			})
		}),

	byId: publicProcedure
		.input(z.object({ id: z.number() }))
		.query(async ({ input }) => {
			return prisma.stepCost.findUnique({
				where: { id: input.id },
				include: LIST_INCLUDE,
			})
		}),

	// Active communities, for the toolbar community dropdown
	communities: publicProcedure.query(async () => {
		return prisma.community.findMany({
			where: { isActive: true },
			select: { id: true, title: true },
			orderBy: { title: 'asc' },
		})
	}),

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
