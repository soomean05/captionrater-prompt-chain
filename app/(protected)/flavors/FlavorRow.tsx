"use client";

import Link from "next/link";
import { deleteFlavorAction } from "./actions";
import type { HumorFlavor } from "@/lib/db/flavors";

export function FlavorRow({ flavor }: { flavor: HumorFlavor }) {
  return (
    <tr className="border-b border-zinc-100 last:border-0 dark:border-zinc-700">
      <td className="px-4 py-3">
        <Link
          href={`/flavors/${flavor.id}`}
          className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
        >
          {flavor.name ?? "—"}
        </Link>
      </td>
      <td className="max-w-md truncate px-4 py-3 text-zinc-700 dark:text-zinc-400">
        {flavor.description ?? "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Link
            href={`/flavors/${flavor.id}`}
            className="rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            Edit
          </Link>
          <form
            action={async (fd) => {
              await deleteFlavorAction(fd);
            }}
            className="inline"
          >
            <input type="hidden" name="id" value={flavor.id} />
            <button
              type="submit"
              onClick={(e) => {
                if (!confirm("Delete this flavor and all its steps?")) {
                  e.preventDefault();
                }
              }}
              className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}
