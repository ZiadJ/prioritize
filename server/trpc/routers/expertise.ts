import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'

export const expertiseRouter = router({
	list: publicProcedure
		.input(
			z
				.object({
					search: z.string().optional(),
					isActive: z.boolean().optional(),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			const where: Prisma.ExpertiseNodeWhereInput = {}
			if (input?.search) {
				where.OR = [
					{ title: { contains: input.search, mode: 'insensitive' } },
					{ description: { contains: input.search, mode: 'insensitive' } },
				]
			}
			if (input?.isActive !== undefined) {
				where.isActive = input.isActive
			}

			return prisma.expertiseNode.findMany({
				where,
				orderBy: { title: 'asc' },
			})
		}),
})
