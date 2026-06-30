import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'
import { ResourceSchema } from '~~/prisma/generated/zod/schemas/models/Resource.schema'

const createInput = ResourceSchema.pick({
	title: true,
	description: true,
	type: true,
	measurementType: true,
	monthlyCapacity: true,
	managedMonthlyCapacity: true,
	minQuantity: true,
	monetaryValue: true,
	isDirty: true,
	ownerId: true,
}).extend({
	tagIds: z.array(z.number()).optional().default([]),
})

const updateInput = createInput.extend({
	id: z.number(),
})

export const resourcesRouter = router({
	list: publicProcedure
		.input(
			z
				.object({
					search: z.string().optional(),
					isActive: z.boolean().optional(),
					type: z.number().optional(),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			const where: Prisma.ResourceWhereInput = {}
			if (input?.search) {
				where.OR = [
					{ title: { contains: input.search, mode: 'insensitive' } },
					{ description: { contains: input.search, mode: 'insensitive' } },
				]
			}
			if (input?.isActive !== undefined) {
				where.isActive = input.isActive
			}
			if (input?.type !== undefined) {
				where.type = input.type
			}

			return prisma.resource.findMany({
				where,
				orderBy: { id: 'asc' },
				include: {
					tags: true,
					owner: true,
					editors: true,
				},
			})
		}),

	byId: publicProcedure
		.input(z.object({ id: z.number() }))
		.query(async ({ input }) => {
			return prisma.resource.findUnique({
				where: { id: input.id },
				include: {
					tags: true,
					owner: true,
					editors: true,
				},
			})
		}),

	// tree: publicProcedure.query(async () => {
	//   const allNodes = await prisma.resource.findMany({
	//     orderBy: { id: 'asc' },
	//   })
	//   return allNodes.map(node => ({
	//     ...node,
	//     children: [],
	//   }))
	// }),

	create: protectedProcedure
		.input(createInput)
		.mutation(async ({ ctx, input }) => {
			const { tagIds, id, ownerId, ...rest } = input as z.infer<
				typeof updateInput
			>

		const node = await prisma.resource.create({
			data: {
				...rest,
				// Stock levels are managed exclusively via Stock Movements
				quantityAvailable: 0,
				reservedQuantity: 0,
				owner: { connect: { id: ctx.user!.id } },
				tags: tagIds?.length
					? {
							connect: tagIds.map((id: number) => ({ id })),
						}
					: undefined,
			},
			include: {
				tags: true,
				owner: true,
				editors: true,
			},
		})

		return node
	}),

	update: protectedProcedure
		.input(updateInput)
		.mutation(async ({ ctx, input }) => {
			const { id, tagIds, ...rest } = input as z.infer<typeof updateInput>

			const existingNode = await prisma.resource.findUnique({
				where: { id },
				include: { editors: true },
			})

			if (!existingNode) {
				throw new Error('Resource not found')
			}

			const isOwnerOrEditor =
				existingNode.ownerId === ctx.user!.id ||
				existingNode.editors.some(editor => editor.id === ctx.user!.id)

			if (!isOwnerOrEditor && ctx.user!.role !== 'admin') {
				throw new Error('Not authorized to update this resource node')
			}

			const updateData: Prisma.ResourceUpdateInput = {}
			if (Object.keys(rest).length > 0) {
				Object.assign(updateData, rest)
			}
			if (tagIds !== undefined) {
				updateData.tags = {
					set: tagIds.map((tagId: number) => ({ id: tagId })),
				}
			}

			return prisma.resource.update({
				where: { id },
				data: updateData,
			})
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const existingNode = await prisma.resource.findUnique({
				where: { id: input.id },
				include: { editors: true },
			})

			if (!existingNode) {
				throw new Error('Resource not found')
			}

			const isOwnerOrEditor =
				existingNode.ownerId === ctx.user!.id ||
				existingNode.editors.some(editor => editor.id === ctx.user!.id)

			if (!isOwnerOrEditor && ctx.user!.role !== 'admin') {
				throw new Error('Not authorized to delete this resource node')
			}

			return prisma.resource.delete({
				where: { id: input.id },
			})
		}),
})
