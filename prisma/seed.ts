import prisma from '../lib/prisma'
import bcrypt from 'bcrypt'
import { createTreeNode } from '../lib/tree'

async function main() {
  console.log('Starting seed...')

  const hashedPassword = await bcrypt.hash('aaa', 10)

    // Create countries
    const usa = await prisma.country.upsert({
      where: { name: 'United States of America' },
      update: {},
      create: {
        name: 'United States of America',
        code: 'US',
        phoneCode: '1',
        isActive: true,
      },
    })

    const canada = await prisma.country.upsert({
      where: { name: 'Canada' },
      update: {},
      create: {
        name: 'Canada',
        code: 'CA',
        phoneCode: '1',
        isActive: true,
      },
    })

    // Create community nodes using tree utility
    const country1 = await createTreeNode(prisma.communityNode, {
			title: 'Azure Valley Region',
			body: 'Region in North America',
			country: { connect: { id: usa.id } },
			address: 'United States',
			longitude: -95.7129,
			latitude: 37.0902,
			isActive: true,
		})

		const state1 = await createTreeNode(prisma.communityNode, {
			title: 'Arcadia',
			body: 'State of Arcadia',
			country: { connect: { id: usa.id } },
			address: 'Arcadia, USA',
			longitude: -119.4179,
			latitude: 36.7783,
			parentId: country1.id,
			isActive: true,
		})

		const city1 = await createTreeNode(prisma.communityNode, {
			title: 'Sunset Harbor',
			body: 'City of Sunset Harbor',
			country: { connect: { id: usa.id } },
			address: 'Sunset Harbor, Arcadia, USA',
			longitude: -122.4194,
			latitude: 37.7749,
			parentId: state1.id,
			isActive: true,
		})

		const country2 = await createTreeNode(prisma.communityNode, {
			title: 'Northern Lights Region',
			body: 'Region in North America',
			country: { connect: { id: canada.id } },
			address: 'Canada',
			longitude: -106.3468,
			latitude: 56.1304,
			isActive: true,
		})

		const state2 = await createTreeNode(prisma.communityNode, {
			title: 'Maple Haven',
			body: 'Province of Maple Haven',
			country: { connect: { id: canada.id } },
			address: 'Maple Haven, Canada',
			longitude: -79.3832,
			latitude: 43.6532,
			parentId: country2.id,
			isActive: true,
		})

		const city2 = await createTreeNode(prisma.communityNode, {
			title: 'Icehaven',
			body: 'Region in Icehaven',
			country: { connect: { id: canada.id } },
			address: 'Icehaven, Maple Haven, Canada',
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
      countryId: usa.id,
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
      countryId: canada.id,
    },
  })

	console.log('Users created')



  // Create requests
  const request1 = await prisma.request.create({
    data: {
      title: 'Food Assistance Needed',
      body: 'Need help with groceries for the week',
      isBasicNeed: true,
      ownerId: adminUser.id,
      communityId: city1.id,
      countryId: usa.id,
    },
  })

  const request2 = await prisma.request.create({
    data: {
      title: 'Housing Support',
      body: 'Looking for temporary housing assistance',
      isBasicNeed: true,
      ownerId: regularUser.id,
      communityId: city1.id,
      countryId: usa.id,
    },
  })

  const request3 = await prisma.request.create({
    data: {
      title: 'Community Event Planning',
      body: 'Help organize a community cleanup event',
      isBasicNeed: false,
      ownerId: adminUser.id,
      communityId: city2.id,
      countryId: canada.id,
    },
  })

  const request4 = await prisma.request.create({
    data: {
      title: 'Healthcare Access',
      body: 'Need information about local healthcare services',
      isBasicNeed: true,
      ownerId: regularUser.id,
      communityId: city2.id,
      countryId: canada.id,
    },
  })

  console.log('Requests created')

  // Create orders
   await prisma.order.create({
     data: {
       requestId: request1.id,
       userId: adminUser.id,
       quantity: 1,
       recurrencePeriod: 7,
       unitOfMeasure: 'Unit',
     },
   })
 
   await prisma.order.create({
     data: {
       requestId: request2.id,
       userId: regularUser.id,
       quantity: 1,
       recurrencePeriod: 30,
       unitOfMeasure: 'Unit',
     },
   })

  console.log('Orders created')

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
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
