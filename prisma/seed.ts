import { PrismaClient } from "@prisma/client";
import { DEFAULT_PRICE_AUD } from "../lib/config";

const prisma = new PrismaClient();

type SeedCategory = {
  slug: string;
  name: string;
  items: string[];
};

const CATEGORIES: SeedCategory[] = [
  {
    slug: "nigiri",
    name: "にぎり",
    items: [
      "マグロ",
      "中トロ",
      "サーモン",
      "ハマチ",
      "タイ",
      "イカ",
      "エビ",
      "タコ",
      "アジ",
      "玉子",
    ],
  },
  {
    slug: "gunkan",
    name: "軍艦",
    items: ["イクラ", "ウニ", "ネギトロ", "コーン", "カニミソ"],
  },
  {
    slug: "roll",
    name: "巻物・ロール",
    items: [
      "鉄火巻",
      "かっぱ巻",
      "納豆巻",
      "カリフォルニアロール",
      "サラダ巻",
      "エビ天ロール",
    ],
  },
  {
    slug: "side",
    name: "サイド",
    items: ["味噌汁", "茶碗蒸し", "枝豆", "唐揚げ"],
  },
  {
    slug: "dessert",
    name: "デザート",
    items: ["プリン", "アイス", "わらび餅"],
  },
];

async function main() {
  console.log("Seeding categories and menu items...");
  for (let c = 0; c < CATEGORIES.length; c++) {
    const cat = CATEGORIES[c];
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sortOrder: c },
      create: { slug: cat.slug, name: cat.name, sortOrder: c },
    });

    for (let i = 0; i < cat.items.length; i++) {
      const name = cat.items[i];
      const existing = await prisma.menuItem.findFirst({
        where: { name, categoryId: category.id },
      });
      if (existing) {
        await prisma.menuItem.update({
          where: { id: existing.id },
          data: { sortOrder: i, active: true, priceAud: DEFAULT_PRICE_AUD },
        });
      } else {
        await prisma.menuItem.create({
          data: {
            name,
            categoryId: category.id,
            sortOrder: i,
            priceAud: DEFAULT_PRICE_AUD,
          },
        });
      }
    }
  }
  const catCount = await prisma.category.count();
  const itemCount = await prisma.menuItem.count();
  console.log(`Done. categories=${catCount}, menuItems=${itemCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
