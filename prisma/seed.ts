import prisma from '../lib/prisma'
import bcrypt from 'bcrypt'
import { createTreeNode } from '../lib/tree'

async function main() {
	console.log('Starting seed...')

	const hashedPassword = await bcrypt.hash('test', 10)

	const tables = await prisma.$queryRaw<{ tablename: string }[]>`
		SELECT tablename FROM pg_tables
		WHERE schemaname = 'public'
		  AND tablename != '_prisma_migrations'
		  AND tablename NOT IN ('spatial_ref_sys')
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

	const community1 = await prisma.community.create({
		data: {
			title: 'Terravita',
			description: 'Terravita ecovillage',
			country: { connect: { id: countryA.id } },
			address: 'Harbor City, Country A',
			longitude: -122.4194,
			latitude: 37.7749,
			isActive: true,
		},
	})

	const community2 = await prisma.community.create({
		data: {
			title: 'Thalassia',
			description: 'City of Thalassia',
			country: { connect: { id: countryB.id } },
			address: 'Thalassia, Country B',
			longitude: -79.3832,
			latitude: 43.6532,
			isActive: true,
		},
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
	const expertiseHydraulicEngineering = await expertiseByTitle(
		'Hydraulic Engineering',
	)
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
			communityId: community1.id,
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
			communityId: community2.id,
			countryId: countryA.id,
			expertise: {
				connect: [{ id: expertiseHealthCare.id }],
			},
		},
	})

	const anotherUser = await prisma.user.upsert({
		where: { username: 'another_user' },
		update: { password: hashedPassword },
		create: {
			username: 'another_user',
			email: 'another@example.com',
			password: hashedPassword,
			firstname: 'Another',
			lastname: 'User',
			isActive: true,
			communityId: community1.id,
			countryId: countryA.id,
			expertise: {
				connect: [{ id: expertiseEnvironmentEcology.id }],
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
			measurementType: 'None',
			isJoinable: true,
			totalPriority: 12,
			ownerId: adminUser.id,
			communityId: community1.id,
			countryId: countryA.id,
			userRequests: {
				create: [
					{
						userId: adminUser.id,
						priority: 5,
						recurrencePeriod: 365,
						isBasicNeed: true,
						isJoined: true,
					},
					{
						userId: regularUser.id,
						priority: 3,
						recurrencePeriod: 365,
						isJoined: true,
					},
					{
						userId: anotherUser.id,
						priority: 4,
						recurrencePeriod: 365,
						isJoined: true,
					},
				],
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
			duration: 45,
			priority: 1,
			riskFactor: 15,
			owner: { connect: { id: adminUser.id } },
			request: { connect: { id: waterRequest.id } },
		},
	})

	const proposal2 = await prisma.proposal.create({
		data: {
			title: 'Communal Well with Electric Pump',
			description:
				'Drill a borehole to the water table (~30 m) and install an Seakoo Mark II electric pump. The pump is located centrally so no household is more than 500 m away. Water is chlorinated monthly by a trained community health volunteer. Maintenance relies on a community committee trained in basic pump repair, with a spare-parts fund built from household contributions.',
			isComplete: true,
			duration: 30,
			priority: 2,
			riskFactor: 25,
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
			duration: 60,
			priority: 3,
			riskFactor: 35,
			owner: { connect: { id: adminUser.id } },
			request: { connect: { id: waterRequest.id } },
		},
	})

	console.log('Creating proposals...')

	// --- Resources: the main material and human (labor) inputs used across
	// the three proposals. Step nodes and their step costs are added in a
	// later phase; here we just populate the resource catalog. ---

	await prisma.resource.createMany({
		data: [
			{
				title: 'Portland Cement',
				description:
					'General-purpose Portland cement used for ferro-cement cisterns, mortar and concrete works.',
				measurementType: 'Weight',
				quantityAvailable: 4000,
				monthlyCapacity: 2000,
				shelfLife: 365,
				minQuantity: 500,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Filter Sand',
				description:
					'Washed graded sand for bio-sand filters, mortar mixing and concrete.',
				measurementType: 'Volume',
				quantityAvailable: 20,
				monthlyCapacity: 10,
				shelfLife: null,
				minQuantity: 2,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Gravel & Crushed Stone',
				description:
					'Coarse aggregate for gravel pre-filters, drainage layers and concrete.',
				measurementType: 'Volume',
				quantityAvailable: 15,
				monthlyCapacity: 10,
				shelfLife: null,
				minQuantity: 2,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Galvanized Wire Mesh',
				description:
					'Reinforcing wire mesh for ferro-cement cistern and tank construction.',
				measurementType: 'Area',
				quantityAvailable: 300,
				monthlyCapacity: 100,
				shelfLife: null,
				minQuantity: 50,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'PVC Pipe & Fittings',
				description:
					'PVC pipes, joints and fittings for gravity-fed distribution lines.',
				measurementType: 'Length',
				quantityAvailable: 1500,
				monthlyCapacity: 500,
				shelfLife: 3650,
				minQuantity: 100,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Roof Gutter & Downpipe',
				description:
					'Roof gutters and downpipes that channel rainfall into storage cisterns.',
				measurementType: 'Length',
				quantityAvailable: 400,
				monthlyCapacity: 200,
				shelfLife: 3650,
				minQuantity: 50,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Storage Cistern',
				description:
					'Sealed ferro-cement storage cistern unit for rainwater retention.',
				measurementType: 'Units',
				quantityAvailable: 6,
				monthlyCapacity: 2,
				shelfLife: 3650,
				minQuantity: 1,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Seakoo Mark II Electric Pump',
				description:
					'Community electric pump for borehole extraction, the standard for rural water points.',
				measurementType: 'Units',
				quantityAvailable: 3,
				monthlyCapacity: 1,
				shelfLife: 3650,
				minQuantity: 1,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'HDPE Pond Liner',
				description:
					'High-density polyethylene liner that seals retention ponds against seepage.',
				measurementType: 'Area',
				quantityAvailable: 600,
				monthlyCapacity: 200,
				shelfLife: 3650,
				minQuantity: 100,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Sodium Hypochlorite',
				description:
					'Chlorine solution for monthly disinfection of well and borehole water.',
				measurementType: 'Weight',
				quantityAvailable: 50,
				monthlyCapacity: 20,
				shelfLife: 90,
				minQuantity: 5,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Tap Stand & Fixtures',
				description:
					'Central tap stand with valves and fittings for community distribution points.',
				measurementType: 'Units',
				quantityAvailable: 10,
				monthlyCapacity: 5,
				shelfLife: 3650,
				minQuantity: 2,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Diesel Fuel',
				description:
					'Diesel to run the borehole drilling rig and backup pumping equipment.',
				measurementType: 'Volume',
				quantityAvailable: 1,
				monthlyCapacity: 0.5,
				shelfLife: 180,
				minQuantity: 0.1,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Excavation Labor',
				description:
					'Manual and assisted digging labor for swales, trenches and foundations.',
				measurementType: 'Time',
				quantityAvailable: 0,
				monthlyCapacity: 800,
				shelfLife: null,
				minQuantity: 0,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Masonry & Construction Labor',
				description:
					'Skilled masonry labor for building cisterns, pump pads and tap stands.',
				measurementType: 'Time',
				quantityAvailable: 0,
				monthlyCapacity: 400,
				shelfLife: null,
				minQuantity: 0,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Plumbing Labor',
				description:
					'Plumbing labor for laying pipes, fitting pumps and installing tap stands.',
				measurementType: 'Time',
				quantityAvailable: 0,
				monthlyCapacity: 200,
				shelfLife: null,
				minQuantity: 0,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Borehole Drilling Service',
				description: 'Drilling-rig service time to reach the water table.',
				measurementType: 'Time',
				quantityAvailable: 0,
				monthlyCapacity: 60,
				shelfLife: null,
				minQuantity: 0,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Surveying & Engineering',
				description: 'Site survey, contour mapping and design work.',
				measurementType: 'Time',
				quantityAvailable: 0,
				monthlyCapacity: 120,
				shelfLife: null,
				minQuantity: 0,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Community Training & Coordination',
				description:
					'Volunteer coordination, pump-repair training and committee management.',
				measurementType: 'Time',
				quantityAvailable: 0,
				monthlyCapacity: 150,
				shelfLife: null,
				minQuantity: 0,
				reservedQuantity: 0,
				isActive: true,
				ownerId: adminUser.id,
			},
		],
	})

	console.log('Creating resources...')

	// --- Community stock: localize a few key resources to the seeded
	// communities so the CommunityResource page has data. ---

	const resourceRecords = await prisma.resource.findMany({
		select: { id: true, title: true },
	})
	const resourceByTitle = Object.fromEntries(
		resourceRecords.map(r => [r.title, r.id]),
	)

	const cr = (
		title: string,
		communityId: number,
		quantity: number,
		monthlyCapacity: number,
		minQuantity: number,
		reservedQuantity: number,
		monetaryValuePerUnit: number,
	) => ({
		resourceId: resourceByTitle[title],
		communityId,
		quantity,
		monthlyCapacity,
		minQuantity,
		reservedQuantity,
		monetaryValuePerUnit,
		isActive: true,
	})

	await prisma.communityResource.createMany({
		data: [
			cr('Portland Cement', community1.id, 2000, 2000, 500, 0, 0.3),
			cr('Filter Sand', community1.id, 12, 10, 2, 0, 25),
			cr('Storage Cistern', community1.id, 4, 2, 1, 1, 800),
			cr('PVC Pipe & Fittings', community1.id, 800, 500, 100, 0, 2),
			cr('Roof Gutter & Downpipe', community1.id, 200, 200, 50, 0, 4),
			cr('HDPE Pond Liner', community1.id, 400, 200, 100, 0, 5),
			cr('Excavation Labor', community1.id, 0, 800, 0, 0, 15),
			cr('Masonry & Construction Labor', community1.id, 0, 400, 0, 0, 22),
			cr('Seakoo Mark II Electric Pump', community2.id, 2, 1, 1, 0, 1200),
			cr('Sodium Hypochlorite', community2.id, 30, 20, 5, 0, 2),
			cr('Borehole Drilling Service', community2.id, 0, 60, 0, 0, 120),
			cr('Community Training & Coordination', community2.id, 0, 150, 0, 0, 18),
		],
	})

	console.log('Creating community resources...')

	// --- Step nodes & step costs: give each proposal a handful of steps
	// (which can run in parallel, so positions only need to be unique per
	// proposal rather than representing a strict sequence) and the
	// community resources each step consumes. ---

	const communityResourceRecords = await prisma.communityResource.findMany({
		select: { id: true, resource: { select: { title: true } } },
	})
	const crId = (title: string) => {
		const cr = communityResourceRecords.find(r => r.resource.title === title)
		if (!cr) throw new Error(`Community resource "${title}" not found`)
		return cr.id
	}

	const consumedAt = new Date()

	type StepCostSeed = {
		title: string
		description: string
		resourceTitle: string
		measurementType: string
		quantity: number
		quantityMargin: number
		monetaryValue: number
	}
	type StepSeed = {
		title: string
		description: string
		position: number
		duration: number
		riskFactor: number
		costs: StepCostSeed[]
	}

	async function createSteps(
		proposalId: number,
		ownerId: string,
		steps: StepSeed[],
	) {
		await Promise.all(
			steps.map(step =>
				prisma.stepNode.create({
					data: {
						title: step.title,
						description: step.description,
						position: step.position,
						duration: step.duration,
						durationVariance: Math.round(step.duration * 0.15),
						riskFactor: step.riskFactor,
						ownerId,
						proposalId,
						costs: {
							create: step.costs.map(c => ({
								title: c.title,
								description: c.description,
								measurementType: c.measurementType as never,
								quantity: c.quantity,
								quantityMargin: c.quantityMargin,
								monetaryValue: c.monetaryValue,
								consumedAt,
								ownerId,
								communityResourceId: crId(c.resourceTitle),
							})),
						},
					},
				}),
			),
		)
	}

	await createSteps(proposal1.id, adminUser.id, [
		{
			title: 'Install Rooftop Gutters',
			description:
				'Mount gutters and downpipes on community rooftops to channel rainfall toward the cisterns.',
			position: 1,
			duration: 10,
			riskFactor: 10,
			costs: [
				{
					title: 'Gutter Material Run',
					description: 'Roof gutter and downpipe length installed.',
					resourceTitle: 'Roof Gutter & Downpipe',
					measurementType: 'Length',
					quantity: 220,
					quantityMargin: 22,
					monetaryValue: 880,
				},
				{
					title: 'Gutter Fitting Labor',
					description: 'Labor to fit gutters and downpipes.',
					resourceTitle: 'Masonry & Construction Labor',
					measurementType: 'Time',
					quantity: 90,
					quantityMargin: 10,
					monetaryValue: 1980,
				},
			],
		},
		{
			title: 'Build Ferro-Cement Cisterns',
			description:
				'Construct sealed ferro-cement cisterns sized for dry-season storage.',
			position: 2,
			duration: 20,
			riskFactor: 20,
			costs: [
				{
					title: 'Cistern Cement Supply',
					description: 'Portland cement for the cistern shells.',
					resourceTitle: 'Portland Cement',
					measurementType: 'Weight',
					quantity: 3000,
					quantityMargin: 300,
					monetaryValue: 900,
				},
				{
					title: 'Cistern Vessel Units',
					description: 'Pre-cast storage cistern units.',
					resourceTitle: 'Storage Cistern',
					measurementType: 'Units',
					quantity: 3,
					quantityMargin: 0,
					monetaryValue: 2400,
				},
				{
					title: 'Cistern Masonry Labor',
					description: 'Skilled masonry labor for cistern construction.',
					resourceTitle: 'Masonry & Construction Labor',
					measurementType: 'Time',
					quantity: 420,
					quantityMargin: 40,
					monetaryValue: 9240,
				},
			],
		},
		{
			title: 'Install Bio-Sand Filter',
			description:
				'Build the gravel pre-filter and bio-sand filter at the point-of-use tap.',
			position: 3,
			duration: 8,
			riskFactor: 15,
			costs: [
				{
					title: 'Filter Sand Charge',
					description: 'Washed graded sand for the bio-sand filter.',
					resourceTitle: 'Filter Sand',
					measurementType: 'Volume',
					quantity: 4,
					quantityMargin: 0.5,
					monetaryValue: 100,
				},
			],
		},
		{
			title: 'Lay Gravity Distribution Pipe',
			description:
				'Run a gravity-fed pipe from the cisterns to the central tap stand.',
			position: 4,
			duration: 7,
			riskFactor: 10,
			costs: [
				{
					title: 'Distribution PVC Run',
					description: 'PVC pipe and fittings for the gravity line.',
					resourceTitle: 'PVC Pipe & Fittings',
					measurementType: 'Length',
					quantity: 300,
					quantityMargin: 30,
					monetaryValue: 600,
				},
				{
					title: 'Pipe Laying Labor',
					description: 'Labor to lay and connect the distribution pipe.',
					resourceTitle: 'Masonry & Construction Labor',
					measurementType: 'Time',
					quantity: 60,
					quantityMargin: 6,
					monetaryValue: 1320,
				},
			],
		},
	])

	await createSteps(proposal2.id, regularUser.id, [
		{
			title: 'Drill Borehole',
			description:
				'Drill a borehole down to the water table for groundwater access.',
			position: 1,
			duration: 12,
			riskFactor: 25,
			costs: [
				{
					title: 'Borehole Drilling Rig Time',
					description: 'Rig-hours to reach the water table.',
					resourceTitle: 'Borehole Drilling Service',
					measurementType: 'Time',
					quantity: 40,
					quantityMargin: 4,
					monetaryValue: 4800,
				},
			],
		},
		{
			title: 'Install Electric Pump',
			description:
				'Install the Seakoo Mark II pump centrally and cast its support pad.',
			position: 2,
			duration: 10,
			riskFactor: 20,
			costs: [
				{
					title: 'Electric Pump Unit',
					description: 'Community electric pump unit.',
					resourceTitle: 'Seakoo Mark II Electric Pump',
					measurementType: 'Units',
					quantity: 1,
					quantityMargin: 0,
					monetaryValue: 1200,
				},
				{
					title: 'Pump Pad Masonry Labor',
					description: 'Masonry labor for the pump pad and housing.',
					resourceTitle: 'Masonry & Construction Labor',
					measurementType: 'Time',
					quantity: 50,
					quantityMargin: 5,
					monetaryValue: 1100,
				},
			],
		},
		{
			title: 'Set Up Chlorination & Committee',
			description:
				'Train a health volunteer in monthly chlorination and form the maintenance committee.',
			position: 3,
			duration: 8,
			riskFactor: 15,
			costs: [
				{
					title: 'Annual Chlorine Supply',
					description: 'Sodium hypochlorite for monthly disinfection.',
					resourceTitle: 'Sodium Hypochlorite',
					measurementType: 'Weight',
					quantity: 10,
					quantityMargin: 1,
					monetaryValue: 20,
				},
				{
					title: 'Committee Training Hours',
					description: 'Coordination and pump-repair training hours.',
					resourceTitle: 'Community Training & Coordination',
					measurementType: 'Time',
					quantity: 60,
					quantityMargin: 6,
					monetaryValue: 1080,
				},
			],
		},
	])

	await createSteps(proposal3.id, adminUser.id, [
		{
			title: 'Mark Contour Swale Lines',
			description:
				'Survey the slopes and mark the contour lines for the swale network.',
			position: 1,
			duration: 4,
			riskFactor: 10,
			costs: [
				{
					title: 'Swale Layout Coordination',
					description: 'Volunteer coordination for contour layout.',
					resourceTitle: 'Community Training & Coordination',
					measurementType: 'Time',
					quantity: 30,
					quantityMargin: 3,
					monetaryValue: 540,
				},
			],
		},
		{
			title: 'Excavate Contour Swales',
			description:
				'Dig the contour swales by hand to slow and redirect runoff.',
			position: 2,
			duration: 18,
			riskFactor: 15,
			costs: [
				{
					title: 'Swale Excavation Labor',
					description: 'Manual excavation labor for the swales.',
					resourceTitle: 'Excavation Labor',
					measurementType: 'Time',
					quantity: 600,
					quantityMargin: 60,
					monetaryValue: 9000,
				},
			],
		},
		{
			title: 'Excavate Retention Pond',
			description: 'Excavate the lined retention pond to capture peak flow.',
			position: 3,
			duration: 16,
			riskFactor: 20,
			costs: [
				{
					title: 'Pond Excavation Labor',
					description: 'Manual excavation labor for the pond basin.',
					resourceTitle: 'Excavation Labor',
					measurementType: 'Time',
					quantity: 500,
					quantityMargin: 50,
					monetaryValue: 7500,
				},
			],
		},
		{
			title: 'Line Retention Pond',
			description: 'Seal the retention pond with an HDPE liner.',
			position: 4,
			duration: 8,
			riskFactor: 15,
			costs: [
				{
					title: 'Pond Liner Material',
					description: 'HDPE liner covering the pond surface.',
					resourceTitle: 'HDPE Pond Liner',
					measurementType: 'Area',
					quantity: 350,
					quantityMargin: 35,
					monetaryValue: 1750,
				},
				{
					title: 'Liner Installation Labor',
					description: 'Labor to lay and seam the pond liner.',
					resourceTitle: 'Masonry & Construction Labor',
					measurementType: 'Time',
					quantity: 80,
					quantityMargin: 8,
					monetaryValue: 1760,
				},
			],
		},
		{
			title: 'Connect Gravity Pipe to Tap',
			description:
				'Run a gravity pipe from the retention pond to the central tap stand.',
			position: 5,
			duration: 14,
			riskFactor: 10,
			costs: [
				{
					title: 'Swale Network PVC Run',
					description: 'PVC pipe and fittings for the gravity distribution.',
					resourceTitle: 'PVC Pipe & Fittings',
					measurementType: 'Length',
					quantity: 250,
					quantityMargin: 25,
					monetaryValue: 500,
				},
			],
		},
	])

	console.log('Creating step nodes & costs...')

	// --- Stock movements: illustrate additions, removals and consumption
	// against the seeded community stock. All rows are inserted in a single
	// batch, with quantityBefore/quantityAfter consistent with the running
	// balance. ---

	const stockCrRecords = await prisma.communityResource.findMany({
		select: {
			id: true,
			quantity: true,
			resource: { select: { title: true } },
		},
	})
	const stockCrByTitle = new Map(
		stockCrRecords.map(r => [r.resource.title, r]),
	)

	const stepCostRecords = await prisma.stepCost.findMany({
		select: { id: true, title: true },
	})
	const stepCostByTitle = new Map(
		stepCostRecords.map(sc => [sc.title, sc.id]),
	)

	const daysAgo = (days: number) => {
		const d = new Date()
		d.setDate(d.getDate() - days)
		d.setHours(9 + (days % 8), (days * 7) % 60, 0, 0)
		return d
	}

	const movementSpecs: {
		resourceTitle: string
		userId: string
		quantity: number
		reason: string | null
		createdAt: Date
		stepCostTitle?: string
	}[] = [
		{
			resourceTitle: 'Portland Cement',
			userId: adminUser.id,
			quantity: 1500,
			reason: 'Bulk cement delivery from the regional supplier',
			createdAt: daysAgo(20),
		},
		{
			resourceTitle: 'Filter Sand',
			userId: adminUser.id,
			quantity: 5,
			reason: 'Restock from the municipal quarry',
			createdAt: daysAgo(15),
		},
		{
			resourceTitle: 'Storage Cistern',
			userId: adminUser.id,
			quantity: -1,
			reason: 'Cistern cracked during unloading, written off',
			createdAt: daysAgo(12),
		},
		{
			resourceTitle: 'Portland Cement',
			userId: adminUser.id,
			quantity: -3000,
			reason: 'Drawn down for cistern masonry',
			createdAt: daysAgo(6),
			stepCostTitle: 'Cistern Cement Supply',
		},
		{
			resourceTitle: 'Filter Sand',
			userId: regularUser.id,
			quantity: -4,
			reason: 'Bio-sand filter charge',
			createdAt: daysAgo(4),
			stepCostTitle: 'Filter Sand Charge',
		},
		{
			resourceTitle: 'PVC Pipe & Fittings',
			userId: regularUser.id,
			quantity: -300,
			reason: 'Gravity distribution line installation',
			createdAt: daysAgo(2),
			stepCostTitle: 'Distribution PVC Run',
		},
		{
			resourceTitle: 'Seakoo Mark II Electric Pump',
			userId: regularUser.id,
			quantity: -1,
			reason: 'Installed at the communal borehole',
			createdAt: daysAgo(1),
			stepCostTitle: 'Electric Pump Unit',
		},
		{
			resourceTitle: 'Sodium Hypochlorite',
			userId: regularUser.id,
			quantity: -10,
			reason: 'Annual chlorination supply draw-down',
			createdAt: daysAgo(0),
			stepCostTitle: 'Annual Chlorine Supply',
		},
	]

	// Specs are in chronological order per resource, so the running balance
	// computed here yields correct before/after snapshots.
	const movementRows = movementSpecs.map(spec => {
		const entry = stockCrByTitle.get(spec.resourceTitle)
		if (!entry)
			throw new Error(
				`Community resource "${spec.resourceTitle}" not found`,
			)
		const quantityBefore = entry.quantity
		const quantityAfter = quantityBefore + spec.quantity
		entry.quantity = quantityAfter
		return {
			isActive: true,
			userId: spec.userId,
			communityResourceId: entry.id,
			stepCostId: spec.stepCostTitle
				? (stepCostByTitle.get(spec.stepCostTitle) ?? null)
				: null,
			quantity: spec.quantity,
			quantityBefore,
			quantityAfter,
			reason: spec.reason,
			createdAt: spec.createdAt,
		}
	})

	await prisma.stockMovement.createMany({ data: movementRows })

	// Sync the resulting balances back onto each touched community resource
	await Promise.all(
		[...new Set(movementSpecs.map(s => s.resourceTitle))].map(title => {
			const entry = stockCrByTitle.get(title)!
			return prisma.communityResource.update({
				where: { id: entry.id },
				data: { quantity: entry.quantity },
			})
		}),
	)

	console.log('Creating stock movements...')

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
	'No chlorine required': 0,
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
