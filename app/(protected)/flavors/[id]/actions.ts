"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getFlavor,
  updateFlavor,
  deleteFlavor,
} from "@/lib/db/flavors";
import {
  createStep,
  updateStep,
  deleteStep,
  reorderStep,
  listStepsForFlavor,
} from "@/lib/db/steps";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/supabase/current-user";

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
  revalidatePath("/flavors", "layout");
  revalidatePath("/flavors");
  revalidatePath(`/flavors/${id}`);
  revalidatePath("/test");
  redirect(`/flavors/${id}`);
}

export async function deleteFlavorAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "ID is required" };

  const { error } = await deleteFlavor(id);
  if (error) return { error: error.message };
  revalidatePath("/flavors", "layout");
  revalidatePath("/flavors");
  revalidatePath("/dashboard");
  revalidatePath("/test");
  redirect("/flavors");
}

export async function createStepAction(formData: FormData) {
  const flavorId = String(formData.get("humor_flavor_id") ?? "");
  const stepText = String(formData.get("step_text") ?? "").trim();
  if (!flavorId) return { error: "Flavor ID is required" };
  if (!stepText) return { error: "Step text is required" };
  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);

  const { data: steps } = await listStepsForFlavor(flavorId);
  const nextOrderBy = steps?.length
    ? Math.max(...steps.map((s) => s.order_by ?? 0)) + 1
    : 1;

  const { error } = await createStep({
    humor_flavor_id: flavorId,
    orderBy: nextOrderBy,
    llmUserPrompt: stepText,
    userId,
  });
  if (error) return { error: error.message };
  revalidatePath("/flavors", "layout");
  revalidatePath("/flavors");
  revalidatePath(`/flavors/${flavorId}`);
  revalidatePath("/test");
}

export async function updateStepAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const stepText = String(formData.get("step_text") ?? "").trim();
  const orderByValue = String(formData.get("order_by") ?? "").trim();
  const flavorId = String(formData.get("humor_flavor_id") ?? "");
  if (!id) return { error: "ID is required" };
  const supabase = await createClient();
  const userId = await getCurrentUserId(supabase);
  const orderBy = Number.parseInt(orderByValue, 10);

  const { error } = await updateStep(id, {
    llmUserPrompt: stepText || undefined,
    orderBy: Number.isFinite(orderBy) ? orderBy : undefined,
    userId,
  });
  if (error) return { error: error.message };
  revalidatePath("/flavors", "layout");
  revalidatePath("/flavors");
  revalidatePath(`/flavors/${flavorId}`);
  revalidatePath("/test");
}

export async function deleteStepAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const flavorId = String(formData.get("humor_flavor_id") ?? "");
  if (!id) return { error: "ID is required" };

  const { error } = await deleteStep(id);
  if (error) return { error: error.message };
  revalidatePath("/flavors", "layout");
  revalidatePath("/flavors");
  revalidatePath(`/flavors/${flavorId}`);
  revalidatePath("/test");
}

export async function moveStepUpAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "ID is required" };
  const { error } = await reorderStep(id, "up");
  if (error) return { error: error.message };
  const { data: step } = await import("@/lib/db/steps").then((m) => m.getStep(id));
  if (step) {
    revalidatePath("/flavors", "layout");
    revalidatePath("/flavors");
    revalidatePath(`/flavors/${step.humor_flavor_id}`);
    revalidatePath("/test");
  }
}

export async function moveStepDownAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "ID is required" };
  const { error } = await reorderStep(id, "down");
  if (error) return { error: error.message };
  const { data: step } = await import("@/lib/db/steps").then((m) => m.getStep(id));
  if (step) {
    revalidatePath("/flavors", "layout");
    revalidatePath("/flavors");
    revalidatePath(`/flavors/${step.humor_flavor_id}`);
    revalidatePath("/test");
  }
}
