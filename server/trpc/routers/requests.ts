import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import prisma from '~~/lib/prisma';

export const requestsRouter = router({
  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      type: z.number().optional(),
      level: z.number().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const where: any = {};
      
      if (input?.search) {
        where.OR = [
          { title: { contains: input.search, mode: 'insensitive' } },
          { body: { contains: input.search, mode: 'insensitive' } },
        ];
      }
      if (input?.type !== undefined) {
        where.type = input.type;
      }
      if (input?.level !== undefined) {
        where.level = input.level;
      }
      if (input?.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      return prisma.request.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          tags: true,
          _count: {
            select: {
              children: true,
              requests: true,
              feedback: true,
            },
          },
        },
      });
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
      });
    }),

  create: publicProcedure
    .input(z.object({
      title: z.string().min(1),
      body: z.string().optional().default(''),
      type: z.number().default(0),
      level: z.number().default(0),
      parentId: z.number().optional(),
      tagIds: z.array(z.number()).optional().default([]),
      recurrencePeriod: z.number().optional().default(0),
    }))
    .mutation(async ({ input }) => {
      const { tagIds, parentId, ...data } = input;

      let depth = 0;
      let path = '';
      let parentIdValue = parentId || 0;

      if (parentId) {
        const parent = await prisma.request.findUnique({
          where: { id: parentId },
        });
        if (parent) {
          depth = parent.depth + 1;
          path = parent.path;
          parentIdValue = parentId;
        }
      }

      return prisma.request.create({
        data: {
          ...data,
          depth,
          path,
          parentId: parentIdValue,
          isActive: true,
          tags: {
            connect: tagIds.map(id => ({ id })),
          },
        },
      });
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      body: z.string().optional(),
      type: z.number().optional(),
      level: z.number().optional(),
      isActive: z.boolean().optional(),
      tagIds: z.array(z.number()).optional(),
      recurrencePeriod: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, tagIds, ...data } = input;
      const updateData: any = { ...data };

      if (tagIds !== undefined) {
        updateData.tags = {
          set: tagIds.map(tagId => ({ id: tagId })),
        };
      }

      return prisma.request.update({
        where: { id },
        data: updateData,
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return prisma.request.delete({
        where: { id: input.id },
      });
    }),
});