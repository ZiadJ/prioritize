import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'
import { createTreeNode } from '~~/lib/tree'
import { RequestNodeSchema } from '~~/prisma/generated/zod/schemas/models/RequestNode.schema'

const createInput = RequestNodeSchema.pick({
	isActive: true,
	title: true,
	body: true,
	parentId: true,
	isVariantsGroup: true,
	isNonNegotiable: true,
	position: true,
	requestId: true,
	ownerId: true,
}).extend({
	id: z.number().optional(),
	tagIds: z.array(z.number()).optional().default([]),
})

const updateInput = createInput.extend({
	id: z.number(),
})

export const requestNodesRouter = router({
	list: protectedProcedure
		.input(
			z
				.object({
					search: z.string().optional(),
					isActive: z.boolean().optional(),
					requestId: z.number().optional(),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const where: Prisma.RequestNodeWhereInput = {}
			if (input?.search) {
				where.OR = [
					{ title: { contains: input.search, mode: 'insensitive' } },
					{ body: { contains: input.search, mode: 'insensitive' } },
				]
			}
			if (input?.isActive !== undefined) {
				where.isActive = input.isActive
			}
			if (input?.requestId !== undefined) {
				where.requestId = input.requestId
			}

			return prisma.requestNode.findMany({
				where,
				orderBy: { position: 'asc' },
				include: {
					children: true,
					parent: true,
					request: true,
					tags: true,
					owner: true,
					editors: true,
				},
			})
		}),

	byId: protectedProcedure
		.input(z.object({ id: z.number() }))
		.query(async ({ input }) => {
			return prisma.requestNode.findUnique({
				where: { id: input.id },
				include: {
					children: {
						include: {
							children: true,
						},
					},
					parent: true,
					request: true,
					tags: true,
					owner: true,
					editors: true,
					expertise: true,
				},
			})
		}),

	byRequestId: protectedProcedure
		.input(z.object({ requestId: z.number() }))
		.query(async ({ input }) => {
			return prisma.requestNode.findMany({
				where: { requestId: input.requestId },
				include: {
					children: true,
				},
				orderBy: { position: 'asc' },
			})
		}),

	create: protectedProcedure
		.input(createInput)
		.mutation(async ({ ctx, input }) => {
			const { tagIds, parentId, requestId, ...rest } = input as z.infer<typeof createInput>

			const node = await createTreeNode(prisma.requestNode, {
				...rest,
				isActive: true,
				parentId,
				request: { connect: { id: requestId } },
				owner: { connect: { id: ctx.user!.id } },
				country: ctx.user?.countryId
					? { connect: { id: ctx.user.countryId } }
					: undefined,
				tags: tagIds?.length
					? {
							connect: tagIds.map((id: number) => ({ id })),
						}
					: undefined,
			})

			return node
		}),

	update: protectedProcedure
		.input(updateInput)
		.mutation(async ({ ctx, input }) => {
			const { id, tagIds, ...rest } = input as z.infer<typeof updateInput>

			const existingNode = await prisma.requestNode.findUnique({
				where: { id },
				include: { editors: true },
			})

			if (!existingNode) {
				throw new Error('RequestNode not found')
			}

			const isOwnerOrEditor =
				existingNode.ownerId === ctx.user!.id ||
				existingNode.editors.some(editor => editor.id === ctx.user!.id)

			if (!isOwnerOrEditor && ctx.user!.role !== 'admin') {
				throw new Error('Not authorized to update this request node')
			}

			const updateData: Prisma.RequestNodeUpdateInput = {}
			if (Object.keys(rest).length > 0) {
				Object.assign(updateData, rest)
			}
			if (tagIds !== undefined) {
				updateData.tags = {
					set: tagIds.map((tagId: number) => ({ id: tagId })),
				}
			}

			return prisma.requestNode.update({
				where: { id },
				data: updateData,
			})
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const existingNode = await prisma.requestNode.findUnique({
				where: { id: input.id },
				include: { editors: true },
			})

			if (!existingNode) {
				throw new Error('RequestNode not found')
			}

			const isOwnerOrEditor =
				existingNode.ownerId === ctx.user!.id ||
				existingNode.editors.some(editor => editor.id === ctx.user!.id)

			if (!isOwnerOrEditor && ctx.user!.role !== 'admin') {
				throw new Error('Not authorized to delete this request node')
			}

			return prisma.requestNode.delete({
				where: { id: input.id },
			})
		}),

	move: protectedProcedure
		.input(
			z.object({
				nodeId: z.number(),
				newParentId: z.number().nullable(),
				position: z.number().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			// Implementation of tree move using lib/tree.ts
			// This would need to be implemented similar to createTreeNode but with move logic
			throw new Error('Not implemented')
		}),
})
