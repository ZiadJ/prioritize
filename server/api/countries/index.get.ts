import prisma from '~~/lib/prisma';

export default defineEventHandler(async () => {
	try {
		const countries = await prisma.country.findMany({
			select: { id: true, name: true, code: true },
			orderBy: { name: 'asc' },
		});
		return { countries };
	} catch (error: Error | any) {
		throw createError({
			statusCode: 500,
			message: error.message,
		});
	}
});
