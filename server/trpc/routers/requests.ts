import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'
import { UnitOfMeasure } from '~~/prisma/generated/client/enums'
import { createTreeNode } from '~~/lib/tree'
import { RequestSchema } from '~~/prisma/generated/zod/schemas/models/Request.schema'
import { UserRequestSchema } from '~~/prisma/generated/zod/schemas/models/UserRequest.schema'

// Helper to update request totals from all its user requests
async function updateRequestTotals(requestId: number) {
	const aggregates = await prisma.userRequest.aggregate({
		where: { requestId },
		_sum: { quantity: true, priority: true },
		_count: true,
	})
	await prisma.request.update({
		where: { id: requestId },
		data: {
			totalQuantity: aggregates._sum.quantity || 0,
			totalPriority: aggregates._sum.priority || 0,
			userRequestCount: aggregates._count,
		},
	})
}

export const createInput = RequestSchema.pick({
	title: true,
	description: true,
	parentId: true,
	unitOfMeasure: true,
}).extend({
	tagIds: z.array(z.number()).optional().default([]),
	userRequest: UserRequestSchema.pick({
		quantity: true,
		priority: true,
		recurrencePeriod: true,
		dueAt: true,
		isBasicNeed: true,
	}).optional(),
})

export const updateInput = createInput.extend({
	id: z.number(),
})

