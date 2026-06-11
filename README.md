# Prioritize

---

## Installation

Clone the repository and run the following commands:

```bash
# Clone the repository
git clone https://github.com/ZiadJ/prioritize

# Navigate to the project directory
cd prioritize

# Install dependencies
npm install

# Generate Prisma files
npx prisma generate

# Create .env file and set a Postgres DB url (currently using Supabase)
copy .env.example .env

# Initialize database
npm prisma db push

# Start the development server
npm run dev
```



