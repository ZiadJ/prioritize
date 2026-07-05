import { z } from 'zod'
import { protectedProcedure, publicProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'

const feedbackInput = z.object({
	requestNodeId: z.number().int().nullable().optional(),
	proposalId: z.number().int().nullable().optional(),
	requestId: z.number().int(),
	rating: z.number().int(),
	comment: z.string().optional().default(''),
})

/**
 * Recalculates and persists the netBenefit for a single proposal.
 *
 * For each request node in the request:
 *   1. Average the ratings of feedback where proposalId IS NULL (the "Value" column)
 *   2. Average the ratings of feedback where proposalId equals the proposal's id
 *   3. Actual value per request node = value average × proposal average
 *
 * The proposal's netBenefit is the sum of all actual values across request nodes.
 */
type RequestNodeWithFeedback = Prisma.RequestNodeGetPayload<{
	include: { feedback: true }
}>

export async function updateProposalNetBenefit(
	proposalId: number,
	requestNodes: RequestNodeWithFeedback[],
) {
	let netBenefit = 0

	for (const requestNode of requestNodes) {
		const feedback = requestNode.feedback

		// Average ratings of feedback without a proposalId (the "value" column)
		const nullProposalFeedback = feedback.filter(f => f.proposalId === null)
		const avgValueRating =
			nullProposalFeedback.length > 0
				? nullProposalFeedback.reduce((sum, f) => sum + f.rating, 0) /
					nullProposalFeedback.length
				: 0

		// Average ratings of feedback related to this proposal
		const proposalFeedback = feedback.filter(f => f.proposalId === proposalId)
		const avgProposalRating =
			proposalFeedback.length > 0
				? proposalFeedback.reduce((sum, f) => sum + f.rating, 0) /
					proposalFeedback.length
				: 0

		// Actual value per request node = sum × average
		netBenefit += avgValueRating * avgProposalRating
	}

	// Persist the calculated netBenefit
	await prisma.proposal.update({
		where: { id: proposalId },
		data: { netBenefit: Math.round(netBenefit) },
	})
}

export const feedbackRouter = router({
	names: publicProcedure
		.input(z.object({ userIds: z.array(z.string()) }))
		.query(async ({ input }) => {
			const users = await prisma.user.findMany({
				where: { id: { in: input.userIds } },
				select: { id: true, firstname: true, lastname: true, username: true },
			})
			return Object.fromEntries(users.map(u => [u.id, u])) as Record<
				string,
				{ firstname: string; lastname: string; username: string }
			>
		}),

	set: protectedProcedure
		.input(feedbackInput)
		.mutation(async ({ ctx, input }) => {
			const { requestNodeId, proposalId, requestId, rating, comment } = input

			let result
			if (rating === 0) {
				const where: Prisma.FeedbackWhereInput = {
					userId: ctx.user!.id,
					requestNodeId: requestNodeId ?? null,
					proposalId: proposalId ?? null,
				}
				const existing = await prisma.feedback.findFirst({ where })
				if (existing) {
					await prisma.feedback.delete({ where: { id: existing.id } })
				}
			} else {
				const where: Prisma.FeedbackWhereInput = {
					userId: ctx.user!.id,
					requestNodeId: requestNodeId ?? null,
					proposalId: proposalId ?? null,
				}
				const existing = await prisma.feedback.findFirst({ where })

				if (existing) {
					result = await prisma.feedback.update({
						where: { id: existing.id },
						data: { rating, comment },
					})
				} else {
					const data: Prisma.FeedbackUncheckedCreateInput = {
						userId: ctx.user!.id,
						rating,
						comment,
						type: 0,
						confidence: 0,
						requireCommentOnNeg: false,
						// isActive: true,
						requestNodeId: requestNodeId ?? null,
						proposalId: proposalId ?? null,
					}

					result = await prisma.feedback.create({ data })
				}
			}

			const requestNodes = await prisma.requestNode.findMany({
				where: { requestId },
				include: { feedback: true },
			})

			// Recalculate netBenefit for the affected proposal(s)
			if (proposalId) {
				await updateProposalNetBenefit(proposalId, requestNodes)
			} else {
				// Feedback without the proposal Id is a value feedback which affects all proposals
				const proposals = await prisma.proposal.findMany({
					where: { requestId },
					select: { id: true },
				})

				for (const p of proposals) {
					await updateProposalNetBenefit(p.id, requestNodes)
				}
			}

			return result ?? null
		}),
})
