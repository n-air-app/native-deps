import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, execSync } from "node:child_process";

type ParsedOutput = {
  tag: string;
  releaseBody: string;
};

const OWNER = "n-air-app";
const REPO = "native-deps";
const DIST_DIRECTORY = "./dist";
const REPO_SLUG = `${OWNER}/${REPO}`;
const HANDOFF_FILE = "release-handoff.txt";
const REPOSITORIES_FILE = "./repositories.json";

function runMainScript(streamlabsVersion?: string): string {
  const command = streamlabsVersion
    ? `npx ts-node main.ts ${streamlabsVersion}`
    : "npx ts-node main.ts";

  console.log(`[run] ${command}`);
  return execSync(command, {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
  });
}

function parseMainOutput(output: string): ParsedOutput {
  const tagMatch = output.match(/タグ\s+([^\s]+)\s+を作成/);
  if (!tagMatch) {
    throw new Error("main.ts の出力からタグ名を抽出できませんでした");
  }

  const releaseMarker = "Release notes として以下を追加してください";
  const markerIndex = output.indexOf(releaseMarker);
  if (markerIndex < 0) {
    throw new Error("main.ts の出力から Release notes セクションを抽出できませんでした");
  }

  const releaseSection = output.slice(markerIndex + releaseMarker.length);
  const dependenciesRecapMarker =
    "package.json の dependencies を以下に変更してください（再掲）";
  const releaseSectionEnd = releaseSection.indexOf(dependenciesRecapMarker);
  const releaseBody = (
    releaseSectionEnd >= 0
      ? releaseSection.slice(0, releaseSectionEnd)
      : releaseSection
  )
    .trim()
    .replace(/^\n+/, "");

  return {
    tag: tagMatch[1],
    releaseBody,
  };
}

function buildDependenciesBlock(tag: string): string {
  if (!fs.existsSync(REPOSITORIES_FILE)) {
    throw new Error(`repositories.json が見つかりません: ${REPOSITORIES_FILE}`);
  }

  const repositories = JSON.parse(fs.readFileSync(REPOSITORIES_FILE, "utf8")) as {
    root: Array<{
      name: string;
      url: string;
      archive: string;
      version: string;
      win64?: boolean;
    }>;
  };

  const lines: string[] = [];
  for (const repository of repositories.root) {
    if (!repository.win64) continue;

    const downloadUrl =
      repository.url +
      repository.archive
        .replace("[VERSION]", repository.version)
        .replace("[OS]", "win64")
        .replace("[ARCH]", "");

    const filename = path.basename(downloadUrl);
    lines.push(
      `"${repository.name}": "https://github.com/n-air-app/native-deps/releases/download/${tag}/${filename}",`
    );
  }

  return lines.join("\n");
}

function saveReleaseHandoff(parsed: ParsedOutput, dependenciesBlock: string): string {
  if (!fs.existsSync(DIST_DIRECTORY)) {
    fs.mkdirSync(DIST_DIRECTORY, { recursive: true });
  }

  const handoffPath = path.join(DIST_DIRECTORY, HANDOFF_FILE);
  const handoffText = [
    `tag: ${parsed.tag}`,
    "",
    "n air の package.json の dependencies を以下に変更してください",
    dependenciesBlock,
    "",
    "Release notes として以下を追加してください",
    "",
    parsed.releaseBody,
    "",
  ].join("\n");

  fs.writeFileSync(handoffPath, handoffText, "utf8");
  return handoffPath;
}

function printReleaseHandoff(handoffPath: string): void {
  console.log("------------------");
  console.log(`[info] ${handoffPath}`);
  console.log(fs.readFileSync(handoffPath, "utf8"));
}

function printDependenciesForNair(dependenciesBlock: string): void {
  console.log("------------------");
  console.log("n air の package.json の dependencies を以下に変更してください");
  console.log(dependenciesBlock);
  console.log("------------------");
}

function runGh(args: string[]): string {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  }).trim();
}

function ensureGhAuth(): void {
  try {
    runGh(["auth", "status", "-h", "github.com"]);
  } catch {
    throw new Error(
      "gh の認証が必要です。`gh auth login` を実行してから再試行してください"
    );
  }
}

function findReleaseByTag(tag: string): string | null {
  try {
    const url = runGh([
      "release",
      "view",
      tag,
      "--repo",
      REPO_SLUG,
      "--json",
      "url",
      "--jq",
      ".url",
    ]);
    return url;
  } catch {
    return null;
  }
}

function createDraftRelease(tag: string, body: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "native-deps-release-"));
  const notesPath = path.join(tempDir, "release-notes.md");
  fs.writeFileSync(notesPath, body, "utf8");

  try {
    runGh([
      "release",
      "create",
      tag,
      "--repo",
      REPO_SLUG,
      "--title",
      tag,
      "--notes-file",
      notesPath,
      "--draft",
    ]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  return runGh([
    "release",
    "view",
    tag,
    "--repo",
    REPO_SLUG,
    "--json",
    "url",
    "--jq",
    ".url",
  ]);
}

function uploadAsset(tag: string, filePath: string): void {
  const fileName = path.basename(filePath);
  runGh(["release", "upload", tag, filePath, "--repo", REPO_SLUG, "--clobber"]);

  console.log(`uploaded: ${fileName}`);
}

function uploadDistAssets(tag: string): void {
  if (!fs.existsSync(DIST_DIRECTORY)) {
    throw new Error(`dist ディレクトリが存在しません: ${DIST_DIRECTORY}`);
  }

  const assetPaths = fs
    .readdirSync(DIST_DIRECTORY)
    .map((name) => path.join(DIST_DIRECTORY, name))
    .filter((entryPath) => fs.statSync(entryPath).isFile());

  if (assetPaths.length === 0) {
    throw new Error("dist にアップロード対象ファイルがありません");
  }

  for (const assetPath of assetPaths) {
    uploadAsset(tag, assetPath);
  }

  if (fs.existsSync(REPOSITORIES_FILE) && fs.statSync(REPOSITORIES_FILE).isFile()) {
    uploadAsset(tag, REPOSITORIES_FILE);
  }
}

async function main(): Promise<void> {
  const streamlabsVersion = process.argv[2];

  const output = runMainScript(streamlabsVersion);
  const parsed = parseMainOutput(output);
  const dependenciesBlock = buildDependenciesBlock(parsed.tag);
  const handoffPath = saveReleaseHandoff(parsed, dependenciesBlock);
  console.log(`[info] release handoff saved: ${handoffPath}`);
  ensureGhAuth();

  const existing = findReleaseByTag(parsed.tag);
  if (existing) {
    console.log(`[skip] ${existing}`);
    printReleaseHandoff(handoffPath);
    printDependenciesForNair(dependenciesBlock);
    console.log(`[done] 既存のDraft releaseがあります。以下URLで内容を確認してリリースしてください\n${existing}`);
    return;
  }

  const releaseUrl = createDraftRelease(parsed.tag, parsed.releaseBody);
  console.log(`[created] ${releaseUrl}`);

  uploadDistAssets(parsed.tag);
  printReleaseHandoff(handoffPath);
  printDependenciesForNair(dependenciesBlock);
  console.log(`[done] Draft release を作成しました。以下URLで内容を確認してリリースしてください\n${releaseUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
