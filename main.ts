import fs from "fs";
import path from "path";
import axios from "axios";
import targz from "targz";

import repo from "./repositories.json";
import additional from "./additional.json";

const dist = "./dist";

interface AdditionalItem {
  suffix: string;
  sub: string;
  url: string;
}

async function download(url: string, path: string): Promise<void> {
  console.log(`download ${url} ${path}`);
  if (fs.existsSync(path)) {
    console.log("skip download");
    return;
  }

  const r = await axios.get(url, { responseType: "arraybuffer" });
  fs.writeFileSync(path, Buffer.from(r.data, "binary"));
}

async function compress(src: string, dest: string) {
  return new Promise((resolve, reject) => {
    console.log(`compress ${src} ${dest}`);
    targz.compress({ src, dest }, resolve);
  });
}

async function extract(src: string, dest: string) {
  return new Promise((resolve, reject) => {
    console.log(`extract ${src} ${dest}`);
    targz.decompress({ src, dest }, resolve);
  });
}

async function main() {
  const result: { [name: string]: string } = {};

  if (!fs.existsSync(dist)) fs.mkdirSync(dist);

  for (const r of repo.root) {
    if (!r.win64) continue;
    const url =
      r.url +
      r.archive.replace("[VERSION]", r.version).replace("[OS]", "win64");
    console.log(url);

    const fn = path.basename(url);
    const file = `${dist}/${fn}`;
    result[r.name] = fn;

    await download(url, file);

    const addItem = (additional as any)[r.name] as AdditionalItem;
    if (addItem) {
      const nFn = fn.replace(".tar.gz", `${addItem.suffix}.tar.gz`);
      const nFile = `${dist}/${nFn}`;
      result[r.name] = nFn;
      if (fs.existsSync(nFile)) {
        console.log("skip recompress");
      } else {
        const temp = `${dist}/temp`;
        if (fs.existsSync(temp))
          fs.rmSync(temp, { recursive: true, force: true });
        fs.mkdirSync(temp);

        await extract(file, temp);

        const aFn = path.basename(addItem.url);
        const aFile = `${dist}/${aFn}`;
        await download(addItem.url, aFile);
        await extract(aFile, `${temp}${addItem.sub}`);

        await compress(temp, nFile);
        fs.rmSync(temp, { recursive: true, force: true });
      }
    }
  }

  console.log("------------------");
  console.log("------------------");
  console.log("dist 以下のファイルを以下にuploadしてください");
  console.log("https://github.com/n-air-app/native-deps/releases/tag/assets");

  console.log("------------------");
  console.log("package.json の dependencies を以下に変更してください");
  for (const k in result) {
    console.log(
      `"${k}": "https://github.com/n-air-app/native-deps/releases/download/assets/${result[k]}",`
    );
  }
}

main()
  .then()
  .catch((e) => console.log(e));
