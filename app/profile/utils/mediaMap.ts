import { Prisma } from "@/lib/generated/prisma";

export default function mapJson<T>(value: Prisma.JsonValue | null): T | undefined {
  if (value && typeof value === "object") {
    return value as T;
  }
  return undefined;
}