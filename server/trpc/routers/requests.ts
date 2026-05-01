import { CommunityNode } from './../../../prisma/generated/interfaces'
import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'
import { UnitOfMeasure } from '~~/prisma/generated/client/enums'
import { createTreeNode, buildTreeSelectDataFromNodes } from '~~/lib/tree'
import { RequestSchema } from '~~/prisma/generated/zod/schemas/models/Request.schema'

// Helper to update request totals from all its orders
async function updateRequestTotals(requestId: number) {
	const aggregates = await prisma.order.aggregate({
		where: { requestId },
		_sum: { quantity: true, priority: true },
		_count: true,
	})
	await prisma.request.update({
		where: { id: requestId },
		data: {
			totalQuantity: aggregates._sum.quantity || 0,
			totalPriority: aggregates._sum.priority || 0,
			orderCount: aggregates._count,
		},
	})
}

export const requestInput = RequestSchema.pick({
	isActive: true,
	title: true,
	body: true,
	parentId: true,
	unitOfMeasure: true,
}).extend({
	id: z.number().optional(),
	tagIds: z.array(z.number()).optional().default([]),
	order: z
		.object({
			quantity: z.number().optional().nullable(),
			recurrencePeriod: z.number().optional(),
			priority: z.number().optional(),
			dueAt: z.date().optional().nullable(),
			isBasicNeed: z.boolean().optional(),
		})
		.optional(),
})

export const createInput = requestInput
export const updateInput = requestInput.partial()

