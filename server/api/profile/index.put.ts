import prisma from '~~/lib/prisma';
import { z } from 'zod';
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

const profileSchema = z.object({
	firstname: z.string().optional(),
	lastname: z.string().optional(),
	username: z.string().optional(),
	email: z.string().email().optional(),
	bio: z.string().optional(),
	picture: z.string().nullable().optional(),
	dateOfBirth: z.string().nullable().optional(),
	role: z.string().optional(),
	countryId: z.number().nullable().optional(),
	expertiseIds: z.array(z.number()).optional(),
});

export default defineEventHandler(async (event) => {
	try {
		const authUser = await getAuthUserFromEvent(event);
		const body = await readBody(event);
		const data = profileSchema.parse(body);

		const updateData: any = {};
		if (data.firstname !== undefined) updateData.firstname = data.firstname;
		if (data.lastname !== undefined) updateData.lastname = data.lastname;
		if (data.username !== undefined) updateData.username = data.username;
		if (data.email !== undefined) updateData.email = data.email;
		if (data.bio !== undefined) updateData.bio = data.bio;
		if (data.picture !== undefined) updateData.picture = data.picture;
		if (data.dateOfBirth !== undefined)
			updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
		if (data.role !== undefined) updateData.role = data.role;
		if (data.countryId !== undefined) updateData.countryId = data.countryId;

		if (data.expertiseIds !== undefined) {
			updateData.expertise = {
				set: data.expertiseIds.map((id: number) => ({ id })),
			};
		}

		const updated = await prisma.user.update({
			where: { id: authUser.id },
			data: updateData,
			include: {
				expertise: {
					select: { id: true, title: true },
				},
			},
		});

		const { password, tokens, ...safeProfile } = updated as any;
		return { user: safeProfile };
	} catch (error: Error | any) {
		if (error instanceof z.ZodError) {
			throw createError({
				statusCode: 400,
				message: error.errors.map((e) => e.message).join(', '),
			});
		}
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message,
		});
	}
});
