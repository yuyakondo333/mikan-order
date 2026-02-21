import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { products } from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

const seedProducts = [
  {
    name: "温州みかん S",
    variety: "温州",
    weightGrams: 3000,
    priceJpy: 1500,
    description: "定番の温州みかん。小ぶりで甘みが凝縮。約30個入り。",
    isAvailable: true,
  },
  {
    name: "温州みかん M",
    variety: "温州",
    weightGrams: 5000,
    priceJpy: 2300,
    description: "定番の温州みかん。食べやすいMサイズ。約35個入り。",
    isAvailable: true,
  },
  {
    name: "温州みかん L",
    variety: "温州",
    weightGrams: 10000,
    priceJpy: 4000,
    description: "定番の温州みかん。たっぷり10kg箱。約60個入り。",
    isAvailable: true,
  },
  {
    name: "デコポン 5kg",
    variety: "デコポン",
    weightGrams: 5000,
    priceJpy: 3500,
    description: "甘みと酸味のバランスが絶妙。ヘタの部分がぷっくり膨らんだ人気品種。",
    isAvailable: true,
  },
  {
    name: "せとか 3kg",
    variety: "せとか",
    weightGrams: 3000,
    priceJpy: 3800,
    description: "「柑橘の大トロ」と呼ばれる高糖度品種。とろける食感。",
    isAvailable: true,
  },
  {
    name: "はるみ 5kg",
    variety: "はるみ",
    weightGrams: 5000,
    priceJpy: 3200,
    description: "プチプチとした食感が特徴。果汁たっぷりで香り豊か。",
    isAvailable: true,
  },
  {
    name: "紅まどんな 3kg",
    variety: "紅まどんな",
    weightGrams: 3000,
    priceJpy: 4500,
    description: "ゼリーのような食感の愛媛県オリジナル品種。贈答にも最適。",
    isAvailable: false,
  },
];

async function seed() {
  console.log("Seeding products...");
  const inserted = await db.insert(products).values(seedProducts).returning();
  console.log(`Inserted ${inserted.length} products:`);
  for (const p of inserted) {
    console.log(`  - ${p.name} (${p.variety}) ¥${p.priceJpy} [${p.isAvailable ? "販売中" : "販売停止"}]`);
  }
  await client.end();
  console.log("Done.");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
