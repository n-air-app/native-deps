import fs from "fs";
import path from "path";
import axios from "axios";
import targz from "targz";

import repo from "./repositories.json";
import additional from "./additional.json";

const dist = "./dist";

interface ArchiveItem {
  sub: string;
  url: string;
}

interface AdditionalItem {
  suffix: string;
  archives: ArchiveItem[];
}

async function download(
  url: string,
  path: string,
  force = false
): Promise<void> {
  if (fs.existsSync(path) && !force) {
    console.log(`skip download ${url}`);
    return;
  }

  console.log(`download ${url} to ${path}`);
  const r = await axios.get(url, { responseType: "arraybuffer" });
  fs.writeFileSync(path, Buffer.from(r.data, "binary"));
}

async function compress(src: string, dest: string) {
  return new Promise((resolve, reject) => {
    console.log(`compress ${src} to ${dest}`);
    targz.compress({ src, dest }, resolve);
  });
}

async function extract(src: string, dest: string) {
  return new Promise((resolve, reject) => {
    console.log(`extract ${src} to ${dest}`);
    targz.decompress({ src, dest }, resolve);
  });
}

async function main() {
  const result: { [name: string]: string } = {};
  const useCache = process.argv.includes("--cache");

  if (!fs.existsSync(dist)) fs.mkdirSync(dist);

  for (const r of repo.root) {
    if (!r.win64) continue;
    const url =
      r.url +
      r.archive
        .replace("[VERSION]", r.version)
        .replace("[OS]", "win64")
        .replace("[ARCH]", "");
    //    console.log(url);

    const fn = path.basename(url);
    const file = `${dist}/${fn}`;
    result[r.name] = fn;

    await download(url, file);

    const addItem = (additional as any)[r.name] as AdditionalItem;
    if (!addItem) continue;

    const nFn = fn.replace(".tar.gz", `${addItem.suffix}.tar.gz`);
    const nFile = `${dist}/${nFn}`;
    result[r.name] = nFn;

    const temp = `${dist}/temp/${addItem.suffix}`;
    if (!useCache) {
      fs.rmSync(temp, { recursive: true, force: true });
      fs.mkdirSync(temp, { recursive: true });
      await extract(file, temp);

      for (const a of addItem.archives) {
        const aFn = path.basename(a.url);
        const aFile = `${dist}/temp/${aFn}`;
        await download(a.url, aFile, true);
        if (aFile.endsWith(".tar.gz") || aFile.endsWith(".zip")) {
          await extract(aFile, `${temp}${a.sub}`);
        } else {
          fs.copyFileSync(aFile, `${temp}${a.sub}`);
        }
      }
    } else {
      console.log(`skip extract ${file}`);
    }
    await compress(temp, nFile);
  }

  console.log("------------------");
  console.log("------------------");
  console.log("dist 以下のファイルを以下にuploadしてください (temp除く)");
  console.log(
    "https://github.com/n-air-app/native-deps/releases/tag/[指定タグ]"
  );

  console.log("------------------");
  console.log("package.json の dependencies を以下に変更してください");
  for (const k in result) {
    console.log(
      `"${k}": "https://github.com/n-air-app/native-deps/releases/download/[指定タグ]/${result[k]}",`
    );
  }
}

main()
  .then()
  .catch((e) => console.log(e));
