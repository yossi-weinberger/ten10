/** Local eval run output. Not committed; see fixtures/out/ in .gitignore. */

const OUT_DIR = new URL("./fixtures/out/", import.meta.url);

const RECEIPTS_UNSET =
  "AI_RECEIPTS_DIR is not set. Point it at a local copy of the receipts eval set (same layout as the old fixtures/receipts folder).";

export function evalOutName(pathOrName: string): string {
  const name = pathOrName.replaceAll("\\", "/").split("/").pop() ?? "";
  if (!name || name === "." || name === "..") {
    throw new Error("pass a file name, not a path");
  }
  return name;
}

export function evalOutFile(pathOrName: string): URL {
  return new URL(evalOutName(pathOrName), OUT_DIR);
}

export async function writeEvalOut(pathOrName: string, content: string): Promise<URL> {
  await Deno.mkdir(OUT_DIR, { recursive: true });
  const file = evalOutFile(pathOrName);
  await Deno.writeTextFile(file, content);
  return file;
}

export async function readEvalOut(pathOrName: string): Promise<string> {
  const name = evalOutName(pathOrName);
  try {
    return await Deno.readTextFile(evalOutFile(name));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        `missing eval output fixtures/out/${name}. Run the eval first; outputs are not committed.`,
      );
    }
    throw error;
  }
}

export function receiptsEvalDir(): string {
  const dir = Deno.env.get("AI_RECEIPTS_DIR")?.trim() ?? "";
  if (!dir) throw new Error(RECEIPTS_UNSET);
  try {
    const stat = Deno.statSync(dir);
    if (!stat.isDirectory) {
      throw new Error(`${RECEIPTS_UNSET} (${dir} is not a directory.)`);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`${RECEIPTS_UNSET} (${dir} does not exist.)`);
    }
    throw error;
  }
  return dir.replace(/[/\\]+$/, "");
}

export function receiptsEvalPath(...parts: string[]): string {
  const relative = parts.map((part) => part.replaceAll("\\", "/")).join("/");
  return `${receiptsEvalDir()}/${relative}`;
}
