import { z } from 'zod'
import { protectedProcedure, publicProcedure, router } from '../trpc'
import prisma, { Prisma } from '~~/lib/prisma'
import { createTreeNode } from '~~/lib/tree'

const COMMENT_INCLUDE = {
	user: {
		select: { id: true, firstname: true, lastname: true, username: true },
	},
} satisfies Prisma.CommentInclude

export const commentsRouter = router({
	byProposalId: publicProcedure
		.input(z.object({ proposalId: z.number() }))
		.query(async ({ input }) => {
			return prisma.comment.findMany({
				where: { proposalId: input.proposalId, isActive: true },
				include: COMMENT_INCLUDE,
				// Path is a pre-order traversal of the tree, so ordering by
				// it yields parents before their children.
				orderBy: { path: 'asc' },
			})
		}),

	create: protectedProcedure
		.input(
			z.object({
				proposalId: z.number(),
				parentId: z.number().int().nullable().optional(),
				content: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// `createTreeNode` materialises the tree-bookkeeping fields
			// (path/depth/numchild) and connects the parent when replying.
			const node = await createTreeNode(prisma.comment, {
				content: input.content,
				parentId: input.parentId ?? null,
				proposal: { connect: { id: input.proposalId } },
				user: { connect: { id: ctx.user!.id } },
			})

			return prisma.comment.findUnique({
				where: { id: node.id },
				include: COMMENT_INCLUDE,
			})
		}),

	update: protectedProcedure
		.input(z.object({ id: z.number(), content: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const existing = await prisma.comment.findUnique({
				where: { id: input.id },
			})
			if (!existing) throw new Error('Comment not found')

			// Only the author (or an admin) may edit a comment.
			if (existing.userId !== ctx.user!.id && ctx.user!.role !== 'admin') {
				throw new Error('Not authorized to edit this comment')
			}

			return prisma.comment.update({
				where: { id: input.id },
				data: { content: input.content },
				include: COMMENT_INCLUDE,
			})
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const existing = await prisma.comment.findUnique({
				where: { id: input.id },
			})
			if (!existing) throw new Error('Comment not found')

			// Only the author (or an admin) may delete a comment.
			if (existing.userId !== ctx.user!.id && ctx.user!.role !== 'admin') {
				throw new Error('Not authorized to delete this comment')
			}

			// onDelete: Cascade removes any replies beneath this comment.
			await prisma.comment.delete({ where: { id: input.id } })
			return { id: input.id, path: existing.path }
		}),
})
