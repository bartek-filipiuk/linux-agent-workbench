import { z } from "zod";

export const ModelSelection = z.object({
  model: z.string().min(1).max(200).optional(),
  effort: z.string().regex(/^[a-z]+$/).max(32).optional(),
}).refine(s => !s.effort || !!s.model, "Choose a model before setting reasoning effort");
export type ModelSelection = z.infer<typeof ModelSelection>;

export const CodexModel = z.object({
  model: z.string().min(1),
  displayName: z.string(),
  hidden: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  defaultReasoningEffort: z.string(),
  supportedReasoningEfforts: z.array(z.object({ reasoningEffort: z.string(), description: z.string() })),
  inputModalities: z.array(z.string()).optional(),
});
export type CodexModel = z.infer<typeof CodexModel>;
export type ModelCatalog = { provider: "codex" | "openai"; configuredModel: string; jevAvailable?: boolean; models: CodexModel[] };

export function validateModelSelection(selection: ModelSelection, models: CodexModel[]): void {
  ModelSelection.parse(selection);
  if (!selection.model) return;
  const model = models.find(m => m.model === selection.model);
  if (!model) throw new Error("Selected model is unavailable. Refresh the model list and choose another model.");
  if (selection.effort && !model.supportedReasoningEfforts.some(e => e.reasoningEffort === selection.effort)) {
    throw new Error("This model does not support the selected reasoning effort. Choose another effort.");
  }
}
