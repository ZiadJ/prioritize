import prisma from '../lib/prisma'
import bcrypt from 'bcrypt'
import { createTreeNode } from '../lib/tree'

async function main() {
	console.log('Starting seed...')

	// Delete existing data in correct order to avoid foreign key constraint violations
	await prisma.feedback.deleteMany()
	await prisma.revisionNode.deleteMany()
	await prisma.order.deleteMany()
	await prisma.request.deleteMany()
	await prisma.requestNode.deleteMany()
	await prisma.proposal.deleteMany()
	await prisma.stepNode.deleteMany()
	await prisma.stepCost.deleteMany()
	await prisma.effect.deleteMany()
	await prisma.effector.deleteMany()
	await prisma.resourceNode.deleteMany()
	await prisma.expertiseNode.deleteMany()
	await prisma.communityNode.deleteMany()
	await prisma.user.deleteMany()
	await prisma.tag.deleteMany()
	await prisma.country.deleteMany()
	// await prisma.token.deleteMany()

	const hashedPassword = await bcrypt.hash('aaa', 10)

	// Create countries
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

	// Create community nodes using tree utility
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

	// Create users
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

	// Create requests with orders in one go
	const request1 = await prisma.request.create({
		data: {
			title: 'Food Assistance Needed',
			body: 'Need help with groceries for the week',
			unitOfMeasure: 'Units',
			ownerId: adminUser.id,
			communityId: city1.id,
			countryId: countryB.id,
			orders: {
				create: {
					userId: adminUser.id,
					quantity: 1,
					priority: 50.0,
					recurrencePeriod: 7,
					isBasicNeed: true,
				},
			},
		},
	})

	const request2 = await prisma.request.create({
		data: {
			title: 'Housing Support',
			body: 'Looking for temporary housing assistance',
			unitOfMeasure: 'Units',
			ownerId: regularUser.id,
			communityId: city1.id,
			countryId: countryB.id,
			orders: {
				create: {
					userId: regularUser.id,
					quantity: 1,
					priority: 150.0,
					recurrencePeriod: 30,
					isBasicNeed: true,
				},
			},
		},
	})

	const request3 = await prisma.request.create({
		data: {
			title: 'Community Event Planning',
			body: 'Help organize a community cleanup event',
			unitOfMeasure: 'Units',
			ownerId: adminUser.id,
			communityId: city2.id,
			countryId: countryB.id,
			orders: {
				create: {
					userId: adminUser.id,
					quantity: 1,
					priority: 200.0,
					recurrencePeriod: 90,
					isBasicNeed: false,
				},
			},
		},
	})

	const request4 = await prisma.request.create({
		data: {
			title: 'Healthcare Access',
			body: 'Need information about local healthcare services',
			unitOfMeasure: 'Units',
			ownerId: regularUser.id,
			communityId: city2.id,
			countryId: country2.id,
			orders: {
				create: {
					userId: regularUser.id,
					quantity: 1,
					priority: 300.0,
					recurrencePeriod: 60,
					isBasicNeed: true,
				},
			},
		},
	})

	console.log('Requests and orders created')

	// Create tags
	const tag1 = await prisma.tag.create({
		data: { name: 'urgent', type: 'request' },
	})

	const tag2 = await prisma.tag.create({
		data: { name: 'community', type: 'request' },
	})

	// Assign tags
	await prisma.request.update({
		where: { id: request1.id },
		data: { tags: { connect: [{ id: tag1.id }, { id: tag2.id }] } },
	})

	await prisma.request.update({
		where: { id: request2.id },
		data: { tags: { connect: [{ id: tag1.id }] } },
	})

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
