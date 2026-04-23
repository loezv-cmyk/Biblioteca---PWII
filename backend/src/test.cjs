const prisma = require("./prisma.cjs");

async function main() {
  const tables = await prisma.$queryRaw`SHOW TABLES;`;
  console.log(tables);
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());