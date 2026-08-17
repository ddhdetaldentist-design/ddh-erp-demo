import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { ProductsClient } from "@/components/products/ProductsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "أنواع التركيبات" };

async function getProductsData() {
  const products = await prisma.productType.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { cases: true } } },
  });
  return products;
}

export default async function ProductsPage() {
  const products = await getProductsData();

  return (
    <>
      <Topbar
        title="أنواع التركيبات والمنتجات"
        subtitle={`إدارة قوائم وأسعار التركيبات`}
      />

      <div className="flex-1 p-6 space-y-6 page-enter">
        <ProductsClient initialProducts={products} />
      </div>
    </>
  );
}
