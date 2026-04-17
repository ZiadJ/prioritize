import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/*const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
export default prisma;
*/

declare const global: {
	prismaGlobal: PrismaClient;
};

let prisma = global.prismaGlobal;
if (!prisma) {
	const adapter = new PrismaPg({
		connectionString: process.env.DATABASE_URL
	});
	prisma = new PrismaClient({ adapter });
	if (process.env.NODE_ENV !== 'production') {
		global.prismaGlobal = prisma;
	}
}

export default prisma;