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

	const country1 = await prisma.community.create({
		data: {
			title: 'Valley Region',
			description: 'Region in the northern region',
			country: { connect: { id: countryA.id } },
			address: 'Country A',
			longitude: -95.7129,
			latitude: 37.0902,
			isActive: true,
		},
	})

	const state1 = await prisma.community.create({
		data: {
			title: 'Arcadia',
			description: 'State of Arcadia',
			country: { connect: { id: countryA.id } },
			address: 'Arcadia, Country A',
			longitude: -119.4179,
			latitude: 36.7783,
			isActive: true,
		},
	})

	const city1 = await prisma.community.create({
		data: {
			title: 'Terravita',
			description: 'Terravita ecovillage',
			country: { connect: { id: countryA.id } },
			address: 'Harbor City, Arcadia, Country A',
			longitude: -122.4194,
			latitude: 37.7749,
			isActive: true,
		},
	})

	const country2 = await prisma.community.create({
		data: {
			title: 'Mountain Region',
			description: 'Region in the northern region',
			country: { connect: { id: countryB.id } },
			address: 'Country B',
			longitude: -106.3468,
			latitude: 56.1304,
			isActive: true,
		},
	})

	const state2 = await prisma.community.create({
		data: {
			title: 'Lake Province',
			description: 'Province of Lake Province',
			country: { connect: { id: countryB.id } },
			address: 'Lake Province, Country B',
			longitude: -79.3832,
			latitude: 43.6532,
			isActive: true,
		},
	})

	const city2 = await prisma.community.create({
		data: {
			title: 'Central City',
			description: 'City of Central City',
			country: { connect: { id: countryB.id } },
			address: 'Central City, Lake Province, Country B',
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
			communityId: city1.id,
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
			totalPriority: 7,
			ownerId: adminUser.id,
			communityId: city1.id,
			countryId: countryA.id,
			userRequests: {
				create: [
					{
						userId: adminUser.id,
						priority: 3,
						recurrencePeriod: 365,
						isBasicNeed: true,
						isJoined: true,
					},
					{
						userId: regularUser.id,
						priority: 2,
						recurrencePeriod: 365,
						isJoined: true,
					},
					{
						userId: anotherUser.id,
						priority: 2,
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
			title: 'Communal Well with Electric Pump',
			description:
				'Drill a borehole to the water table (~30 m) and install an Seakoo Mark II hand pump. The pump is located centrally so no household is more than 500 m away. Water is chlorinated monthly by a trained community health volunteer. Maintenance relies on a community committee trained in basic pump repair, with a spare-parts fund built from household contributions.',
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

	// --- Resources: the main material and human (labor) inputs used across
	// the three proposals. Step nodes and their step costs are added in a
	// later phase; here we just populate the resource catalog. ---

	// ResourceType is stored as Int: 0 = ServiceTime, 1 = Material, 2 = Digital
	const SERVICE_TIME = 0
	const MATERIAL = 1

	await prisma.resource.createMany({
		data: [
			{
				title: 'Portland Cement',
				description:
					'General-purpose Portland cement used for ferro-cement cisterns, mortar and concrete works.',
				type: MATERIAL,
				measurementType: 'Weight',
				quantityAvailable: 4000,
				monthlyCapacity: 2000,
				managedMonthlyCapacity: 2000,
				minQuantity: 500,
				reservedQuantity: 0,
				monetaryValue: 0.3,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Filter Sand',
				description:
					'Washed graded sand for bio-sand filters, mortar mixing and concrete.',
				type: MATERIAL,
				measurementType: 'Volume',
				quantityAvailable: 20,
				monthlyCapacity: 10,
				managedMonthlyCapacity: 10,
				minQuantity: 2,
				reservedQuantity: 0,
				monetaryValue: 25,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Gravel & Crushed Stone',
				description:
					'Coarse aggregate for gravel pre-filters, drainage layers and concrete.',
				type: MATERIAL,
				measurementType: 'Volume',
				quantityAvailable: 15,
				monthlyCapacity: 10,
				managedMonthlyCapacity: 10,
				minQuantity: 2,
				reservedQuantity: 0,
				monetaryValue: 20,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Galvanized Wire Mesh',
				description:
					'Reinforcing wire mesh for ferro-cement cistern and tank construction.',
				type: MATERIAL,
				measurementType: 'Area',
				quantityAvailable: 300,
				monthlyCapacity: 100,
				managedMonthlyCapacity: 100,
				minQuantity: 50,
				reservedQuantity: 0,
				monetaryValue: 3.5,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'PVC Pipe & Fittings',
				description:
					'PVC pipes, joints and fittings for gravity-fed distribution lines.',
				type: MATERIAL,
				measurementType: 'Length',
				quantityAvailable: 1500,
				monthlyCapacity: 500,
				managedMonthlyCapacity: 500,
				minQuantity: 100,
				reservedQuantity: 0,
				monetaryValue: 2,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Roof Gutter & Downpipe',
				description:
					'Roof gutters and downpipes that channel rainfall into storage cisterns.',
				type: MATERIAL,
				measurementType: 'Length',
				quantityAvailable: 400,
				monthlyCapacity: 200,
				managedMonthlyCapacity: 200,
				minQuantity: 50,
				reservedQuantity: 0,
				monetaryValue: 4,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Storage Cistern',
				description:
					'Sealed ferro-cement storage cistern unit for rainwater retention.',
				type: MATERIAL,
				measurementType: 'Units',
				quantityAvailable: 6,
				monthlyCapacity: 2,
				managedMonthlyCapacity: 2,
				minQuantity: 1,
				reservedQuantity: 0,
				monetaryValue: 800,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Seakoo Mark II Hand Pump',
				description:
					'Community hand pump for borehole extraction, the standard for rural water points.',
				type: MATERIAL,
				measurementType: 'Units',
				quantityAvailable: 3,
				monthlyCapacity: 1,
				managedMonthlyCapacity: 1,
				minQuantity: 1,
				reservedQuantity: 0,
				monetaryValue: 1200,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'HDPE Pond Liner',
				description:
					'High-density polyethylene liner that seals retention ponds against seepage.',
				type: MATERIAL,
				measurementType: 'Area',
				quantityAvailable: 600,
				monthlyCapacity: 200,
				managedMonthlyCapacity: 200,
				minQuantity: 100,
				reservedQuantity: 0,
				monetaryValue: 5,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Sodium Hypochlorite',
				description:
					'Chlorine solution for monthly disinfection of well and borehole water.',
				type: MATERIAL,
				measurementType: 'Weight',
				quantityAvailable: 50,
				monthlyCapacity: 20,
				managedMonthlyCapacity: 20,
				minQuantity: 5,
				reservedQuantity: 0,
				monetaryValue: 2,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Tap Stand & Fixtures',
				description:
					'Central tap stand with valves and fittings for community distribution points.',
				type: MATERIAL,
				measurementType: 'Units',
				quantityAvailable: 10,
				monthlyCapacity: 5,
				managedMonthlyCapacity: 5,
				minQuantity: 2,
				reservedQuantity: 0,
				monetaryValue: 90,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Diesel Fuel',
				description:
					'Diesel to run the borehole drilling rig and backup pumping equipment.',
				type: MATERIAL,
				measurementType: 'Volume',
				quantityAvailable: 1,
				monthlyCapacity: 0.5,
				managedMonthlyCapacity: 0.5,
				minQuantity: 0.1,
				reservedQuantity: 0,
				monetaryValue: 1200,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Excavation Labor',
				description:
					'Manual and assisted digging labor for swales, trenches and foundations. Measured in man-hours.',
				type: SERVICE_TIME,
				measurementType: 'Time',
				quantityAvailable: 0,
				monthlyCapacity: 800,
				managedMonthlyCapacity: 600,
				minQuantity: 0,
				reservedQuantity: 0,
				monetaryValue: 15,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Masonry & Construction Labor',
				description:
					'Skilled masonry labor for building cisterns, pump pads and tap stands. Measured in man-hours.',
				type: SERVICE_TIME,
				measurementType: 'Time',
				quantityAvailable: 0,
				monthlyCapacity: 400,
				managedMonthlyCapacity: 300,
				minQuantity: 0,
				reservedQuantity: 0,
				monetaryValue: 22,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Plumbing Labor',
				description:
					'Plumbing labor for laying pipes, fitting pumps and installing tap stands. Measured in man-hours.',
				type: SERVICE_TIME,
				measurementType: 'Time',
				quantityAvailable: 0,
				monthlyCapacity: 200,
				managedMonthlyCapacity: 150,
				minQuantity: 0,
				reservedQuantity: 0,
				monetaryValue: 25,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Borehole Drilling Service',
				description:
					'Drilling-rig service time to reach the water table. Measured in rig-hours.',
				type: SERVICE_TIME,
				measurementType: 'Time',
				quantityAvailable: 0,
				monthlyCapacity: 60,
				managedMonthlyCapacity: 40,
				minQuantity: 0,
				reservedQuantity: 0,
				monetaryValue: 120,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Surveying & Engineering',
				description:
					'Site survey, contour mapping and design work. Measured in man-hours.',
				type: SERVICE_TIME,
				measurementType: 'Time',
				quantityAvailable: 0,
				monthlyCapacity: 120,
				managedMonthlyCapacity: 80,
				minQuantity: 0,
				reservedQuantity: 0,
				monetaryValue: 40,
				isActive: true,
				ownerId: adminUser.id,
			},
			{
				title: 'Community Training & Coordination',
				description:
					'Volunteer coordination, pump-repair training and committee management. Measured in man-hours.',
				type: SERVICE_TIME,
				measurementType: 'Time',
				quantityAvailable: 0,
				monthlyCapacity: 150,
				managedMonthlyCapacity: 100,
				minQuantity: 0,
				reservedQuantity: 0,
				monetaryValue: 18,
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
		managedMonthlyCapacity: number,
		minQuantity: number,
		reservedQuantity: number,
		monetaryValuePerUnit: number,
	) => ({
		resourceId: resourceByTitle[title],
		communityId,
		quantity,
		monthlyCapacity,
		managedMonthlyCapacity,
		minQuantity,
		reservedQuantity,
		monetaryValuePerUnit,
		isActive: true,
	})

	await prisma.communityResource.createMany({
		data: [
			cr('Portland Cement', city1.id, 2000, 2000, 2000, 500, 0, 0.3),
			cr('Filter Sand', city1.id, 12, 10, 10, 2, 0, 25),
			cr('Storage Cistern', city1.id, 4, 2, 2, 1, 1, 800),
			cr('PVC Pipe & Fittings', city1.id, 800, 500, 500, 100, 0, 2),
			cr('Roof Gutter & Downpipe', city1.id, 200, 200, 200, 50, 0, 4),
			cr('HDPE Pond Liner', city1.id, 400, 200, 200, 100, 0, 5),
			cr('Excavation Labor', city1.id, 0, 800, 600, 0, 0, 15),
			cr('Masonry & Construction Labor', city1.id, 0, 400, 300, 0, 0, 22),
			cr('Seakoo Mark II Hand Pump', city2.id, 2, 1, 1, 1, 0, 1200),
			cr('Sodium Hypochlorite', city2.id, 30, 20, 20, 5, 0, 2),
			cr('Borehole Drilling Service', city2.id, 0, 60, 40, 0, 0, 120),
			cr('Community Training & Coordination', city2.id, 0, 150, 100, 0, 0, 18),
		],
	})

	console.log('Creating community resources...')

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
