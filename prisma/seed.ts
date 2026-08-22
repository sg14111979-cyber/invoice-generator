import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Seeds the initial administrator from environment variables so credentials are
 * never committed to source, plus one sample brand the user can freely edit.
 */
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Administrator";

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the administrator account.",
    );
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { name, role: "ADMIN" },
    create: { email: email.toLowerCase(), name, role: "ADMIN", passwordHash },
  });

  await prisma.userSettings.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  const existingBrands = await prisma.brand.count({ where: { userId: admin.id } });
  if (existingBrands === 0) {
    const brand = await prisma.brand.create({
      data: {
        userId: admin.id,
        name: "Secure-Net Technologies",
        country: "India",
        city: "Bengaluru",
        state: "Karnataka",
        email: "billing@secure-net.example",
        phone: "+91 00000 00000",
        website: "https://secure-net.example",
        addressLine1: "Sample address line 1",
        isDefault: true,
      },
    });
    await prisma.brandSettings.create({
      data: {
        brandId: brand.id,
        invoicePrefix: "SNT-INV",
        currency: "INR",
        taxMode: "GST",
        gstEnabled: true,
        cgstRate: 9,
        sgstRate: 9,
        igstRate: 18,
        defaultTaxRate: 18,
        paymentTerms: "Net 15",
        defaultNotes: "Please include the invoice number with your payment.",
        defaultFooter: "Thank you for your business.",
      },
    });
  }

  console.log(`Seeded administrator ${admin.email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
