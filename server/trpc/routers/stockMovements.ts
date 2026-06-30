import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'

const moveInput = z.object({
	communityResourceId: z.number(),
	quantity: z.number(), // Signed: positive adds stock, negative removes stock
	reason: z.string().optional(),
	stepCostId: z.number().nullable().optional(),
	isActive: z.boolean().default(true),
})

const movementInclude = {
	user: { select: { id: true, username: true } },
	resource: {
		include: {
			resource: { select: { id: true, title: true, measurementType: true } },
			community: { select: { id: true, title: true } },
		},
	},
	stepCost: { select: { id: true, title: true } },
} satisfies Prisma.StockMovementInclude

export const stockMovementsRouter = router({
	list: publicProcedure
		.input(
			z
				.object({
					search: z.string().optional(),
					communityResourceId: z.number().optional(),
					communityId: z.number().optional(),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			const where: Prisma.StockMovementWhereInput = {}
			if (input?.communityResourceId !== undefined) {
				where.communityResourceId = input.communityResourceId
			}
			if (input?.communityId !== undefined) {
				where.resource = { communityId: input.communityId }
			}
			if (input?.search) {
				where.OR = [
					{ reason: { contains: input.search, mode: 'insensitive' } },
					{
						resource: {
							resource: {
								title: { contains: input.search, mode: 'insensitive' },
							},
						},
					},
				]
			}

			return prisma.stockMovement.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				include: movementInclude,
			})
		}),

	// Community resources with their current stock levels, for the dropdown
	communityResources: publicProcedure
		.input(z.object({ communityId: z.number().optional() }).optional())
		.query(async ({ input }) => {
			return prisma.communityResource.findMany({
				where: {
					isActive: true,
					...(input?.communityId ? { communityId: input.communityId } : {}),
				},
				orderBy: { id: 'asc' },
				include: {
					resource: { select: { id: true, title: true, measurementType: true } },
					community: { select: { id: true, title: true } },
				},
			})
		}),

	// Step costs belonging to approved proposals — a step cost can be the reason
	// for a movement once its proposal is approved
	stepCosts: publicProcedure.query(async () => {
		return prisma.stepCost.findMany({
			where: { stepNode: { proposal: { approvedAt: { not: null } } } },
			orderBy: { id: 'asc' },
			select: {
				id: true,
				title: true,
				quantity: true,
				communityResourceId: true,
				stepNode: {
					select: {
						id: true,
						title: true,
						proposal: { select: { id: true, title: true, approvedAt: true } },
					},
				},
			},
		})
	}),

	communities: publicProcedure.query(async () => {
		return prisma.community.findMany({
			where: { isActive: true },
			select: { id: true, title: true },
			orderBy: { title: 'asc' },
		})
	}),

	// Applies a signed stock movement and updates the community stock atomically
	move: protectedProcedure.input(moveInput).mutation(async ({ ctx, input }) => {
		return prisma.$transaction(async (tx) => {
			const resource = await tx.communityResource.findUnique({
				where: { id: input.communityResourceId },
			})
			if (!resource) {
				throw new Error('Community resource not found')
			}

			if (input.stepCostId) {
				const stepCost = await tx.stepCost.findUnique({
					where: { id: input.stepCostId },
					select: { communityResourceId: true },
				})
				if (!stepCost || stepCost.communityResourceId !== resource.id) {
					throw new Error(
						'Selected step cost does not belong to this stock entry',
					)
				}
			}

			const quantityBefore = resource.quantity
			const quantityAfter = quantityBefore + input.quantity

			await tx.communityResource.update({
				where: { id: resource.id },
				data: { quantity: quantityAfter },
			})

			return tx.stockMovement.create({
				data: {
					userId: ctx.user!.id,
					communityResourceId: resource.id,
					stepCostId: input.stepCostId ?? null,
					quantity: input.quantity,
					quantityBefore,
					quantityAfter,
					reason: input.reason ?? null,
					isActive: input.isActive,
				},
				include: movementInclude,
			})
		})
	}),
})
