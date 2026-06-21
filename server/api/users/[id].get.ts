import prisma from '~~/lib/prisma'

// A CUID is a long string (typically 24 characters) that starts with a
// letter. Usernames are usually much shorter, so we use length as the
// primary heuristic to differentiate the two. We keep a fallback that
// tries the alternate field if the primary lookup does not match.
const CUID_MIN_LENGTH = 16

function looksLikeCuid(value: string): boolean {
	return value.length >= CUID_MIN_LENGTH && /^[a-z][a-z0-9]+$/i.test(value)
}

export default defineEventHandler(async (event) => {
	try {
		const param = getRouterParam(event, 'id') || ''

		if (!param) {
			throw createError({ statusCode: 400, message: 'Missing user identifier.' })
		}

		const isLikelyId = looksLikeCuid(param)

		const where = isLikelyId
			? { id: param }
			: { username: param }

		let user = await prisma.user.findUnique({
			where,
			include: {
				expertise: {
					select: { id: true, title: true },
				},
				country: {
					select: { id: true, name: true, code: true },
				},
				community: {
					select: { id: true, title: true },
				},
			},
		})

		// Fallback: if the heuristic was wrong, try the alternate field
		if (!user) {
			const fallbackWhere = isLikelyId
				? { username: param }
				: { id: param }
			user = await prisma.user.findUnique({
				where: fallbackWhere,
				include: {
					expertise: {
						select: { id: true, title: true },
					},
					country: {
						select: { id: true, name: true, code: true },
					},
					community: {
						select: { id: true, title: true },
					},
				},
			})
		}

		if (!user) {
			throw createError({ statusCode: 404, message: 'User not found.' })
		}

		const { password, tokens, ...safeUser } = user as any
		return { user: safeUser }
	} catch (error: Error | any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message,
		})
	}
})