export const requestsRouter = router({
	list: protectedProcedure
		.input(
			z
				.object({
					search: z.string().optional(),
					isActive: z.boolean().optional(),
					communityId: z.number().optional(),
					scope: z
						.enum(['community', 'regional', 'local', 'global'])
						.optional()
						.default('global'),
					sortBy: z.string().optional(),
					sortOrder: z.number().optional(),
					tagIds: z.array(z.number()).optional(),
					expertiseId: z.number().optional(),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			// Build WHERE conditions
			const where: Prisma.RequestWhereInput = {}
			if (input?.search) {
				where.OR = [
					{ title: { contains: input.search, mode: 'insensitive' } },
					{ description: { contains: input.search, mode: 'insensitive' } },
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

				if (scope === 'community') {
					// Filter to user's own community only
					if (!ctx.user?.communityId) {
						return []
					}
					where.communityId = ctx.user.communityId
				} else if (scope === 'regional' || scope === 'local') {
					// Filter by regional community IDs
					if (!ctx.user?.communityId) {
						return []
					}

				// Fetch user's community with relevant regional relation
				const userCommunity = await prisma.community.findUnique({
					where: { id: ctx.user.communityId },
					select: {
						regionalCommunities: { select: { id: true } },
						localCommunities: { select: { id: true } },
					},
				})

					// Get community IDs based on scope
					let regionalIds: number[] = []
					if (scope === 'regional') {
						regionalIds =
							userCommunity?.regionalCommunities.map(c => c.id) || []
					} else {
						regionalIds = userCommunity?.localCommunities.map(c => c.id) || []
					}

					// Include user's own community
					const allCommunityIds = [ctx.user.communityId, ...regionalIds]

					if (allCommunityIds.length === 0) return []

					where.communityId = { in: allCommunityIds }
				}
			}

			if (input?.tagIds && input.tagIds.length > 0) {
				where.tags = { some: { id: { in: input.tagIds } } }
			}

			if (input?.expertiseId) {
				where.requestNodes = {
					some: { expertiseNodeId: input.expertiseId },
				}
			}

			// Build ORDER BY conditions
			const orderBy: Record<string, string | {}> = {}
			const sortOrder = input?.sortOrder === -1 ? 'desc' : 'asc'
			const sortBy = input?.sortBy || 'totalPriority'

			// Handle dot notation for nested sorting (e.g., 'community.title')
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
				community: true,
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
					effects: true,
					owner: true,
					editors: true,
					requestNodes: {
						include: {
							feedback: true,
							expertise: true,
						},
					},
			proposals: {
				include: {
					owner: {
						select: { username: true },
					},
				},
			},
				userRequests: true,
				community: true,
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
	const { tagIds, parentId, userRequest, ...data } = input as z.infer<
		typeof createInput
	>

		if (!ctx.user!.communityId) {
			throw new Error('User must be assigned to a community')
		}

		try {
		const node = await createTreeNode(prisma.request, {
				...data,
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

		// Create UserRequest if userRequest data is provided and has quantity or recurrencePeriod
		if (
			userRequest &&
			((userRequest.quantity !== null && userRequest.quantity !== undefined) ||
				(userRequest.recurrencePeriod && userRequest.recurrencePeriod > 0))
		) {
			await prisma.userRequest.create({
				data: {
					request: { connect: { id: node.id } },
					user: { connect: { id: ctx.user!.id } },
					recurrencePeriod: userRequest.recurrencePeriod || 0,
					quantity: userRequest.quantity ?? 1,
					isBasicNeed: userRequest.isBasicNeed ?? false,
					priority: userRequest.priority ?? 0,
					dueAt: userRequest.dueAt ? new Date(userRequest.dueAt) : null,
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
	const { id, tagIds, userRequest, unitOfMeasure, ...data } = input as z.infer<
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

	// Handle UserRequest update/creation - allowed for any user
	if (userRequest !== undefined) {
		const existingUserRequest = await prisma.userRequest.findFirst({
			where: { requestId: id, userId: ctx.user!.id },
		})

		if (existingUserRequest) {
			const userRequestUpdateData: Prisma.UserRequestUpdateInput = {}
			if (userRequest.recurrencePeriod !== undefined) {
				userRequestUpdateData.recurrencePeriod = userRequest.recurrencePeriod
			}
			if (userRequest.quantity != null) {
				userRequestUpdateData.quantity = userRequest.quantity
			}
			if (userRequest.priority !== undefined) {
				userRequestUpdateData.priority = userRequest.priority
			}
			if (userRequest.dueAt !== undefined) {
				userRequestUpdateData.dueAt = userRequest.dueAt ? new Date(userRequest.dueAt) : null
			}
			if (userRequest.isBasicNeed !== undefined) {
				userRequestUpdateData.isBasicNeed = userRequest.isBasicNeed
			}
			await prisma.userRequest.update({
				where: { id: existingUserRequest.id },
				data: userRequestUpdateData,
			})
		} else if (
			(userRequest.quantity !== null && userRequest.quantity !== undefined) ||
			(userRequest.recurrencePeriod !== undefined && userRequest.recurrencePeriod > 0)
		) {
			await prisma.userRequest.create({
				data: {
					request: { connect: { id } },
					user: { connect: { id: ctx.user!.id } },
					recurrencePeriod: userRequest.recurrencePeriod || 0,
					quantity: userRequest.quantity ?? 1,
					isBasicNeed: userRequest.isBasicNeed ?? false,
					priority: userRequest.priority ?? 0,
					dueAt: userRequest.dueAt ? new Date(userRequest.dueAt) : null,
				},
			})
		}

		// Update denormalized totals after any user request change
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

	// Get all user requests for a specific request (for user requests dialog)
	getUserRequests: publicProcedure
		.input(z.object({ requestId: z.number() }))
		.query(async ({ input }) => {
			return prisma.userRequest.findMany({
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

	// Get the current user's user request for a specific request (for edit form)
	getUserRequest: publicProcedure
		.input(z.object({ requestId: z.number() }))
		.query(async ({ ctx, input }) => {
			if (!ctx.user) return null
			return prisma.userRequest.findFirst({
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

	// Community procedures
	listCommunities: publicProcedure.query(async () => {
		return prisma.community.findMany({
			orderBy: { title: 'asc' },
		})
	}),

	listExpertise: protectedProcedure.query(async () => {
		const requestNodes = await prisma.requestNode.findMany({
			where: {
				isActive: true,
				request: { isActive: true },
				expertiseNodeId: { not: null },
			},
			select: { expertiseNodeId: true },
			distinct: ['expertiseNodeId'],
		})
		const expertiseIds = requestNodes.map(rn => rn.expertiseNodeId!).filter(Boolean)
		if (expertiseIds.length === 0) return []
		return prisma.expertiseNode.findMany({
			where: { id: { in: expertiseIds } },
			orderBy: { title: 'asc' },
		})
	}),

	getCommunityTree: publicProcedure.query(async () => {
		const allCommunities = await prisma.community.findMany({
			orderBy: { title: 'asc' },
		})
		return allCommunities.map(c => ({
			key: String(c.id),
			label: c.title,
			data: c,
			children: [],
		}))
	}),
})
