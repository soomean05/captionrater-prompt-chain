"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createFlavor,
  updateFlavor,
  deleteFlavor,
  slugify,
} from "@/lib/db/flavors";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/supabase/current-user";

export async function createFlavorAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return { error: "Name is required" };
  if (!slugify(name)) return { error: "Please enter a valid flavor name." };
  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase, {
    errorMessage: "You must be logged in to create a humor flavor.",
  });

  const { data, error } = await createFlavor({ name, description, userId });
  if (error) return { error: error.message };
  revalidatePath("/flavors");
  revalidatePath("/dashboard");
  redirect(`/flavors/${data?.id}`);
}

export async function updateFlavorAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!id) return { error: "ID is required" };
  if (!name) return { error: "Name is required" };
  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);

  const { error } = await updateFlavor(id, { name, description, userId });
  if (error) return { error: error.message };
  revalidatePath("/flavors");
  revalidatePath(`/flavors/${id}`);
  redirect(`/flavors/${id}`);
}

export async function deleteFlavorAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "ID is required" };

  const { error } = await deleteFlavor(id);
  if (error) return { error: error.message };
  revalidatePath("/flavors");
  revalidatePath("/dashboard");
  redirect("/flavors");
}
