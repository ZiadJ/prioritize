import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'
import { StepNodeSchema } from '~~/prisma/generated/zod/schemas/models/StepNode.schema'

const createInput = StepNodeSchema.pick({
	proposalId: true,
	title: true,
	description: true,
	isActive: true,
	duration: true,
	durationVariance: true,
	riskFactor: true,
})

const updateInput = createInput.partial().extend({ id: z.number() })

export async function assertCanEditProposal(userId: string, role: string | undefined, proposalId: number) {
	const proposal = await prisma.proposal.findUnique({
		where: { id: proposalId },
		include: { editors: true },
	})
	if (!proposal) throw new Error('Proposal not found')

	const canEdit =
		role === 'admin' ||
		proposal.ownerId === userId ||
		proposal.editors.some(editor => editor.id === userId)

	if (!canEdit) throw new Error('Not authorized to edit this proposal')
	return proposal
}

export const stepNodesRouter = router({
	byProposalId: publicProcedure
		.input(z.object({ proposalId: z.number() }))
		.query(async ({ input }) => {
			return prisma.stepNode.findMany({
				where: { proposalId: input.proposalId },
				orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
			})
		}),

	// Single round-trip preload for the proposal editor: every step, every
	// step cost (with its community resource) and the community-resource
	// dropdown options, so expanding a step row is instant on the client.
	byProposalIdWithCosts: publicProcedure
		.input(z.object({ proposalId: z.number() }))
		.query(async ({ input }) => {
			const [steps, costs, communityResources] = await Promise.all([
				prisma.stepNode.findMany({
					where: { proposalId: input.proposalId },
					orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
				}),
				prisma.stepCost.findMany({
					where: { stepNode: { proposalId: input.proposalId } },
					include: {
						communityResource: { include: { resource: true } },
					},
					orderBy: { createdAt: 'asc' },
				}),
				prisma.communityResource.findMany({
					where: { isActive: true },
					include: { resource: true },
					orderBy: { id: 'asc' },
				}),
			])
			return { steps, costs, communityResources }
		}),

	create: protectedProcedure
		.input(createInput)
		.mutation(async ({ ctx, input: raw }) => {
			const input = raw as z.infer<typeof createInput>
			const userId = ctx.user!.id
			await assertCanEditProposal(userId, ctx.user!.role, input.proposalId)

			// Append at the end of the series
			const lastPosition = await prisma.stepNode.aggregate({
				where: { proposalId: input.proposalId },
				_max: { position: true },
			})
			const position = (lastPosition._max.position ?? 0) + 1

			return prisma.stepNode.create({
				data: {
					title: input.title,
					description: input.description,
					isActive: input.isActive,
					duration: input.duration,
					durationVariance: input.durationVariance,
					riskFactor: input.riskFactor,
					position,
					proposal: { connect: { id: input.proposalId } },
					owner: { connect: { id: userId } },
				},
			})
		}),

	update: protectedProcedure
		.input(updateInput)
		.mutation(async ({ ctx, input }) => {
			const { id, ...patch } = input as z.infer<typeof updateInput>

			const existing = await prisma.stepNode.findUnique({
				where: { id },
				include: { editors: true },
			})
			if (!existing) throw new Error('Step not found')

			const canEdit =
				existing.ownerId === ctx.user!.id ||
				existing.editors.some(editor => editor.id === ctx.user!.id) ||
				ctx.user!.role === 'admin'
			if (!canEdit) throw new Error('Not authorized to edit this step')

			return prisma.stepNode.update({
				where: { id },
				data: patch as Prisma.StepNodeUpdateInput,
			})
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const existing = await prisma.stepNode.findUnique({
				where: { id: input.id },
				include: { editors: true },
			})
			if (!existing) throw new Error('Step not found')

			const canEdit =
				existing.ownerId === ctx.user!.id ||
				existing.editors.some(editor => editor.id === ctx.user!.id) ||
				ctx.user!.role === 'admin'
			if (!canEdit) throw new Error('Not authorized to delete this step')

			// onDelete: Cascade removes the step from its proposal. Remaining
			// steps keep their positions (gaps are harmless for ordered reads).
			return prisma.stepNode.delete({ where: { id: input.id } })
		}),

	// Re-assigns the `position` of every step in a proposal to match the
	// new execution order. Done in two passes inside a transaction so the
	// `@@unique([proposalId, position])` constraint can never be violated
	// while shuffling values around.
	reorder: protectedProcedure
		.input(
			z.object({
				proposalId: z.number(),
				orderedStepIds: z.array(z.number()),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertCanEditProposal(
				ctx.user!.id,
				ctx.user!.role,
				input.proposalId,
			)

			await prisma.$transaction(async tx => {
				for (let i = 0; i < input.orderedStepIds.length; i++) {
					await tx.stepNode.update({
						where: { id: input.orderedStepIds[i] },
						data: { position: i + 1_000_000 },
					})
				}
				for (let i = 0; i < input.orderedStepIds.length; i++) {
					await tx.stepNode.update({
						where: { id: input.orderedStepIds[i] },
						data: { position: i + 1 },
					})
				}
			})

			return prisma.stepNode.findMany({
				where: { proposalId: input.proposalId },
				orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
			})
		}),
})
