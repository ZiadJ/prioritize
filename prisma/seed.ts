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
		description: 'Region in the northern region',
		country: { connect: { id: countryA.id } },
		address: 'Country A',
		longitude: -95.7129,
		latitude: 37.0902,
		isActive: true,
	})

	const state1 = await createTreeNode(prisma.communityNode, {
		title: 'Arcadia',
		description: 'State of Arcadia',
		country: { connect: { id: countryA.id } },
		address: 'Arcadia, Country A',
		longitude: -119.4179,
		latitude: 36.7783,
		parentId: country1.id,
		isActive: true,
	})

	const city1 = await createTreeNode(prisma.communityNode, {
		title: 'Terravita',
		description: 'Terravita ecovillage',
		country: { connect: { id: countryA.id } },
		address: 'Harbor City, Arcadia, Country A',
		longitude: -122.4194,
		latitude: 37.7749,
		parentId: state1.id,
		isActive: true,
	})

	const country2 = await createTreeNode(prisma.communityNode, {
		title: 'Mountain Region',
		description: 'Region in the northern region',
		country: { connect: { id: countryB.id } },
		address: 'Country B',
		longitude: -106.3468,
		latitude: 56.1304,
		isActive: true,
	})

	const state2 = await createTreeNode(prisma.communityNode, {
		title: 'Lake Province',
		description: 'Province of Lake Province',
		country: { connect: { id: countryB.id } },
		address: 'Lake Province, Country B',
		longitude: -79.3832,
		latitude: 43.6532,
		parentId: country2.id,
		isActive: true,
	})

	const city2 = await createTreeNode(prisma.communityNode, {
		title: 'Central City',
		description: 'City of Central City',
		country: { connect: { id: countryB.id } },
		address: 'Central City, Lake Province, Country B',
		longitude: -79.3832,
		latitude: 43.6532,
		parentId: state2.id,
		isActive: true,
	})

	console.log('Creating community nodes...')

	// --- Expertise categories and areas ---

	const expertiseCategories: Record<string, string[]> = {
		'Building & Making': [
			'Carpentry',
			'Masonry',
			'Plumbing',
			'Electrical Work',
			'HVAC',
			'Welding',
			'Metalworking',
			'Woodworking',
			'3D Printing',
			'Electronics Repair',
			'Appliance Repair',
			'Roofing',
			'Painting & Finishing',
			'CNC Machining',
			'Laser Cutting',
			'Fabrication',
		],
		Design: [
			'Architecture',
			'Interior Design',
			'Landscape Architecture',
			'Urban Design',
			'Graphic Design',
			'Illustration',
			'UI/UX Design',
			'Industrial Design',
			'Fashion & Textile Design',
			'Typography',
			'Branding',
		],
		'Growing & Land': [
			'Permaculture',
			'Organic Farming',
			'Market Gardening',
			'Horticulture',
			'Soil Science',
			'Composting',
			'Agroforestry',
			'Beekeeping',
			'Animal Husbandry',
			'Aquaculture',
			'Foraging',
			'Mycology',
			'Irrigation & Water Systems',
			'Food Preservation',
			'Vertical Farming',
			'Controlled Environment Agriculture',
		],
		'Food & Cooking': [
			'Cooking',
			'Baking & Pastry',
			'Fermentation',
			'Nutrition & Dietetics',
			'Food Science',
			'Brewing & Winemaking',
			'Preserving & Canning',
		],
		'Health & Care': [
			'General Medicine',
			'Nursing',
			'Midwifery',
			'Dentistry',
			'Physiotherapy',
			'Occupational Therapy',
			'Mental Health Counseling',
			'Psychiatry',
			'Nutrition',
			'Herbal Medicine',
			'First Aid & Emergency Care',
			'Palliative Care',
			'Elder Care',
			'Childcare',
			'Disability Support',
		],
		'Wellness & Body': [
			'Personal Training',
			'Yoga',
			'Massage Therapy',
			'Meditation & Mindfulness',
			'Breathwork',
			'Somatic Therapy',
			'Sleep Coaching',
			'Stress Management',
		],
		'Education & Learning': [
			'Early Childhood Education',
			'Primary Education',
			'Secondary Education',
			'Special Education',
			'Adult Learning',
			'Language Teaching',
			'Tutoring',
			'Curriculum Design',
			'Instructional Design',
			'Facilitation',
			'Mentoring',
		],
		'Arts & Culture': [
			'Music (Performance)',
			'Music (Composition)',
			'Music Production',
			'Sound Design',
			'Visual Arts',
			'Photography',
			'Videography',
			'Film & Video Editing',
			'Animation',
			'Storytelling',
			'Creative Writing',
			'Poetry',
			'Theater & Performance',
			'Dance',
		],
		Technology: [
			'Software Development',
			'Web Development',
			'Mobile Development',
			'Data Science',
			'Machine Learning / AI',
			'Cybersecurity',
			'Networking & Infrastructure',
			'Database Management',
			'DevOps',
			'Hardware & Electronics',
			'Robotics',
			'Automation',
			'Embedded Systems',
			'IoT',
			'Drone Technology',
			'Augmented & Virtual Reality',
		],
		'Communication & Media': [
			'Writing & Editing',
			'Technical Writing',
			'Translation & Interpretation',
			'Journalism',
			'Podcasting',
			'Public Speaking',
			'Social Media',
			'Sign Language',
		],
		'Community & Social': [
			'Community Organizing',
			'Conflict Resolution & Mediation',
			'Social Work',
			'Counseling & Listening',
			'Youth Work',
			'Elder Support',
			'Peer Support',
			'Volunteer Coordination',
			'Event Organizing',
			'Group Dynamics',
		],
		'Research & Knowledge': [
			'Research Methods',
			'Documentation',
			'Knowledge Management',
			'Archiving',
			'Data Analysis',
			'Mapping & GIS',
			'Survey Design',
			'Scientific Writing',
		],
		'Governance & Coordination': [
			'Project Management',
			'Sociocracy & Consensus Facilitation',
			'Legal Advice',
			'Policy & Advocacy',
			'Grant Writing',
			'Fundraising',
			'Financial Management',
			'Accounting',
			'Administration',
		],
		'Environment & Ecology': [
			'Ecology',
			'Conservation',
			'Reforestation',
			'Wildlife Management',
			'Water Management',
			'Waste Management & Recycling',
			'Renewable Energy Systems',
			'Environmental Monitoring',
			'Environmental Education',
		],
		Engineering: [
			'Civil Engineering',
			'Mechanical Engineering',
			'Electrical Engineering',
			'Chemical Engineering',
			'Structural Engineering',
			'Environmental Engineering',
			'Surveying & Geomatics',
			'Hydraulic Engineering',
			'Materials Science',
			'Quality Assurance & Inspection',
		],
	}

	const expertiseParentNodes: Record<string, { id: number }> = {}
	for (const category of Object.keys(expertiseCategories)) {
		const node = await createTreeNode(prisma.expertiseNode, {
			title: category,
			description: '',
			isActive: true,
		})
		expertiseParentNodes[category] = { id: node.id }
	}

	let childIndex = 0
	await prisma.expertiseNode.createMany({
		data: Object.entries(expertiseCategories).flatMap(([category, areas]) =>
			areas.map(title => ({
				title,
				description: '',
				isActive: true,
				parentId: expertiseParentNodes[category].id,
				path: `__placeholder_${childIndex++}__`, // unique placeholder — fixed below
				depth: 1,
				numchild: 0,
			})),
		),
	})

	// Fix child paths: parentPath/childId (single UPDATE statement)
	await prisma.$executeRaw`
		UPDATE "ExpertiseNode" child
		SET path = parent.path || '/' || child.id
		FROM "ExpertiseNode" parent
		WHERE child."parentId" = parent.id
		  AND child.path LIKE '__placeholder_%'
	`

	// Fix parent numchild counts (single UPDATE statement)
	await prisma.$executeRaw`
		UPDATE "ExpertiseNode" parent
		SET numchild = (SELECT COUNT(*) FROM "ExpertiseNode" child WHERE child."parentId" = parent.id)
		WHERE parent."parentId" IS NULL
	`

	// Helper to look up expertise node IDs by title
	const expertiseByTitle = async (title: string) => {
		const node = await prisma.expertiseNode.findFirst({ where: { title } })
		if (!node) throw new Error(`Expertise "${title}" not found`)
		return node
	}

	const expertiseBuildingMaking = expertiseParentNodes['Building & Making']
	const expertiseHealthCare = expertiseParentNodes['Health & Care']
	const expertiseEnvironmentEcology =
		expertiseParentNodes['Environment & Ecology']
	const expertiseEngineering = expertiseParentNodes['Engineering']
	const expertiseHydraulicEngineering = await expertiseByTitle('Hydraulic Engineering')
	const expertiseWaterManagement = await expertiseByTitle('Water Management')

	console.log('Creating expertise nodes...')

	const adminUser = await prisma.user.upsert({
		where: { username: 'admin_user' },
		update: { password: hashedPassword },
		create: {
			username: 'admin_user',
			email: 'admin@example.com',
			password: hashedPassword,
			firstname: 'Admin',
			lastname: 'User',
			isActive: true,
			isVerified: true,
			role: 'admin',
			communityId: city1.id,
			countryId: countryB.id,
			expertise: {
				connect: [
					{ id: expertiseBuildingMaking.id },
					{ id: expertiseEnvironmentEcology.id },
					{ id: expertiseEngineering.id },
					{ id: expertiseHydraulicEngineering.id },
				],
			},
		},
	})

	const regularUser = await prisma.user.upsert({
		where: { username: 'regular_user' },
		update: { password: hashedPassword },
		create: {
			username: 'regular_user',
			email: 'user@example.com',
			password: hashedPassword,
			firstname: 'Regular',
			lastname: 'User',
			isActive: true,
			communityId: city2.id,
			countryId: countryA.id,
			expertise: {
				connect: [{ id: expertiseHealthCare.id }],
			},
		},
	})

	console.log('Creating users...')

	// --- Single request: reliable water supply for dry season ---

	const waterRequest = await prisma.request.create({
		data: {
			title: 'A reliable water supply for the dry season',
			description:
				'The community needs a dependable water supply that lasts through the annual dry season (roughly 4-6 months). Current sources become unreliable or dry up entirely, forcing residents to ration water. Any solution must be affordable, maintainable by the community, and provide enough clean water for drinking, cooking, and basic hygiene.',
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

	console.log('Creating requests...')

	// --- RequestNode tree ---

	const rnTreatment = await createTreeNode(prisma.requestNode, {
		title: 'Treatment method',
		description: 'How water is made safe to drink.',
		isActive: true,
		isVariantsGroup: false,
		isNonNegotiable: false,
		request: { connect: { id: waterRequest.id } },
		owner: { connect: { id: adminUser.id } },
		position: 1,
	})

	const rnNaturalFiltration = await createTreeNode(prisma.requestNode, {
		title: 'Natural filtration only',
		description: 'Sand, gravel, or bio-sand — no chemicals or electricity.',
		isActive: true,
		isVariantsGroup: false,
		isNonNegotiable: false,
		parentId: rnTreatment.id,
		request: { connect: { id: waterRequest.id } },
		owner: { connect: { id: regularUser.id } },
		position: 1,
	})

	const rnNoChlorine = await createTreeNode(prisma.requestNode, {
		title: 'No chlorine required',
		description: 'Avoid chlorine dosing entirely.',
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
		description: 'Where the water comes from.',
		isActive: true,
		isVariantsGroup: false,
		isNonNegotiable: false,
		request: { connect: { id: waterRequest.id } },
		owner: { connect: { id: regularUser.id } },
		position: 2,
	})

	const rnRainFed = await createTreeNode(prisma.requestNode, {
		title: 'Rain-fed with storage',
		description: 'Capture rainfall during wet months for dry-season use.',
		isActive: true,
		isVariantsGroup: false,
		isNonNegotiable: false,
		parentId: rnSource.id,
		request: { connect: { id: waterRequest.id } },
		owner: { connect: { id: regularUser.id } },
		position: 1,
	})

	const rnBorehole = await createTreeNode(prisma.requestNode, {
		title: 'Groundwater via borehole',
		description: 'Independent of rainfall but requires drilling and a pump.',
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
		description: 'How the system is built and repaired.',
		isActive: true,
		isVariantsGroup: false,
		isNonNegotiable: false,
		request: { connect: { id: waterRequest.id } },
		owner: { connect: { id: adminUser.id } },
		position: 3,
	})

	const rnBuildableByHand = await createTreeNode(prisma.requestNode, {
		title: 'Buildable by hand',
		description: 'Shovels, sand, and cement — no heavy machinery.',
		isActive: true,
		isVariantsGroup: false,
		isNonNegotiable: false,
		parentId: rnBuild.id,
		request: { connect: { id: waterRequest.id } },
		owner: { connect: { id: regularUser.id } },
		position: 1,
	})

	const rnNoDrilling = await createTreeNode(prisma.requestNode, {
		title: 'No drilling required',
		description: 'Avoid hiring drilling rigs or heavy machinery.',
		isActive: true,
		isVariantsGroup: false,
		isNonNegotiable: false,
		parentId: rnBuild.id,
		request: { connect: { id: waterRequest.id } },
		owner: { connect: { id: adminUser.id } },
		position: 2,
	})

	console.log('Creating request nodes...')

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

	console.log('Creating tags...')

	// --- Expertise assignments ---

	await prisma.requestNode.update({
		where: { id: rnNaturalFiltration.id },
		data: { expertise: { connect: { id: expertiseWaterManagement.id } } },
	})

	await prisma.requestNode.update({
		where: { id: rnNoChlorine.id },
		data: { expertise: { connect: { id: expertiseWaterManagement.id } } },
	})

	await prisma.requestNode.update({
		where: { id: rnRainFed.id },
		data: { expertise: { connect: { id: expertiseWaterManagement.id } } },
	})

	await prisma.requestNode.update({
		where: { id: rnBuildableByHand.id },
		data: { expertise: { connect: { id: expertiseHydraulicEngineering.id } } },
	})

	await prisma.requestNode.update({
		where: { id: rnNoDrilling.id },
		data: { expertise: { connect: { id: expertiseHydraulicEngineering.id } } },
	})

	console.log('Creating expertise assignments...')

	// --- Proposals ---

	const proposal1 = await prisma.proposal.create({
		data: {
			title: 'Rainwater Cistern System',
			description:
				'Install rooftop gutters on community buildings leading to a cluster of sealed ferro-cement cisterns (total ~50 m³). Water passes through a gravel pre-filter before storage and a bio-sand filter at the point-of-use tap. A gravity-fed pipe runs from the cisterns to a central tap stand. A water committee oversees minor repairs and collects monthly fees for replacement sand and gutter patching.',
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
			description:
				'Drill a borehole to the water table (~30 m) and install an India Mark II hand pump. The pump is located centrally so no household is more than 500 m away. Water is chlorinated monthly by a trained community health volunteer. Maintenance relies on a community committee trained in basic pump repair, with a spare-parts fund built from household contributions.',
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
			description:
				"Excavate contour swales across the community's slopes to slow runoff and recharge the water table. A lined retention pond (~200 m³) captures peak flow and stores it through the early dry season. Water is distributed by gravity pipe to a central tap. No mechanical parts; maintenance is mainly clearing swales of debris each season. Lowest cost but also lowest water quality—requires a separate filtration step.",
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

	console.log('Creating proposals...')

	// --- Seed feedback so proposals appear with ratings ---

	const allRequestNodes = await prisma.requestNode.findMany({
		where: { requestId: waterRequest.id },
	})

	const feedbackRatings: Record<string, Record<string, number>> = {
		[proposal1.title]: {
			'Treatment method': 2,
			'Natural filtration only': 3,
			'No chlorine required': 3,
			'Water source': 2,
			'Rain-fed with storage': 3,
			'Groundwater via borehole': -2,
			Construction: 2,
			'Buildable by hand': 3,
			'No drilling required': 3,
		},
		[proposal2.title]: {
			'Treatment method': 1,
			'Natural filtration only': -3,
			'No chlorine required': -3,
			'Water source': 2,
			'Rain-fed with storage': -3,
			'Groundwater via borehole': 3,
			Construction: 1,
			'Buildable by hand': -1,
			'No drilling required': -3,
		},
		[proposal3.title]: {
			'Treatment method': -1,
			'Natural filtration only': -2,
			'No chlorine required': 3,
			'Water source': 1,
			'Rain-fed with storage': 2,
			'Groundwater via borehole': -1,
			Construction: 3,
			'Buildable by hand': 2,
			'No drilling required': 3,
		},
	}

	const adminFeedbackRatings: Record<string, number> = {
		'Treatment method': 2,
		'Natural filtration only': 1,
		'No chlorine required': 2,
		'Water source': 1,
		'Rain-fed with storage': 2,
		'Groundwater via borehole': -1,
		Construction: 2,
		'Buildable by hand': 1,
		'No drilling required': 2,
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

	console.log('Creating feedbacks...')
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
