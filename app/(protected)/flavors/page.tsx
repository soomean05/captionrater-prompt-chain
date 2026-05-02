import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { listFlavors } from "@/lib/db/flavors";
import { FlavorCreateForm } from "./FlavorCreateForm";
import { FlavorRow } from "./FlavorRow";

/** Always read fresh rows after create/update (revalidatePath + no static RSC cache). */
export const dynamic = "force-dynamic";

type FlavorsPageSearchParams = {
  page?: string;
  q?: string;
  search?: string;
  [key: string]: string | undefined;
};

export default async function FlavorsPage({
  searchParams,
}: {
  searchParams: Promise<FlavorsPageSearchParams>;
}) {
  const params = await searchParams;
  const query = (params.q ?? params.search ?? "").trim();
  const rawPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const { data: flavors, count, pageSize, error } = await listFlavors({
    page,
    pageSize: 10,
    query,
  });
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  const preservedParams = Object.entries(params).filter(
    ([key, value]) =>
      key !== "page" && key !== "q" && key !== "search" && value !== undefined
  );
  const baseParams = new URLSearchParams();
  for (const [key, value] of preservedParams) {
    if (value) baseParams.set(key, value);
  }
  if (query) baseParams.set("q", query);

  const buildPageHref = (targetPage: number) => {
    const qs = new URLSearchParams(baseParams.toString());
    qs.set("page", String(targetPage));
    const queryString = qs.toString();
    return queryString ? `/flavors?${queryString}` : "/flavors";
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          eyebrow="Library"
          title="Humor flavors"
          description="Search, organize, and open any flavor to edit its ordered prompt chain."
          className="max-w-xl"
        />
        <FlavorCreateForm />
      </div>
      <form className="card-surface p-4" method="get">
        {preservedParams.map(([key, value]) =>
          value ? <input key={key} type="hidden" name={key} value={value} /> : null
        )}
        <input type="hidden" name="page" value="1" />
        <label
          htmlFor="q"
          className="mb-1 block text-sm font-medium text-card-foreground"
        >
          Search flavors
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="q"
            name="q"
            defaultValue={query}
            placeholder="Search by flavor name or description"
            className="input-base min-w-[260px] flex-1"
          />
          <button type="submit" className="btn-primary">
            Search
          </button>
        </div>
      </form>

      {error ? (
        <div className="alert-error">{error.message}</div>
      ) : null}

      {!error && (!flavors || flavors.length === 0) ? (
        <div className="empty-state">
          <p>No humor flavors yet. Create one to get started.</p>
          <FlavorCreateForm className="mt-4" />
        </div>
      ) : (
        <div className="card-surface overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {flavors?.map((flavor) => (
                <FlavorRow key={flavor.id} flavor={flavor} />
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm muted-text">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {hasPrevious ? (
                <Link href={buildPageHref(page - 1)} className="btn-ghost">
                  Previous
                </Link>
              ) : (
                <button type="button" disabled className="btn-ghost opacity-50">
                  Previous
                </button>
              )}
              {hasNext ? (
                <Link href={buildPageHref(page + 1)} className="btn-ghost">
                  Next
                </Link>
              ) : (
                <button type="button" disabled className="btn-ghost opacity-50">
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
