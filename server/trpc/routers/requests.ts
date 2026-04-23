import { z } from 'zod'
import { publicProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'
import { createTreeNode } from '~~/lib/tree'
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
					type: z.number().optional(),
					level: z.number().optional(),
					isActive: z.boolean().optional(),
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
					type: input?.type,
					level: input?.level,
					isActive: input?.isActive,
				},
				orderBy: { createdAt: 'desc' },
				include: {
					tags: true,
					_count: {
						select: { children: true, requests: true, feedback: true },
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
							requests: true,
							feedback: true,
							revisions: true,
						},
					},
				},
			})
		}),

	create: publicProcedure
		.input(
			z.object({
				title: z.string().min(1),
				body: z.string().optional().default(''),
				type: z.number().default(0),
				level: z.number().default(0),
				parentId: z.number().optional(),
				tagIds: z.array(z.number()).optional().default([]),
				recurrencePeriod: z.number().optional().default(0),
			}),
		)
		.mutation(async ({ input }) => {
			const { tagIds, parentId, ...data } = input

			try {
				const node = await createTreeNode(prisma.request, {
					...data,
					isActive: true,
					parentId,
					tags: tagIds?.length
						? {
								connect: tagIds.map(id => ({ id })),
							}
						: undefined,
				})
				return node
			} catch (e) {
				console.error('Prisma create error:', e)
				throw e
			}
		}),

	update: publicProcedure
		.input(
			z.object({
				id: z.number(),
				title: z.string().min(1).optional(),
				body: z.string().optional(),
				type: z.number().optional(),
				level: z.number().optional(),
				isActive: z.boolean().optional(),
				tagIds: z.array(z.number()).optional(),
				recurrencePeriod: z.number().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const { id, tagIds, ...data } = input
			const updateData: Prisma.RequestUpdateInput = { ...data }

			if (tagIds !== undefined) {
				updateData.tags = {
					set: tagIds.map(tagId => ({ id: tagId })),
				}
			}

			return prisma.request.update({
				where: { id },
				data: updateData,
			})
		}),

	delete: publicProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input }) => {
			return prisma.request.delete({
				where: { id: input.id },
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
})
