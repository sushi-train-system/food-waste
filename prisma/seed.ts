import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_PRICE_AUD,
  DEFAULT_STORE_NAME,
  DEFAULT_STORE_SLUG,
  DEFAULT_STORE_TIMEZONE,
} from "../lib/config";

const prisma = new PrismaClient();

type SeedCategory = {
  slug: string;
  name: string;
  items: string[];
};

const CATEGORIES: SeedCategory[] = [
  {
    slug: "mini-roll",
    name: "Mini Roll",
    items: [
      "Asparagus Roll",
      "Avocado Roll",
      "Cucumber Roll",
      "Kanpyo Roll",
      "Mini Chicken Roll",
      "Natto Roll",
      "Negitoro Roll",
      "Oshinko Roll",
      "Prawn & Avocado Roll",
      "Salmon Roll",
      "Salmon Tempura Roll",
      "Tekka Roll",
      "Tuna Salad Roll",
      "UmeQ Roll",
    ],
  },
  {
    slug: "roll",
    name: "Roll",
    items: [
      "Asparagus & Avocado roll",
      "Aussie Roll",
      "California Roll",
      "Chicken & Avocade Roll",
      "Chicken & Egg Salad Roll",
      "Chicken Roll",
      "Chicken, Avodaco & Cream Cheese Roll",
      "Chilli Wagyu Beef Roll",
      "Crunchy Roll",
      "Cucmber & Avocado Roll",
      "Dragon Roll",
      "Ebi Fry Roll",
      "Hot Hot Chicken Roll",
      "Karaage Roll",
      "Philadelphia Roll",
      "Prawn Stick Roll",
      "S.A.O Roll",
      "Salmon & Avocado Roll",
      "Salmon Dynamite Roll",
      "Salmon, Avocado & Cream Cheese Roll",
      "Semi Dried Tomato Avocado Roll",
      "Semi Dry Tomato & Avo with Cream Cheese Roll",
      "Sesame Roll",
      "Soft Shell Crab Roll",
      "Sunset Roll",
      "Sushi Train Roll",
      "Sweet Chilli Prawn Roll",
      "Teriyaki Chicken & Avo Roll",
      "Teriyaki Chicken Roll",
      "Tiger Roll",
      "Tuna Salad & Avocado Roll",
      "Twin Roll",
      "Vegetarian Roll",
    ],
  },
  {
    slug: "nigiri",
    name: "Nigiri",
    items: [
      "Akagai Nigiri",
      "Amaebi Nigiri",
      "Asparagus Tempura Nigiri",
      "Carrot & Pumpkin Tempura Nigiri",
      "Chicken & Avocado Nigiri",
      "Chicken & Avocado Spicy Nigiri",
      "Corn Kakiage Nigiri",
      "Ebi Nigiri",
      "Ebi Katsu Nigiri",
      "Engawa Nigiri",
      "Hamachi (Kingfish) Nigiri",
      "Hotate Nigiri",
      "Ika Nigiri",
      "Ika Sugata Nigiri",
      "Ika Tempura Nigiri",
      "Inari",
      "Kakiage Nigiri",
      "Kakiage&Avocado Nigiri",
      "Kanikama Nigiri",
      "Kanikama & Avocado Nigiri",
      "Kanikama Tempura Nigiri",
      "Maguro Nigiri",
      "Mini Ebi Fry & Avocado Nigiri",
      "Mini Ebi Fry (Prawn) Nigiri",
      "Mini Ebi Tempura & Avocado Nigiri",
      "Mini Ebi Tempura Nigiri",
      "Nasu Tempura Nigiri",
      "Okura Tempura Nigiri",
      "Pink Shrimp Nigiri",
      "Salmon Nigiri",
      "Salmon belly Nigiri",
      "Salmon & Avocado Nigiri",
      "Salomon & Onion Nigiri",
      "Shimesaba Nigiri",
      "Smoked Duck Nigiri",
      "Tako Nigiri",
      "Tamago Nigiri",
      "Tsubugai Nigiri",
      "Unagi Nigiri",
      "Unatama Nigiri",
      "Zuke Maguro Nigiri",
    ],
  },
  {
    slug: "aburi",
    name: "Aburi",
    items: [
      "Aburi Chashu Nigiri",
      "Aburi Chicken Cheese Nigiri",
      "Aburi Chicken Cheese Roll",
      "Aburi Hotate Nigiri",
      "Aburi Prawn Cheese Nigiri",
      "Aburi S.A.C Roll",
      "Aburi S.A.O Roll",
      "Aburi Salmon & Avocado Seafood Ship",
      "Aburi Salmon Belly Nigiri",
      "Aburi Salmon Nigiri",
      "Aburi Salmon Roll",
      "Aburi Wagyu Beef Nigiri",
      "Aburi Wagyu Beef Roll",
      "Aburi Wagyu Nigiri (Teriyaki Souce & Shallot)",
      "Salmon Volcano Ship",
      "Volcano Roll",
    ],
  },
  {
    slug: "ship",
    name: "Ship",
    items: [
      "Avocado Seafood Ship",
      "Corn Salad Ship",
      "Egg Salad Ship",
      "Golden Salad Ship",
      "Hokki Salad Ship",
      "Ika Mentai Ship",
      "Ikura Ship",
      "Kanikama Salad Ship",
      "Lobster Salad Ship",
      "Negitoro Ship",
      "Okura Ship",
      "Salmon & Avocado Seafood Ship",
      "Salmon & Ikura Ship",
      "Salmon & Tobiko Ship",
      "Salmon Toro Ship",
      "Seaweed Salad Ship",
      "Tobiko Ship",
      "Tuna salad ship",
      "Uni Ship",
      "Wagyu Beef Ship",
    ],
  },
  {
    slug: "hot-dishes",
    name: "Hot Dishes",
    items: [
      "Agedashi Tofu",
      "Aji Fry",
      "Calamari Ring",
      "Crab Claw",
      "Creamy Croquette",
      "Crispy Calamari Cheese Ball",
      "Edamame",
      "Gyoza Vegetable",
      "Gyoza",
      "Harumaki (Spring Rolls)",
      "Kaki Fry (Oyster Fry)",
      "Karaage Spicy",
      "Karaage Sweetchili",
      "Karaage",
      "Okonomiyaki",
      "Takoyaki",
      "Teriyaki Salmon",
      "Tsukune",
      "Yokohama Dim Sim",
    ],
  },
  {
    slug: "dessert",
    name: "Dessert",
    items: [
      "Apple Crumble",
      "Banana Gelato",
      "Blueberry Cheese Cake",
      "Caramel Custard pudding",
      "Chocolate Mousse",
      "Fondant Chocolate",
      "Green Tea Gelato",
      "Jelly",
      "Mango Gelato",
      "Rich Milk Gelato",
      "Strawberry Mousse",
    ],
  },
];