export const requestsRouter = router({
	list: protectedProcedure
		.input(
			z
				.object({
					search: z.string().optional(),
					isActive: z.boolean().optional(),
					communityId: z.number().optional(),
					scope: z
						.enum(['local', 'regional', 'regional extended', 'global'])
						.optional()
						.default('global'),
					sortBy: z.string().optional(),
					sortOrder: z.enum(['asc', 'desc']).optional(),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			// Build WHERE conditions
			const where: Prisma.RequestWhereInput = {}
			if (input?.search) {
				where.OR = [
					{ title: { contains: input.search, mode: 'insensitive' } },
					{ body: { contains: input.search, mode: 'insensitive' } },
				]
			}
			if (input?.isActive !== undefined) {
				where.isActive = input.isActive
			}

			if (input?.communityId) {
				where.communityId = input.communityId
			} else {
				// Scope-based filtering
				const scope = input?.scope || 'global'

				if (scope === 'local') {
					// Filter to user's own community only
					if (!ctx.user?.communityId) {
						return []
					}
					where.communityId = ctx.user.communityId
				} else if (scope === 'regional' || scope === 'regional extended') {
					// Filter by regional community IDs
					if (!ctx.user?.communityId) {
						return []
					}

					// Fetch user's community with relevant regional relation
					const userCommunity = await prisma.communityNode.findUnique({
						where: { id: ctx.user.communityId },
						select: {
							regionalCommunities: { select: { id: true } },
							regionalCommunitiesExtended: { select: { id: true } },
						},
					})

					// Get community IDs based on scope
					let regionalIds: number[] = []
					if (scope === 'regional') {
						regionalIds =
							userCommunity?.regionalCommunities.map(c => c.id) || []
					} else {
						regionalIds =
							userCommunity?.regionalCommunitiesExtended.map(c => c.id) || []
					}

					// Include user's own community
					const allCommunityIds = [ctx.user.communityId, ...regionalIds]

					if (allCommunityIds.length === 0) return []

					where.communityId = { in: allCommunityIds }
				}
			}
			// Note: 'global' scope applies no additional filtering beyond explicit communityId if provided

			// Build ORDER BY conditions
			const orderBy: Record<string, string | {}> = {}
			const sortOrder = input?.sortOrder || 'desc'
			const sortBy = input?.sortBy || 'totalPriority'

			// Handle dot notation for nested sorting (e.g., 'communityNode.title')
			if (sortBy.includes('.')) {
				const [parentField, field] = sortBy.split('.')
				orderBy[parentField!] = { [field!]: sortOrder }
			} else {
				orderBy[sortBy] = sortOrder
			}

			// Fetch all matching requests, sorted by denormalized totalPriority
			const result = await prisma.request.findMany({
				where,
				orderBy,
				include: {
					tags: true,
					communityNode: true,
					editors: true,
					// _count: {
					// 	select: { children: true },
					// },
				},
			})

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
					_count: {
						select: {
							children: true,
							revisions: true,
						},
					},
				},
			})
		}),

	create: protectedProcedure
		.input(createInput)
		.mutation(async ({ ctx, input }) => {
			const { tagIds, parentId, order, ...data } = input as z.infer<
				typeof createInput
			>

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
					ownerId: ctx.user!.id,
					tags: tagIds?.length
						? {
								connect: tagIds.map((id: number) => ({ id })),
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
							isBasicNeed: order.isBasicNeed ?? false,
							priority: order.priority ?? 0,
							dueAt: order.dueAt ? new Date(order.dueAt) : null,
						},
					})
				}

				// Update denormalized totals
				await updateRequestTotals(node.id)

				return node
			} catch (e) {
				console.error('Prisma create error:', e)
				throw e
			}
		}),

	update: protectedProcedure
		.input(updateInput)
		.mutation(async ({ ctx, input }) => {
			const { id, tagIds, order, unitOfMeasure, ...data } = input as z.infer<
				typeof updateInput
			>

			// Fetch the request to check permissions
			const existingRequest = await prisma.request.findUnique({
				where: { id },
				include: { editors: true },
			})

			if (!existingRequest) {
				throw new Error('Request not found')
			}

			// Only the owner or editors can edit request fields
			const isOwnerOrEditor =
				existingRequest.ownerId === ctx.user!.id ||
				existingRequest.editors.some(editor => editor.id === ctx.user!.id)

			const updateData: Prisma.RequestUpdateInput = {}

			// Only update request fields if user is the owner or an editor
			if (isOwnerOrEditor) {
				if (Object.keys(data).length > 0) {
					Object.assign(updateData, data)
				}
				if (tagIds !== undefined) {
					updateData.tags = {
						set: tagIds.map((tagId: number) => ({ id: tagId })),
					}
				}
				if (unitOfMeasure !== undefined) {
					updateData.unitOfMeasure = unitOfMeasure
				}
			}

			let updatedRequest: any

			if (Object.keys(updateData).length > 0) {
				updatedRequest = await prisma.request.update({
					where: { id },
					data: updateData,
				})
			} else {
				updatedRequest = existingRequest
			}

			// Handle Order update/creation - allowed for any user
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
					if (order.priority !== undefined) {
						orderUpdateData.priority = order.priority
					}
					if (order.dueAt !== undefined) {
						orderUpdateData.dueAt = order.dueAt ? new Date(order.dueAt) : null
					}
					if (order.isBasicNeed !== undefined) {
						orderUpdateData.isBasicNeed = order.isBasicNeed
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
							isBasicNeed: order.isBasicNeed ?? false,
							priority: order.priority ?? 0,
							dueAt: order.dueAt ? new Date(order.dueAt) : null,
						},
					})
				}

				// Update denormalized totals after any order change
				await updateRequestTotals(id!)
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

	// Get all orders for a specific request (for orders dialog)
	getOrders: publicProcedure
		.input(z.object({ requestId: z.number() }))
		.query(async ({ input }) => {
			return prisma.order.findMany({
				where: { requestId: input.requestId },
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
				orderBy: { createdAt: 'desc' },
			})
		}),

	// Get the current user's order for a specific request (for edit form)
	getUserOrder: publicProcedure
		.input(z.object({ requestId: z.number() }))
		.query(async ({ ctx, input }) => {
			if (!ctx.user) return null
			return prisma.order.findFirst({
				where: { requestId: input.requestId, userId: ctx.user.id },
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
