import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'

const createInput = z.object({
	title: z.string(),
	description: z.string(),
	isActive: z.boolean(),
	parentId: z.number().int().nullish(),
})

const updateInput = createInput.extend({
	id: z.number(),
})

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
				include: {
					parent: true,
					_count: {
						select: {
							children: true,
							users: true,
							effects: true,
							requestNodes: true,
						},
					},
				},
			})
		}),

	byId: publicProcedure
		.input(z.object({ id: z.number() }))
		.query(async ({ input }) => {
			return prisma.expertiseNode.findUnique({
				where: { id: input.id },
				include: {
					parent: true,
					children: true,
					users: true,
					effects: true,
					requestNodes: true,
					revisions: true,
				},
			})
		}),

	create: protectedProcedure
		.input(createInput)
		.mutation(async ({ ctx, input }) => {
			const { parentId, ...rest } = input

			// Determine path, depth, numchild based on parent
			let path = ''
			let depth = 0

			if (parentId) {
				const parent = await prisma.expertiseNode.findUnique({
					where: { id: parentId },
				})
				if (!parent) {
					throw new Error('Parent expertise node not found')
				}
				const nextChildNum = parent.numchild + 1
				path = `${parent.path}${String(nextChildNum).padStart(4, '0')}`
				depth = parent.depth + 1

				// Increment parent's numchild
				await prisma.expertiseNode.update({
					where: { id: parentId },
					data: { numchild: { increment: 1 } },
				})
			} else {
				// Root level node
				const rootNodes = await prisma.expertiseNode.findMany({
					where: { parentId: null },
					orderBy: { id: 'desc' },
					take: 1,
				})
				const nextRootNum =
					rootNodes.length > 0 && rootNodes[0]?.path
						? parseInt(rootNodes[0].path.slice(0, 4)) + 1
						: 1
				path = String(nextRootNum).padStart(4, '0')
			}

			const node = await prisma.expertiseNode.create({
				data: {
					...rest,
					path,
					depth,
					numchild: 0,
					parent: parentId ? { connect: { id: parentId } } : undefined,
				},
				include: {
					parent: true,
					_count: {
						select: {
							children: true,
							users: true,
						},
					},
				},
			})

			return node
		}),

	update: protectedProcedure
		.input(updateInput)
		.mutation(async ({ ctx, input }) => {
			const { id, parentId, ...rest } = input

			const existingNode = await prisma.expertiseNode.findUnique({
				where: { id },
			})

			if (!existingNode) {
				throw new Error('Expertise node not found')
			}

			if (!ctx.user || ctx.user.role !== 'admin') {
				throw new Error('Not authorized to update this expertise node')
			}

			return prisma.expertiseNode.update({
				where: { id },
				data: {
					...rest,
					parent: parentId
						? { connect: { id: parentId } }
						: { disconnect: true },
				},
				include: {
					parent: true,
					_count: {
						select: {
							children: true,
							users: true,
						},
					},
				},
			})
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const existingNode = await prisma.expertiseNode.findUnique({
				where: { id: input.id },
			})

			if (!existingNode) {
				throw new Error('Expertise node not found')
			}

			if (!ctx.user || ctx.user.role !== 'admin') {
				throw new Error('Not authorized to delete this expertise node')
			}

			return prisma.expertiseNode.delete({
				where: { id: input.id },
			})
		}),
})