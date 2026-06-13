import { z } from 'zod'
import { protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'

const feedbackInput = z.object({
	requestNodeId: z.number().int().nullable().optional(),
	proposalId: z.number().int().nullable().optional(),
	rating: z.number().int(),
})

/**
 * Recalculates and persists the netValue for a single proposal.
 *
 * For each request node in the request:
 *   1. Sum the ratings of feedback where proposalId IS NULL (the "value" column)
 *   2. Average the ratings of feedback where proposalId equals the proposal's id
 *   3. Actual value per request node = sum × average
 *
 * The proposal's netValue is the sum of all actual values across request nodes.
 */
async function updateProposalNetValue(proposalId: number, requestId: number) {
	// Fetch all request nodes for this request with their feedback
	const requestNodes = await prisma.requestNode.findMany({
		where: { requestId },
		include: { feedback: true },
	})

	let netValue = 0

	for (const requestNode of requestNodes) {
		const feedback = requestNode.feedback

		// Sum ratings of feedback without a proposalId (the "value" column)
		const nullProposalFeedback = feedback.filter(f => f.proposalId === null)
		const sumValueRatings = nullProposalFeedback.reduce(
			(sum, f) => sum + f.rating,
			0,
		)

		// Average ratings of feedback related to this proposal
		const proposalFeedback = feedback.filter(
			f => f.proposalId === proposalId,
		)
		const avgProposalRatings =
			proposalFeedback.length > 0
				? proposalFeedback.reduce((sum, f) => sum + f.rating, 0) /
					proposalFeedback.length
				: 0

		// Actual value per request node = sum × average
		netValue += sumValueRatings * avgProposalRatings
	}

	// Persist the calculated netValue
	await prisma.proposal.update({
		where: { id: proposalId },
		data: { netValue: Math.round(netValue) },
	})
}

export const feedbackRouter = router({
	set: protectedProcedure
		.input(feedbackInput)
		.mutation(async ({ ctx, input }) => {
			const { requestNodeId, proposalId, rating } = input

			// Determine the requestId for netValue recalculation
			let requestId: number | null = null

			if (requestNodeId) {
				const requestNode = await prisma.requestNode.findUnique({
					where: { id: requestNodeId },
					select: { requestId: true },
				})
				requestId = requestNode?.requestId ?? null
			}

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
						data: { rating },
					})
				} else {
					const data: Prisma.FeedbackUncheckedCreateInput = {
						userId: ctx.user!.id,
						rating,
						type: 0,
						confidence: 0,
						title: '',
						description: '',
						requireCommentOnNeg: false,
						// isActive: true,
						requestNodeId: requestNodeId ?? null,
						proposalId: proposalId ?? null,
					}

					result = await prisma.feedback.create({ data })
				}
			}

			// Recalculate netValue for the affected proposal(s)
			if (proposalId && requestId) {
				await updateProposalNetValue(proposalId, requestId)
			} else if (requestId) {
				// Value column feedback affects all proposals
				const proposals = await prisma.proposal.findMany({
					where: { requestId },
					select: { id: true },
				})
				for (const p of proposals) {
					await updateProposalNetValue(p.id, requestId)
				}
			}

			return result ?? null
		}),
})