async function main() {
  console.log("Seeding default store, categories and menu items...");
  const store = await prisma.store.upsert({
    where: { slug: DEFAULT_STORE_SLUG },
    update: {
      name: DEFAULT_STORE_NAME,
      timezone: DEFAULT_STORE_TIMEZONE,
    },
    create: {
      slug: DEFAULT_STORE_SLUG,
      name: DEFAULT_STORE_NAME,
      timezone: DEFAULT_STORE_TIMEZONE,
    },
  });

  const seedSlugs = CATEGORIES.map((cat) => cat.slug);
  const staleCategories = await prisma.category.findMany({
    where: { storeId: store.id, slug: { notIn: seedSlugs } },
    select: { id: true },
  });

  for (const stale of staleCategories) {
    const entryCount = await prisma.wasteEntry.count({
      where: { storeId: store.id, menuItem: { categoryId: stale.id } },
    });
    if (entryCount === 0) {
      await prisma.category.delete({ where: { id: stale.id } });
    } else {
      await prisma.menuItem.updateMany({
        where: { storeId: store.id, categoryId: stale.id },
        data: { active: false },
      });
    }
  }

  for (let c = 0; c < CATEGORIES.length; c++) {
    const cat = CATEGORIES[c];
    const category = await prisma.category.upsert({
      where: { storeId_slug: { storeId: store.id, slug: cat.slug } },
      update: { name: cat.name, sortOrder: c },
      create: {
        storeId: store.id,
        slug: cat.slug,
        name: cat.name,
        sortOrder: c,
      },
    });

    for (let i = 0; i < cat.items.length; i++) {
      const name = cat.items[i];
      const existing = await prisma.menuItem.findFirst({
        where: { storeId: store.id, name, categoryId: category.id },
      });
      if (existing) {
        await prisma.menuItem.update({
          where: { id: existing.id },
          data: { sortOrder: i, active: true, priceAud: DEFAULT_PRICE_AUD },
        });
      } else {
        await prisma.menuItem.create({
          data: {
            storeId: store.id,
            name,
            categoryId: category.id,
            sortOrder: i,
            priceAud: DEFAULT_PRICE_AUD,
          },
        });
      }
    }

    const staleItems = await prisma.menuItem.findMany({
      where: {
        storeId: store.id,
        categoryId: category.id,
        name: { notIn: cat.items },
      },
      select: { id: true },
    });

    for (const stale of staleItems) {
      const entryCount = await prisma.wasteEntry.count({
        where: { storeId: store.id, menuItemId: stale.id },
      });
      if (entryCount === 0) {
        await prisma.menuItem.delete({ where: { id: stale.id } });
      } else {
        await prisma.menuItem.update({
          where: { id: stale.id },
          data: { active: false },
        });
      }
    }
  }
  const storeCount = await prisma.store.count();
  const catCount = await prisma.category.count({ where: { storeId: store.id } });
  const itemCount = await prisma.menuItem.count({
    where: { storeId: store.id, active: true },
  });
  console.log(
    `Done. stores=${storeCount}, categories=${catCount}, menuItems=${itemCount}`,
  );
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
