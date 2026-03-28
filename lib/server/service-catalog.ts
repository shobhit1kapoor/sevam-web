import { prisma } from "@/lib/db/prisma";
import { SERVICE_CATALOG_SEED } from "@/lib/server/service-catalog-seed";

export type ServiceCatalogResponse = {
  categories: Array<{
    id: string;
    slug: string;
    name: string;
    iconKey: string;
    color: string;
    bg: string;
    sortOrder: number;
    services: Array<{
      id: string;
      slug: string;
      name: string;
      description: string;
      price: number;
      originalPrice: number | null;
      duration: string;
      rating: number;
      reviews: number;
      image: string;
      process: string[];
      deliveryTime: string | null;
      jobType: string | null;
      sortOrder: number;
    }>;
  }>;
};

let seedInProgress: Promise<void> | null = null;

async function ensureServiceCatalogSeeded() {
  const existingCount = await prisma.serviceCategory.count();
  if (existingCount > 0) {
    return;
  }

  if (!seedInProgress) {
    seedInProgress = (async () => {
      await prisma.$transaction(async (tx) => {
        await tx.serviceCategory.createMany({
          data: SERVICE_CATALOG_SEED.map((category) => ({
            slug: category.slug,
            name: category.name,
            iconKey: category.iconKey,
            color: category.color,
            bg: category.bg,
            sortOrder: category.sortOrder,
            isActive: true,
          })),
        });

        const createdCategories = await tx.serviceCategory.findMany({
          select: { id: true, slug: true },
        });

        const categoryIdBySlug = new Map(createdCategories.map((category) => [category.slug, category.id]));

        const serviceData = SERVICE_CATALOG_SEED.flatMap((category) => {
          const categoryId = categoryIdBySlug.get(category.slug);
          if (!categoryId) return [];

          return category.services.map((service, index) => ({
            categoryId,
            slug: service.slug,
            name: service.name,
            description: service.description,
            price: service.price,
            originalPrice: null,
            duration: service.duration,
            rating: service.rating,
            reviews: service.reviews,
            image: service.image,
            process: service.process,
            deliveryTime: service.deliveryTime,
            jobType: service.jobType,
            sortOrder: index + 1,
            isActive: true,
          }));
        });

        if (serviceData.length > 0) {
          await tx.service.createMany({
            data: serviceData,
          });
        }
      });
    })()
      .finally(() => {
        seedInProgress = null;
      });
  }

  await seedInProgress;
}

export async function getServiceCatalog(): Promise<ServiceCatalogResponse> {
  await ensureServiceCatalogSeeded();

  const categories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      services: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });

  return {
    categories: categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      iconKey: category.iconKey,
      color: category.color,
      bg: category.bg,
      sortOrder: category.sortOrder,
      services: category.services.map((service) => ({
        id: service.id,
        slug: service.slug,
        name: service.name,
        description: service.description,
        price: Number(service.price),
        originalPrice: service.originalPrice ? Number(service.originalPrice) : null,
        duration: service.duration,
        rating: service.rating,
        reviews: service.reviews,
        image: service.image,
        process: service.process,
        deliveryTime: service.deliveryTime,
        jobType: service.jobType,
        sortOrder: service.sortOrder,
      })),
    })),
  };
}
