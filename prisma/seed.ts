import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding roles...')
  await prisma.role.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Admin' },
  })
  
  await prisma.role.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: 'Účetní' },
  })
  
  await prisma.role.upsert({
    where: { id: 3 },
    update: {},
    create: { id: 3, name: 'Fakturant' },
  })

  console.log('Seeding invoice statuses...')
  await prisma.invoiceStatus.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'koncept', label: 'Koncept' },
  })

  await prisma.invoiceStatus.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: 'ceka', label: 'Čeká' },
  })

  await prisma.invoiceStatus.upsert({
    where: { id: 3 },
    update: {},
    create: { id: 3, name: 'po_splatnosti', label: 'Po splatnosti' },
  })

  await prisma.invoiceStatus.upsert({
    where: { id: 4 },
    update: {},
    create: { id: 4, name: 'zaplacena', label: 'Zaplacena' },
  })

  console.log('Seeding user...')
  // From env variables, the email is:
  const userEmail = "zajicek.matej1@gmail.com"
  
  await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      roleId: 1, // Make sure it's an admin
    },
    create: {
      email: userEmail,
      name: "Matěj Zajíček",
      roleId: 1, // Admin role
    },
  })

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
