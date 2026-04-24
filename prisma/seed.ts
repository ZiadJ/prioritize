import prisma from '../lib/prisma'
import bcrypt from 'bcrypt'

async function main() {
  console.log('Starting seed...')

  const hashedPassword = await bcrypt.hash('aaa', 10)

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
    },
  })

  console.log('Users created')

  // Create community nodes
  const country1 = await prisma.communityNode.create({
    data: {
      title: 'USA',
      body: 'United States of America',
      country: 'USA',
      address: 'United States',
      longitude: -95.7129,
      latitude: 37.0902,
      path: '1/',
      depth: 0,
      numchild: 1,
      isActive: true,
    },
  })

  const state1 = await prisma.communityNode.create({
    data: {
      title: 'California',
      body: 'State of California',
      country: 'USA',
      address: 'California, USA',
      longitude: -119.4179,
      latitude: 36.7783,
      path: `1/${country1.id}/`,
      depth: 1,
      numchild: 1,
      parentId: country1.id,
      isActive: true,
    },
  })

  const city1 = await prisma.communityNode.create({
    data: {
      title: 'San Francisco',
      body: 'City of San Francisco',
      country: 'USA',
      address: 'San Francisco, CA, USA',
      longitude: -122.4194,
      latitude: 37.7749,
      path: `1/${country1.id}/${state1.id}/`,
      depth: 2,
      numchild: 0,
      parentId: state1.id,
      isActive: true,
    },
  })

  const country2 = await prisma.communityNode.create({
    data: {
      title: 'Canada',
      body: 'Canada',
      country: 'Canada',
      address: 'Canada',
      longitude: -106.3468,
      latitude: 56.1304,
      path: '2/',
      depth: 0,
      numchild: 1,
      isActive: true,
    },
  })

  const state2 = await prisma.communityNode.create({
    data: {
      title: 'Ontario',
      body: 'Province of Ontario',
      country: 'Canada',
      address: 'Ontario, Canada',
      longitude: -79.3832,
      latitude: 43.6532,
      path: `2/${country2.id}/`,
      depth: 1,
      numchild: 1,
      parentId: country2.id,
      isActive: true,
    },
  })

  const city2 = await prisma.communityNode.create({
    data: {
      title: 'Toronto',
      body: 'City of Toronto',
      country: 'Canada',
      address: 'Toronto, ON, Canada',
      longitude: -79.3832,
      latitude: 43.6532,
      path: `2/${country2.id}/${state2.id}/`,
      depth: 2,
      numchild: 0,
      parentId: state2.id,
      isActive: true,
    },
  })

  console.log('Community nodes created')

  // Create requests
  const request1 = await prisma.request.create({
    data: {
      title: 'Food Assistance Needed',
      body: 'Need help with groceries for the week',
      isBasicNeed: true,
      ownerId: adminUser.id,
      communityNodeId: city1.id,
    },
  })

  const request2 = await prisma.request.create({
    data: {
      title: 'Housing Support',
      body: 'Looking for temporary housing assistance',
      isBasicNeed: true,
      ownerId: regularUser.id,
      communityNodeId: city1.id,
    },
  })

  const request3 = await prisma.request.create({
    data: {
      title: 'Community Event Planning',
      body: 'Help organize a community cleanup event',
      isBasicNeed: false,
      ownerId: adminUser.id,
      communityNodeId: city2.id,
    },
  })

  const request4 = await prisma.request.create({
    data: {
      title: 'Healthcare Access',
      body: 'Need information about local healthcare services',
      isBasicNeed: true,
      ownerId: regularUser.id,
      communityNodeId: city2.id,
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
    },
  })

  await prisma.order.create({
    data: {
      requestId: request2.id,
      userId: regularUser.id,
      quantity: 1,
      recurrencePeriod: 30,
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
