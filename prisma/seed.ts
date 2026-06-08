import prisma from '../lib/prisma'
import bcrypt from 'bcrypt'
import { createTreeNode } from '../lib/tree'

async function main() {
	console.log('Starting seed...')

	const hashedPassword = await bcrypt.hash('test', 10)

	const tables = await prisma.$queryRaw<{ tablename: string }[]>`
		SELECT tablename FROM pg_tables
		WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
	`

	await prisma.$executeRawUnsafe(
		`TRUNCATE TABLE ${tables.map(({ tablename }) => `"public"."${tablename}"`).join(', ')} RESTART IDENTITY CASCADE`,
	)

	const countryA = await prisma.country.create({
		data: {
			name: 'Country A',
			code: 'A',
			phoneCode: '+1',
			isActive: true,
		},
	})

	const countryB = await prisma.country.create({
		data: {
			name: 'Country B',
			code: 'B',
			phoneCode: '+1',
			isActive: true,
		},
	})

	const country1 = await createTreeNode(prisma.communityNode, {
		title: 'Valley Region',
		body: 'Region in the northern region',
		country: { connect: { id: countryA.id } },
		address: 'Country A',
		longitude: -95.7129,
		latitude: 37.0902,
		isActive: true,
	})

	const state1 = await createTreeNode(prisma.communityNode, {
		title: 'Arcadia',
		body: 'State of Arcadia',
		country: { connect: { id: countryA.id } },
		address: 'Arcadia, Country A',
		longitude: -119.4179,
		latitude: 36.7783,
		parentId: country1.id,
		isActive: true,
	})

	const city1 = await createTreeNode(prisma.communityNode, {
		title: 'Harbor City',
		body: 'City of Harbor City',
		country: { connect: { id: countryA.id } },
		address: 'Harbor City, Arcadia, Country A',
		longitude: -122.4194,
		latitude: 37.7749,
		parentId: state1.id,
		isActive: true,
	})

	const country2 = await createTreeNode(prisma.communityNode, {
		title: 'Mountain Region',
		body: 'Region in the northern region',
		country: { connect: { id: countryB.id } },
		address: 'Country B',
		longitude: -106.3468,
		latitude: 56.1304,
		isActive: true,
	})

	const state2 = await createTreeNode(prisma.communityNode, {
		title: 'Lake Province',
		body: 'Province of Lake Province',
		country: { connect: { id: countryB.id } },
		address: 'Lake Province, Country B',
		longitude: -79.3832,
		latitude: 43.6532,
		parentId: country2.id,
		isActive: true,
	})

	const city2 = await createTreeNode(prisma.communityNode, {
		title: 'Central City',
		body: 'City of Central City',
		country: { connect: { id: countryB.id } },
		address: 'Central City, Lake Province, Country B',
		longitude: -79.3832,
		latitude: 43.6532,
		parentId: state2.id,
		isActive: true,
	})

	console.log('Community nodes created')

	const adminUser = await prisma.user.upsert({
		where: { username: 'admin@example.com' },
		update: { password: hashedPassword },
		create: {
			username: 'admin@example.com',
			email: 'admin@example.com',
			password: hashedPassword,
			firstname: 'Admin',
			lastname: 'User',
			isActive: true,
			isVerified: true,
			role: 'admin',
			communityId: city1.id,
			countryId: countryB.id,
		},
	})

	const regularUser = await prisma.user.upsert({
		where: { username: 'user@example.com' },
		update: { password: hashedPassword },
		create: {
			username: 'user@example.com',
			email: 'user@example.com',
			password: hashedPassword,
			firstname: 'Regular',
			lastname: 'User',
			isActive: true,
			communityId: city2.id,
			countryId: countryA.id,
		},
	})

	console.log('Users created')

	// --- Single request: reliable water supply for dry season ---

	const waterRequest = await prisma.request.create({
		data: {
			id: 1,
			title: 'A reliable water supply for the dry season',
			body: 'The community needs a dependable water supply that lasts through the annual dry season (roughly 4-6 months). Current sources become unreliable or dry up entirely, forcing residents to ration water. Any solution must be affordable, maintainable by the community, and provide enough clean water for drinking, cooking, and basic hygiene.',
			unitOfMeasure: 'CubicMetres',
			ownerId: adminUser.id,
			communityId: city1.id,
			countryId: countryA.id,
			orders: {
				create: {
					userId: adminUser.id,
					quantity: 500,
					priority: 300.0,
					recurrencePeriod: 365,
					isBasicNeed: true,
				},
			},
		},
	})

	console.log('Request created')

	// --- RequestNode tree ---

	const rnTreatment = await createTreeNode(prisma.requestNode, {
		title: 'Treatment method',
		body: 'How water is made safe to drink.',
		isActive: true,
		isVariantsGroup: false,
		isNonNegotiable: false,
		request: { connect: { id: waterRequest.id } },
		owner: { connect: { id: adminUser.id } },
		position: 1,
	})

	await createTreeNode(prisma.requestNode, {
		title: 'Natural filtration only',
		body: 'Sand, gravel, or bio-sand — no chemicals or electricity.',
		isActive: true,
		isVariantsGroup: false,
		isNonNegotiable: false,
		parentId: rnTreatment.id,
		request: { connect: { id: waterRequest.id } },
		owner: { connect: { id: adminUser.id } },
		position: 1,
	})

	await createTreeNode(prisma.requestNode, {
		title: 'No chlorine',
		body: 'Avoid chlorine dosing entirely.',
		isActive: true,
		isVariantsGroup: false,
		isNonNegotiable: false,
		parentId: rnTreatment.id,
		request: { connect: { id: waterRequest.id } },
		owner: { connect: { id: adminUser.id } },
		position: 2,
	})

	const rnSource = await createTreeNode(prisma.requestNode, {
		title: 'Water source',
		body: 'Where the water comes from.',
		isActive: true,
		isVariantsGroup: false,
		isNonNegotiable: false,
		request: { connect: { id: waterRequest.id } },
		owner: { connect: { id: adminUser.id } },
		position: 2,
	})

	await createTreeNode(prisma.requestNode, {
		title: 'Rain-fed with storage',
		body: 'Capture rainfall during wet months for dry-season use.',
		isActive: true,
		isVariantsGroup: false,
		isNonNegotiable: false,
		parentId: rnSource.id,
		request: { connect: { id: waterRequest.id } },
		owner: { connect: { id: adminUser.id } },
		position: 1,
	})

	await createTreeNode(prisma.requestNode, {
		title: 'Groundwater via borehole',
		body: 'Independent of rainfall but requires drilling and a pump.',
		isActive: true,
		isVariantsGroup: false,
		isNonNegotiable: false,
		parentId: rnSource.id,
		request: { connect: { id: waterRequest.id } },
		owner: { connect: { id: adminUser.id } },
		position: 2,
	})

	const rnBuild = await createTreeNode(prisma.requestNode, {
		title: 'Construction',
		body: 'How the system is built and repaired.',
		isActive: true,
		isVariantsGroup: false,
		isNonNegotiable: false,
		request: { connect: { id: waterRequest.id } },
		owner: { connect: { id: adminUser.id } },
		position: 3,
	})

	await createTreeNode(prisma.requestNode, {
		title: 'Buildable by hand',
		body: 'Shovels, sand, and cement — no heavy machinery.',
		isActive: true,
		isVariantsGroup: false,
		isNonNegotiable: false,
		parentId: rnBuild.id,
		request: { connect: { id: waterRequest.id } },
		owner: { connect: { id: adminUser.id } },
		position: 1,
	})

	await createTreeNode(prisma.requestNode, {
		title: 'No drilling',
		body: 'Avoid hiring drilling rigs or heavy machinery.',
		isActive: true,
		isVariantsGroup: false,
		isNonNegotiable: false,
		parentId: rnBuild.id,
		request: { connect: { id: waterRequest.id } },
		owner: { connect: { id: adminUser.id } },
		position: 2,
	})

	console.log('RequestNodes created')

	// --- Tags ---

	const tagHealth = await prisma.tag.create({
		data: { name: 'health', type: 'request' },
	})

	const tagWater = await prisma.tag.create({
		data: { name: 'water', type: 'request' },
	})

	const tagInfrastructure = await prisma.tag.create({
		data: { name: 'infrastructure', type: 'request' },
	})

	await prisma.request.update({
		where: { id: waterRequest.id },
		data: {
			tags: {
				connect: [
					{ id: tagHealth.id },
					{ id: tagWater.id },
					{ id: tagInfrastructure.id },
				],
			},
		},
	})

	console.log('Tags created and assigned')

	// --- Proposals ---

	const proposal1 = await prisma.proposal.create({
		data: {
			title: 'Rainwater Cistern System',
			body: 'Install rooftop gutters on community buildings leading to a cluster of sealed ferro-cement cisterns (total ~50 m³). Water passes through a gravel pre-filter before storage and a bio-sand filter at the point-of-use tap. A gravity-fed pipe runs from the cisterns to a central tap stand. A water committee oversees minor repairs and collects monthly fees for replacement sand and gutter patching.',
			isComplete: true,
			stepCount: 4,
			duration: 45,
			priority: 1,
			riskFactor: 15,
			deliveryDays: 60,
			owner: { connect: { id: adminUser.id } },
			request: { connect: { id: waterRequest.id } },
		},
	})

	const proposal2 = await prisma.proposal.create({
		data: {
			title: 'Communal Well with Hand Pump',
			body: 'Drill a borehole to the water table (~30 m) and install an India Mark II hand pump. The pump is located centrally so no household is more than 500 m away. Water is chlorinated monthly by a trained community health volunteer. Maintenance relies on a community committee trained in basic pump repair, with a spare-parts fund built from household contributions.',
			isComplete: true,
			stepCount: 3,
			duration: 30,
			priority: 2,
			riskFactor: 25,
			deliveryDays: 45,
			owner: { connect: { id: regularUser.id } },
			request: { connect: { id: waterRequest.id } },
		},
	})

	const proposal3 = await prisma.proposal.create({
		data: {
			title: 'Swales and Retention Pond Network',
			body: "Excavate contour swales across the community's slopes to slow runoff and recharge the water table. A lined retention pond (~200 m³) captures peak flow and stores it through the early dry season. Water is distributed by gravity pipe to a central tap. No mechanical parts; maintenance is mainly clearing swales of debris each season. Lowest cost but also lowest water quality—requires a separate filtration step.",
			isComplete: true,
			stepCount: 5,
			duration: 60,
			priority: 3,
			riskFactor: 35,
			deliveryDays: 90,
			owner: { connect: { id: adminUser.id } },
			request: { connect: { id: waterRequest.id } },
		},
	})

	console.log('Proposals created')

	// --- Seed feedback so proposals appear with ratings ---

	const allRequestNodes = await prisma.requestNode.findMany({
		where: { requestId: waterRequest.id },
	})

	const feedbackRatings: Record<string, Record<string, number>> = {
		[proposal1.title]: {
			'Treatment method': 2,
			'Natural filtration only': 3,
			'No chlorine': 3,
			'Water source': 2,
			'Rain-fed with storage': 3,
			'Groundwater via borehole': -2,
			'Construction': 2,
			'Buildable by hand': 3,
			'No drilling': 3,
		},
		[proposal2.title]: {
			'Treatment method': 1,
			'Natural filtration only': -3,
			'No chlorine': -3,
			'Water source': 2,
			'Rain-fed with storage': -3,
			'Groundwater via borehole': 3,
			'Construction': 1,
			'Buildable by hand': -1,
			'No drilling': -3,
		},
		[proposal3.title]: {
			'Treatment method': -1,
			'Natural filtration only': -2,
			'No chlorine': 3,
			'Water source': 1,
			'Rain-fed with storage': 2,
			'Groundwater via borehole': -1,
			'Construction': 3,
			'Buildable by hand': 2,
			'No drilling': 3,
		},
	}

	const adminFeedbackRatings: Record<string, number> = {
		'Treatment method': 2,
		'Natural filtration only': 1,
		'No chlorine': 2,
		'Water source': 1,
		'Rain-fed with storage': 2,
		'Groundwater via borehole': -1,
		'Construction': 2,
		'Buildable by hand': 1,
		'No drilling': 2,
	}

	const proposals = [proposal1, proposal2, proposal3]

	for (const rn of allRequestNodes) {
		for (const p of proposals) {
			const rating = feedbackRatings[p.title]?.[rn.title] ?? 0
			await prisma.feedback.create({
				data: {
					isActive: true,
					rating,
					confidence: 0,
					requestNode: { connect: { id: rn.id } },
					proposal: { connect: { id: p.id } },
					user: { connect: { id: regularUser.id } },
				},
			})
		}

		const adminRating = adminFeedbackRatings[rn.title] ?? 0
		await prisma.feedback.create({
			data: {
				isActive: true,
				rating: adminRating,
				confidence: 0,
				requestNode: { connect: { id: rn.id } },
				user: { connect: { id: adminUser.id } },
			},
		})
	}

	console.log('Feedbacks created')
	console.log('Seed completed!')
}

main()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
