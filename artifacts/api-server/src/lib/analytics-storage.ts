import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export interface AnalyticsEventRecord {
  id: string;
  guestId: string;
  eventName: string;
  metadata: Record<string, unknown>;
  path: string;
  referrer: string;
  userAgent: string;
  deviceType: string;
  browserFamily: string;
  createdAt: string;
}

function getAnalyticsFilePath(): string {
  if (process.env.ANALYTICS_DATA_FILE) {
    return process.env.ANALYTICS_DATA_FILE;
  }
  const repoRoot = path.resolve(moduleDir, "..", "..", "..");
  return path.join(repoRoot, "data", "analytics-events.jsonl");
}

export async function appendAnalyticsEvent(
  input: Omit<AnalyticsEventRecord, "id" | "createdAt">,
): Promise<AnalyticsEventRecord> {
  const record: AnalyticsEventRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };

  const filePath = getAnalyticsFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

export async function readAnalyticsEvents(): Promise<AnalyticsEventRecord[]> {
  const filePath = getAnalyticsFilePath();
  try {
    const raw = await readFile(filePath, "utf8");
    if (!raw.trim()) return [];

    const events: AnalyticsEventRecord[] = [];
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        events.push(JSON.parse(trimmed) as AnalyticsEventRecord);
      } catch {
        // Skip malformed lines in beta storage.
      }
    }
    return events;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
