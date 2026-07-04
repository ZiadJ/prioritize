import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'
import { MeasurementType } from '~~/prisma/generated/client/enums'
import { createTreeNode } from '~~/lib/tree'
import { RequestSchema } from '~~/prisma/generated/zod/schemas/models/Request.schema'

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
	measurementType: true,
	isJoinable: true,
}).extend({
	tagIds: z.array(z.number()).optional().default([]),
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
	const { tagIds, parentId, ...data } = input as z.infer<
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
	const { id, tagIds, measurementType, ...data } = input as z.infer<
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
			if (measurementType !== undefined) {
				updateData.measurementType = measurementType
			}
			}

			if (Object.keys(updateData).length > 0) {
				return await prisma.request.update({
					where: { id },
					data: updateData,
				})
			}

			return existingRequest
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

	// Create or update the current user's user request for a specific request
	saveUserRequest: protectedProcedure
		.input(
			z.object({
				requestId: z.number(),
				quantity: z.number().nullable().optional(),
				priority: z.number().optional(),
				recurrencePeriod: z.number().optional(),
				dueAt: z.coerce.date().nullable().optional(),
				isBasicNeed: z.boolean().optional(),
				isJoined: z.boolean().optional(),
				comment: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { requestId, ...data } = input
			const existingUserRequest = await prisma.userRequest.findFirst({
				where: { requestId, userId: ctx.user!.id },
			})

			if (existingUserRequest) {
				const updateData: Prisma.UserRequestUpdateInput = {}
				if (data.recurrencePeriod !== undefined)
					updateData.recurrencePeriod = data.recurrencePeriod
				if (data.quantity != null)
					updateData.quantity = data.isJoined ? 0 : data.quantity
				if (data.priority !== undefined)
					updateData.priority = data.priority
				if (data.dueAt !== undefined)
					updateData.dueAt = data.dueAt ? new Date(data.dueAt) : null
				if (data.isBasicNeed !== undefined)
					updateData.isBasicNeed = data.isBasicNeed
				if (data.isJoined !== undefined) {
					updateData.isJoined = data.isJoined
					if (data.isJoined) updateData.quantity = 0
				}
				if (data.comment !== undefined)
					updateData.comment = data.comment
				await prisma.userRequest.update({
					where: { id: existingUserRequest.id },
					data: updateData,
				})
			} else {
				await prisma.userRequest.create({
					data: {
						request: { connect: { id: requestId } },
						user: { connect: { id: ctx.user!.id } },
						recurrencePeriod: data.recurrencePeriod || 0,
						quantity: data.isJoined ? 0 : (data.quantity ?? 1),
						isBasicNeed: data.isBasicNeed ?? false,
						isJoined: data.isJoined ?? false,
						priority: data.priority ?? 0,
						dueAt: data.dueAt ? new Date(data.dueAt) : null,
						comment: data.comment ?? '',
					},
				})
			}

		await updateRequestTotals(requestId)
		return { success: true }
	}),

	// Delete the current user's user request for a specific request
	deleteUserRequest: protectedProcedure
		.input(z.object({ requestId: z.number() }))
		.mutation(async ({ ctx, input }) => {
			await prisma.userRequest.deleteMany({
				where: { requestId: input.requestId, userId: ctx.user!.id },
			})
			await updateRequestTotals(input.requestId)
			return { success: true }
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

	// List requests associated with a specific user (as owner, editor, or
	// via a user request indicating demand/priority contribution)
	listByUser: publicProcedure
		.input(z.object({ userId: z.string() }))
		.query(async ({ input }) => {
		const [owned, edited, requested] = await Promise.all([
			prisma.request.findMany({
				where: { ownerId: input.userId },
				include: { tags: true, community: true, editors: true },
			}),
			prisma.request.findMany({
				where: { editors: { some: { id: input.userId } } },
				include: { tags: true, community: true, editors: true },
			}),
			prisma.userRequest.findMany({
				where: { userId: input.userId },
				select: {
					quantity: true,
					priority: true,
					isJoined: true,
					isActive: true,
					dueAt: true,
					recurrencePeriod: true,
					request: {
						include: {
							tags: true,
							community: true,
							editors: true,
						},
					},
				},
			}),
		])

		type RequestWithIncludes = (typeof owned)[number]
		const byId = new Map<
			number,
			{
				request: RequestWithIncludes
				role: 'Owner' | 'Editor' | 'Requester'
				priority: number
				quantity: number
			}
		>()

		for (const r of owned) {
			byId.set(r.id, { request: r, role: 'Owner', priority: 0, quantity: 0 })
		}
		for (const r of edited) {
			if (!byId.has(r.id)) {
				byId.set(r.id, {
					request: r,
					role: 'Editor',
					priority: 0,
					quantity: 0,
				})
			}
		}
		for (const ur of requested) {
			const existing = byId.get(ur.request.id)
			if (existing) {
				if (existing.role === 'Owner' || existing.role === 'Editor') {
					existing.priority = ur.priority
					existing.quantity = ur.quantity
				}
			} else {
				byId.set(ur.request.id, {
					request: ur.request as unknown as RequestWithIncludes,
					role: 'Requester',
					priority: ur.priority,
					quantity: ur.quantity,
				})
			}
		}

		return Array.from(byId.values()).sort(
			(a, b) =>
				new Date(b.request.createdAt).getTime() -
				new Date(a.request.createdAt).getTime(),
		)
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
