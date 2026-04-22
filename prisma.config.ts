// Prisma 7 configuration
// dotenv loads DATABASE_URL from .env in dev, in production env vars are set by hosting platform
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Use dummy URL for prisma generate in CI (no actual connection needed)
const databaseUrl =
	process.env.DATABASE_URL || 'postgresql://localhost:3000/dummy';
const shadowDatabaseUrl =
	process.env.SHADOW_DATABASE_URL || 'postgresql://localhost:3000/dummy_shadow';

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: {
		path: 'prisma/migrations',
		seed: 'tsx prisma/seed.ts',
	},
	datasource: {
		url: databaseUrl,
		shadowDatabaseUrl: shadowDatabaseUrl,
	},
});
