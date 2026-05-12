import CategoriesClient from "@/components/settings/CategoriesClient";

export default async function CategoriesPage() {
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  return <CategoriesClient categories={categories ?? []} />;
}
