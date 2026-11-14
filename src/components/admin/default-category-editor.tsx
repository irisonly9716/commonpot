"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { DefaultCategory } from "@/lib/data/admin";
import { sendAdminRequest } from "./api-call";

const BASE = "/api/v1/admin/default-categories";

/**
 * The categories new groups start with. Groups that already exist keep their
 * own copy, so editing this list never changes an existing group.
 */
export function DefaultCategoryEditor({
  categories,
}: {
  categories: DefaultCategory[];
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function run(
    url: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: unknown,
  ): Promise<boolean> {
    setError("");
    const message = await sendAdminRequest(url, method, body);
    if (message) {
      setError(message);
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="text-sm font-semibold">
          {error}
        </p>
      ) : null}

      <form
        className="flex items-end gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await run(BASE, "POST", { name: newName })) setNewName("");
        }}
      >
        <div className="flex flex-1 flex-col">
          <label htmlFor="new-default-category" className="text-muted text-sm">
            New category
          </label>
          <input
            id="new-default-category"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            className="border-line bg-surface min-h-11 border px-3"
          />
        </div>
        <button
          type="submit"
          className="bg-accent text-surface min-h-11 px-4 font-semibold"
        >
          Add category
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {categories.map((category) => {
          const name = names[category.id] ?? category.name;
          const changed = name.trim() !== category.name;
          return (
            <li
              key={category.id}
              className="border-line flex flex-wrap items-center gap-2 border-b pb-2"
            >
              <input
                aria-label={`Name of ${category.name}`}
                value={name}
                onChange={(event) =>
                  setNames({ ...names, [category.id]: event.target.value })
                }
                className="border-line bg-surface min-h-11 flex-1 border px-3"
              />
              {category.isArchived ? (
                <span className="text-muted text-sm">Archived</span>
              ) : null}
              {changed ? (
                <button
                  type="button"
                  aria-label={`Save ${category.name}`}
                  onClick={() =>
                    run(`${BASE}/${category.id}`, "PATCH", { name })
                  }
                  className="border-primary text-primary min-h-11 border px-3 font-semibold"
                >
                  Save
                </button>
              ) : null}
              <button
                type="button"
                aria-label={`${category.isArchived ? "Restore" : "Archive"} ${category.name}`}
                onClick={() =>
                  run(`${BASE}/${category.id}`, "PATCH", {
                    isArchived: !category.isArchived,
                  })
                }
                className="border-primary text-primary min-h-11 border px-3 font-semibold"
              >
                {category.isArchived ? "Restore" : "Archive"}
              </button>
              <button
                type="button"
                aria-label={`Delete ${category.name}`}
                onClick={() => run(`${BASE}/${category.id}`, "DELETE")}
                className="border-line min-h-11 border px-3 font-semibold"
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
