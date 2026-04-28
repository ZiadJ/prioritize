import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'
import { UnitOfMeasure } from '~~/prisma/generated/client/enums'
import { createTreeNode, buildTreeSelectDataFromNodes } from '~~/lib/tree'
import { Request, Order } from '~~/prisma/generated/interfaces'

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
			const result = await prisma.request.findMany({
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
					orders: {
						include: {
							user: {
								select: {
									id: true,
									username: true,
									firstname: true,
									lastname: true,
								},
							},
						},
					},
					editors: true,
					_count: {
						select: { children: true, feedback: true },
					},
				},
			})

			// Attach unitOfMeasure from request to each order for frontend compatibility
			//  (result ?? []).forEach(req => {
			// 	if (req.orders) {
			// 		req.orders.forEach((order: any) => {
			// 			order.unitOfMeasure = req.unitOfMeasure
			// 		})
			// 	}
			// })
			return result
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
					orders: {
						include: {
							user: {
								select: {
									id: true,
									username: true,
									firstname: true,
									lastname: true,
								},
							},
							request: {
								select: {
									unitOfMeasure: true,
								},
							},
						},
					},
					communityNode: true,
					country: true,
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
				// Request fields
				title: z.string().min(1),
				body: z.string().optional().default(''),
				parentId: z.number().optional(),
				tagIds: z.array(z.number()).optional().default([]),
				isBasicNeed: z.boolean().optional().default(false),
				unitOfMeasure: z.enum(UnitOfMeasure).optional(),
				// Order fields
				order: z
					.object({
						quantity: z.number().optional().nullable(),
						recurrencePeriod: z.number().optional(),
					})
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { tagIds, parentId, isBasicNeed, order, ...data } = input

			if (!ctx.user!.communityId) {
				throw new Error('User must be assigned to a community')
			}

			try {
				const node = await createTreeNode(prisma.request, {
					...data,
					isActive: true,
					parentId,
					communityId: ctx.user!.communityId,
					countryId: ctx.user!.countryId,
					isBasicNeed,
					ownerId: ctx.user!.id,
					tags: tagIds?.length
						? {
								connect: tagIds.map(id => ({ id })),
							}
						: undefined,
				})

				// Create Order if order data is provided and has quantity or recurrencePeriod
				if (
					order &&
					((order.quantity !== null && order.quantity !== undefined) ||
						(order.recurrencePeriod && order.recurrencePeriod > 0))
				) {
					await prisma.order.create({
						data: {
							request: { connect: { id: node.id } },
							user: { connect: { id: ctx.user!.id } },
							recurrencePeriod: order.recurrencePeriod || 0,
							quantity: order.quantity ?? 1,
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
				// Request fields
				title: z.string().min(1).optional(),
				body: z.string().optional(),
				isActive: z.boolean().optional(),
				tagIds: z.array(z.number()).optional(),
				isBasicNeed: z.boolean().optional(),
				unitOfMeasure: z.enum(UnitOfMeasure).optional(),
				// Order fields
				order: z
					.object({
						quantity: z.number().optional().nullable(),
						recurrencePeriod: z.number().optional(),
					})
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, tagIds, isBasicNeed, order, unitOfMeasure, ...data } = input
			const updateData: Prisma.RequestUpdateInput = { ...data }
			if (isBasicNeed !== undefined) {
				updateData.isBasicNeed = isBasicNeed
			}
			if (tagIds !== undefined) {
				updateData.tags = {
					set: tagIds.map(tagId => ({ id: tagId })),
				}
			}
			if (unitOfMeasure !== undefined) {
				updateData.unitOfMeasure = unitOfMeasure
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

			// Handle Order update/creation
			if (order !== undefined) {
				const existingOrder = await prisma.order.findFirst({
					where: { requestId: id, userId: ctx.user!.id },
				})

				if (existingOrder) {
					const orderUpdateData: Prisma.OrderUpdateInput = {}
					if (order.recurrencePeriod !== undefined) {
						orderUpdateData.recurrencePeriod = order.recurrencePeriod
					}
					if (order.quantity != null) {
						orderUpdateData.quantity = order.quantity
					}
					await prisma.order.update({
						where: { id: existingOrder.id },
						data: orderUpdateData,
					})
				} else if (
					(order.quantity !== null && order.quantity !== undefined) ||
					(order.recurrencePeriod !== undefined && order.recurrencePeriod > 0)
				) {
					await prisma.order.create({
						data: {
							request: { connect: { id } },
							user: { connect: { id: ctx.user!.id } },
							recurrencePeriod: order.recurrencePeriod || 0,
							quantity: order.quantity ?? 1,
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
