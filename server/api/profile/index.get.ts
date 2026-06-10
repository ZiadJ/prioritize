import prisma from '~~/lib/prisma';
import { verifyToken, returnUserJwtPayload } from '~~/server/utils/handleAuth';

function getCookieFromHeader(cookieHeader: string | null | undefined, name: string): string | null {
	if (!cookieHeader) return null;
	const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
	return match?.[1] ?? null;
}

async function getAuthUserFromEvent(event: any) {
	const authHeader = event.node?.req?.headers?.authorization;
	const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

	const cookieHeader = event.node?.req?.headers?.cookie;
	const cookieToken = getCookieFromHeader(cookieHeader, 'auth.token');

	const accessToken = token || cookieToken;
	if (!accessToken) {
		throw createError({ statusCode: 401, message: 'Authorization token is missing.' });
	}

	const decoded = await verifyToken(accessToken);
	return await returnUserJwtPayload(decoded);
}

export default defineEventHandler(async (event) => {
	try {
		const user = await getAuthUserFromEvent(event);
		const profile = await prisma.user.findUnique({
			where: { id: user.id },
			include: {
				expertise: {
					select: { id: true, title: true },
				},
			},
		});
		if (!profile) {
			throw createError({ statusCode: 404, message: 'User not found.' });
		}
		const { password, tokens, ...safeProfile } = profile as any;
		return { user: safeProfile };
	} catch (error: Error | any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message,
		});
	}
});
