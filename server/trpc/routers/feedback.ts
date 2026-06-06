import { z } from 'zod'
import { protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'

const feedbackInput = z.object({
	requestNodeId: z.number().int().nullable().optional(),
	proposalId: z.number().int().nullable().optional(),
	rating: z.number().int(),
})

export const feedbackRouter = router({
	set: protectedProcedure
		.input(feedbackInput)
		.mutation(async ({ ctx, input }) => {
			const { requestNodeId, proposalId, rating } = input

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
				return null
			}

			const where: Prisma.FeedbackWhereInput = {
				userId: ctx.user!.id,
				requestNodeId: requestNodeId ?? null,
				proposalId: proposalId ?? null,
			}
			const existing = await prisma.feedback.findFirst({ where })

			if (existing) {
				return prisma.feedback.update({
					where: { id: existing.id },
					data: { rating },
				})
			}

			const data: Prisma.FeedbackUncheckedCreateInput = {
				userId: ctx.user!.id,
				rating,
				type: 0,
				confidence: 0,
				title: '',
				body: '',
				requireCommentOnNeg: false,
				isActive: true,
				requestNodeId: requestNodeId ?? null,
				proposalId: proposalId ?? null,
			}

			return prisma.feedback.create({ data })
		}),
})
