import prisma from '~~/lib/prisma';

export default defineEventHandler(async (event) => {
	try {
		const users = await prisma.user.findMany({
			orderBy: {
				createdAt: 'desc',
			},
			include: {
				expertise: {
					select: { id: true, title: true },
				},
			},
		});

		const safeUsers = users.map(({ password, tokens, ...rest }: any) => rest);

		return {
			users: safeUsers,
		};
	} catch (error: Error | any) {
		throw createError({
			statusCode: 500,
			message: error.message,
		});
	}
});