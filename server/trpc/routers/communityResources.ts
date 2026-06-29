import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'
import { CommunityResourceSchema } from '~~/prisma/generated/zod/schemas/models/CommunityResource.schema'

const createInput = CommunityResourceSchema.pick({
	isActive: true,
	resourceId: true,
	communityId: true,
	quantity: true,
	monthlyCapacity: true,
	managedMonthlyCapacity: true,
	minQuantity: true,
	reservedQuantity: true,
	monetaryValuePerUnit: true,
})

const updateInput = createInput.extend({
	id: z.number(),
})

export const communityResourcesRouter = router({
	list: publicProcedure
		.input(
			z
				.object({
					search: z.string().optional(),
					isActive: z.boolean().optional(),
					communityId: z.number().optional(),
					resourceId: z.number().optional(),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			const where: Prisma.CommunityResourceWhereInput = {}
			if (input?.isActive !== undefined) {
				where.isActive = input.isActive
			}
			if (input?.communityId !== undefined) {
				where.communityId = input.communityId
			}
			if (input?.resourceId !== undefined) {
				where.resourceId = input.resourceId
			}
			if (input?.search) {
				where.resource = {
					title: { contains: input.search, mode: 'insensitive' },
				}
			}

			return prisma.communityResource.findMany({
				where,
				orderBy: { id: 'asc' },
				include: {
					resource: true,
					community: true,
				},
			})
		}),

	byId: publicProcedure
		.input(z.object({ id: z.number() }))
		.query(async ({ input }) => {
			return prisma.communityResource.findUnique({
				where: { id: input.id },
				include: {
					resource: true,
					community: true,
				},
			})
		}),

	// Lightweight lists for populating form dropdowns
	resources: publicProcedure.query(async () => {
		return prisma.resource.findMany({
			where: { isActive: true },
			select: { id: true, title: true, measurementType: true },
			orderBy: { title: 'asc' },
		})
	}),

	communities: publicProcedure.query(async () => {
		return prisma.community.findMany({
			where: { isActive: true },
			select: { id: true, title: true },
			orderBy: { title: 'asc' },
		})
	}),

	create: protectedProcedure
		.input(createInput)
		.mutation(async ({ input }) => {
			const data = input as z.infer<typeof createInput>
			return prisma.communityResource.create({
				data,
				include: {
					resource: true,
					community: true,
				},
			})
		}),

	update: protectedProcedure
		.input(updateInput)
		.mutation(async ({ input }) => {
			const { id, ...rest } = input as z.infer<typeof updateInput>

			const existingNode = await prisma.communityResource.findUnique({
				where: { id },
			})

			if (!existingNode) {
				throw new Error('Community resource not found')
			}

			return prisma.communityResource.update({
				where: { id },
				data: rest,
				include: {
					resource: true,
					community: true,
				},
			})
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input }) => {
			const existingNode = await prisma.communityResource.findUnique({
				where: { id: input.id },
			})

			if (!existingNode) {
				throw new Error('Community resource not found')
			}

			return prisma.communityResource.delete({
				where: { id: input.id },
			})
		}),
})
