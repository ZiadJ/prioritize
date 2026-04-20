import prisma from '~~/lib/prisma';

export default defineEventHandler(async event => {
	try {
		const users = await prisma.user.findMany({
			orderBy: {
				createdAt: 'desc',
			},
		});

		return {
			users,
		};
	} catch (error: Error | any) {
		throw createError({
			statusCode: 500,
			message: error.message,
		});
	}
});