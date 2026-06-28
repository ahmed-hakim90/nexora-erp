"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form";
import type { z } from "zod";

export function useEnterpriseForm<TValues extends FieldValues>(
  schema: z.ZodType<TValues, TValues>,
  defaultValues?: DefaultValues<TValues>,
): UseFormReturn<TValues> {
  return useForm<TValues>({
    defaultValues,
    resolver: zodResolver(schema) as Resolver<TValues>,
  });
}
