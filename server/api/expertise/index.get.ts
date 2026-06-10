import prisma from '~~/lib/prisma';

export default defineEventHandler(async () => {
	try {
		const expertise = await prisma.expertiseNode.findMany({
			where: { isActive: true },
			select: { id: true, title: true },
			orderBy: { title: 'asc' },
		});
		return { expertise };
	} catch (error: Error | any) {
		throw createError({
			statusCode: 500,
			message: error.message,
		});
	}
});
