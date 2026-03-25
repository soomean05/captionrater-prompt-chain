"use client";

import Link from "next/link";
import { deleteFlavorAction } from "./actions";
import type { HumorFlavor } from "@/lib/db/flavors";

export function FlavorRow({ flavor }: { flavor: HumorFlavor }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3">
        <Link
          href={`/flavors/${flavor.id}`}
          className="font-medium text-card-foreground hover:underline"
        >
          {flavor.name ?? "—"}
        </Link>
      </td>
      <td className="max-w-md truncate px-4 py-3 muted-text">
        {flavor.description ?? "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Link
            href={`/flavors/${flavor.id}`}
            className="btn-ghost"
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
              className="btn-danger-ghost"
            >
              Delete
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}
