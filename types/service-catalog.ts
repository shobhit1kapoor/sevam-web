export type CatalogService = {
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
};

export type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
  iconKey: string;
  color: string;
  bg: string;
  sortOrder: number;
  services: CatalogService[];
};

export type ServiceCatalogApiResponse = {
  categories: CatalogCategory[];
};
