import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'
import { createTreeNode, buildTreeSelectDataFromNodes } from '~~/lib/tree'
// import {
// 	RequestWhereInputObjectSchema,
// 	RequestUncheckedCreateInputObjectZodSchema,
// 	RequestUncheckedUpdateInputObjectZodSchema,
// 	RequestWhereUniqueInputObjectSchema,
// } from '~~/prisma/generated/zod/schemas'

export const requestsRouter = router({
	list: publicProcedure
		.input(
			z
				.object({
					search: z.string().optional(),
					isActive: z.boolean().optional(),
					communityId: z.number().optional(),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			return prisma.request.findMany({
				where: {
					...(input?.search && {
						OR: [
							{ title: { contains: input.search, mode: 'insensitive' } },
							{ body: { contains: input.search, mode: 'insensitive' } },
						],
					}),
					isActive: input?.isActive,
					communityId: input?.communityId,
				},
				orderBy: { createdAt: 'desc' },
				include: {
					tags: true,
					communityNode: true,
					orders: true,
					_count: {
						select: { children: true, feedback: true },
					},
				},
			})
		}),

	byId: publicProcedure
		.input(z.object({ id: z.number() }))
		.query(async ({ input }) => {
			return prisma.request.findUnique({
				where: { id: input.id },
				include: {
					tags: true,
					expertise: true,
					effects: true,
					owner: true,
					editors: true,
					orders: true,
					communityNode: true,
					feedback: {
						include: {
							user: {
								select: { username: true, firstname: true, lastname: true },
							},
						},
					},
					_count: {
						select: {
							children: true,
							feedback: true,
							revisions: true,
						},
					},
				},
			})
		}),

	create: protectedProcedure
		.input(
			z.object({
				title: z.string().min(1),
				body: z.string().optional().default(''),
				parentId: z.number().optional(),
				tagIds: z.array(z.number()).optional().default([]),
				recurrencePeriod: z.number().optional().default(0),
				quantity: z.number().optional().default(1),
				isBasicNeed: z.boolean().optional().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const {
				tagIds,
				parentId,
				isBasicNeed,
				recurrencePeriod,
				quantity,
				...data
			} = input

			if (!ctx.user!.communityId) {
				throw new Error('User must be assigned to a community')
			}

			try {
				const node = await createTreeNode(prisma.request, {
					...data,
					isActive: true,
					parentId,
					communityId: ctx.user!.communityId,
					isBasicNeed,
					ownerId: ctx.user!.id,
					tags: tagIds?.length
						? {
								connect: tagIds.map(id => ({ id })),
							}
						: undefined,
				})

				// Create Order if recurrencePeriod is provided
				if (recurrencePeriod && recurrencePeriod > 0) {
					await prisma.order.create({
						data: {
							requestId: node.id,
							userId: ctx.user!.id,
							quantity: quantity || 1,
							recurrencePeriod,
						},
					})
				}

				return node
			} catch (e) {
				console.error('Prisma create error:', e)
				throw e
			}
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				title: z.string().min(1).optional(),
				body: z.string().optional(),
				isActive: z.boolean().optional(),
				tagIds: z.array(z.number()).optional(),
				recurrencePeriod: z.number().optional(),
				quantity: z.number().optional(),
				isBasicNeed: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, tagIds, isBasicNeed, recurrencePeriod, quantity, ...data } =
				input
			const updateData: Prisma.RequestUpdateInput = { ...data }
			if (isBasicNeed !== undefined) {
				updateData.isBasicNeed = isBasicNeed
			}
			if (tagIds !== undefined) {
				updateData.tags = {
					set: tagIds.map(tagId => ({ id: tagId })),
				}
			}

			// Update the request
			const updatedRequest = await prisma.request.update({
				where: {
					id,
					OR: [
						{ ownerId: ctx.user!.id },
						{ editors: { some: { id: ctx.user!.id } } },
					],
				},
				data: updateData,
			})

			// Handle Order update/creation for recurrencePeriod
			if (recurrencePeriod !== undefined) {
				const existingOrder = await prisma.order.findFirst({
					where: { requestId: id, userId: ctx.user!.id },
				})

				if (existingOrder) {
					await prisma.order.update({
						where: { id: existingOrder.id },
						data: {
							recurrencePeriod,
							...(quantity !== undefined && { quantity }),
						},
					})
				} else if (recurrencePeriod > 0) {
					await prisma.order.create({
						data: {
							requestId: id,
							userId: ctx.user!.id,
							quantity: quantity || 1,
							recurrencePeriod,
						},
					})
				}
			}

			return updatedRequest
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			// Ensure user can delete their own request or if they are listed as an editor
			return prisma.request.delete({
				where: {
					id: input.id,
					OR: [
						{ ownerId: ctx.user!.id },
						{ editors: { some: { id: ctx.user!.id } } },
					],
				},
			})
		}),

	listTags: publicProcedure.query(async () => {
		return prisma.tag.findMany({
			where: { type: 'request' },
			include: {
				_count: {
					select: { request: true },
				},
			},
			orderBy: {
				request: { _count: 'desc' },
			},
		})
	}),

	createTag: publicProcedure
		.input(z.object({ name: z.string().min(1) }))
		.mutation(async ({ input }) => {
			return prisma.tag.upsert({
				where: { name_type: { name: input.name, type: 'request' } },
				update: {},
				create: { name: input.name, type: 'request' },
			})
		}),

	// Community Node procedures
	listCommunityNodes: publicProcedure.query(async () => {
		return prisma.communityNode.findMany({
			orderBy: { path: 'asc' },
		})
	}),

	getCommunityTree: publicProcedure.query(async () => {
		const allNodes = await prisma.communityNode.findMany({
			orderBy: { title: 'asc' },
		})
		return buildTreeSelectDataFromNodes(allNodes)
	}),
})
