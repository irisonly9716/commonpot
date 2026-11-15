"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { sendRequest } from "./api-call";

type Category = { id: string; name: string; isArchived: boolean };

const buttonClass =
  "min-h-11 border border-primary px-3 font-semibold text-primary";

/**
 * The group's categories, for admins: add, rename and archive. An archived
 * category stays on the expenses that already use it but is not offered for new
 * ones, so nothing is deleted.
 */
export function CategoryList({
  groupId,
  categories,
}: {
  groupId: string;
  categories: Category[];
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const base = `/api/v1/groups/${groupId}/categories`;

  async function run(
    url: string,
    method: "POST" | "PATCH",
    body: unknown,
  ): Promise<boolean> {
    setError("");
    const result = await sendRequest(url, method, body);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <section
      aria-labelledby="categories-heading"
      className="flex flex-col gap-3"
    >
      <h2 id="categories-heading" className="text-lg font-semibold">
        Categories
      </h2>
      {error ? (
        <p role="alert" className="text-sm font-semibold">
          {error}
        </p>
      ) : null}

      <form
        className="flex items-end gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await run(base, "POST", { name: newName })) setNewName("");
        }}
      >
        <div className="flex flex-1 flex-col">
          <label htmlFor="new-category" className="text-muted text-sm">
            New category
          </label>
          <input
            id="new-category"
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
              className="border-line flex flex-wrap items-end gap-2 border-b pb-2"
            >
              <div className="flex min-w-48 flex-1 flex-col">
                <label
                  htmlFor={`category-name-${category.id}`}
                  className="text-muted text-sm"
                >
                  Name of {category.name}
                </label>
                <input
                  id={`category-name-${category.id}`}
                  value={name}
                  onChange={(event) =>
                    setNames({ ...names, [category.id]: event.target.value })
                  }
                  className="border-line bg-surface min-h-11 border px-3"
                />
              </div>
              {category.isArchived ? (
                <span className="text-muted text-sm">Archived</span>
              ) : null}
              {changed ? (
                <button
                  type="button"
                  className={buttonClass}
                  aria-label={`Save ${category.name}`}
                  onClick={() =>
                    run(`${base}/${category.id}`, "PATCH", { name })
                  }
                >
                  Save
                </button>
              ) : null}
              <button
                type="button"
                className={buttonClass}
                aria-label={`${category.isArchived ? "Restore" : "Archive"} ${category.name}`}
                onClick={() =>
                  run(`${base}/${category.id}`, "PATCH", {
                    isArchived: !category.isArchived,
                  })
                }
              >
                {category.isArchived ? "Restore" : "Archive"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
