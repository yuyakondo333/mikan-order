import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { products, productVariants } from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

const seedProducts = [
  {
    name: "早生みかん",
    stockKg: "100",
    description: "甘みと酸味のバランスが良い早生みかん",
    isAvailable: true,
    // 旧カラム（まだスキーマに残っている）
    variety: "早生",
    weightGrams: 0,
    priceJpy: 0,
    stock: 0,
    stockUnit: "kg",
    variants: [
      { label: "3kg", weightKg: "3", priceJpy: 1800, displayOrder: 1 },
      { label: "5kg", weightKg: "5", priceJpy: 2800, displayOrder: 2 },
      { label: "10kg", weightKg: "10", priceJpy: 5000, displayOrder: 3 },
      {
        label: "5kg 贈答用",
        weightKg: "5",
        priceJpy: 3500,
        isGiftOnly: true,
        displayOrder: 4,
      },
    ],
  },
  {
    name: "不知火",
    stockKg: "50",
    description: "デコポンの品種名。甘みが強くジューシー",
    isAvailable: true,
    variety: "不知火",
    weightGrams: 0,
    priceJpy: 0,
    stock: 0,
    stockUnit: "kg",
    variants: [
      { label: "3kg", weightKg: "3", priceJpy: 2500, displayOrder: 1 },
      { label: "5kg", weightKg: "5", priceJpy: 3800, displayOrder: 2 },
      {
        label: "5kg 贈答用",
        weightKg: "5",
        priceJpy: 4500,
        isGiftOnly: true,
        displayOrder: 3,
      },
    ],
  },
  {
    name: "寿太郎",
    stockKg: "30",
    description: "濃厚な味わいの高級みかん",
    isAvailable: true,
    variety: "寿太郎",
    weightGrams: 0,
    priceJpy: 0,
    stock: 0,
    stockUnit: "kg",
    variants: [
      { label: "3kg", weightKg: "3", priceJpy: 3000, displayOrder: 1 },
      { label: "5kg", weightKg: "5", priceJpy: 4500, displayOrder: 2 },
    ],
  },
  {
    name: "青島みかん",
    stockKg: "80",
    description: "貯蔵熟成で甘みが増す晩生みかん",
    isAvailable: false,
    variety: "青島",
    weightGrams: 0,
    priceJpy: 0,
    stock: 0,
    stockUnit: "kg",
    variants: [
      { label: "5kg", weightKg: "5", priceJpy: 2500, displayOrder: 1 },
      { label: "10kg", weightKg: "10", priceJpy: 4500, displayOrder: 2 },
    ],
  },
];

async function seed() {
  console.log("Seeding products with variants...");

  for (const { variants, ...productData } of seedProducts) {
    const [product] = await db
      .insert(products)
      .values(productData)
      .returning();
    console.log(
      `  Product: ${product.name} (stockKg: ${product.stockKg}) [${product.isAvailable ? "販売中" : "販売停止"}]`
    );

    for (const variant of variants) {
      await db.insert(productVariants).values({
        productId: product.id,
        ...variant,
      });
      console.log(
        `    Variant: ${variant.label} - ¥${variant.priceJpy}${variant.isGiftOnly ? " 🎁" : ""}`
      );
    }
  }

  await client.end();
  console.log("Done.");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
