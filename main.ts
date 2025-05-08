import fs from "fs";
import path from "path";
import axios from "axios";
import targz from "targz";

import repositories from "./repositories.json";
import additionalFiles from "./additional.json";

// 出力ディレクトリのパス
const DIST_DIRECTORY = "./dist";

// アーカイブアイテムのインターフェース
// アーカイブをどこに展開するかの情報を持つ
interface ArchiveItem {
  sub: string; // サブディレクトリパス
  url: string; // ダウンロードURL
}

// 追加ファイルのインターフェース
// メインアーカイブに追加するファイルの情報を持つ
interface AdditionalItem {
  suffix: string; // ファイル名に追加するサフィックス
  archives: ArchiveItem[]; // 追加するアーカイブリスト
}

// 指定したURLからファイルをダウンロードする関数
// @param url ダウンロード元URL
// @param destinationPath 保存先パス
// @param force 強制ダウンロードフラグ（既存ファイルを上書き）
async function download(
  url: string,
  destinationPath: string,
  force = false
): Promise<void> {
  if (fs.existsSync(destinationPath) && !force) {
    console.log(`スキップ: ${url} のダウンロード`);
    return;
  }

  console.log(`ダウンロード中: ${url} → ${destinationPath}`);
  const response = await axios.get(url, { responseType: "arraybuffer" });
  fs.writeFileSync(destinationPath, Buffer.from(response.data, "binary"));
}

// ディレクトリを圧縮する関数
// @param sourcePath 圧縮元ディレクトリ
// @param destinationPath 圧縮先ファイルパス
async function compress(sourcePath: string, destinationPath: string) {
  return new Promise((resolve, reject) => {
    console.log(`圧縮中: ${sourcePath} → ${destinationPath}`);
    targz.compress({ src: sourcePath, dest: destinationPath }, resolve);
  });
}

// アーカイブを展開する関数
// @param sourcePath 展開元アーカイブパス
// @param destinationPath 展開先ディレクトリパス
async function extract(sourcePath: string, destinationPath: string) {
  return new Promise((resolve, reject) => {
    console.log(`展開中: ${sourcePath} → ${destinationPath}`);
    targz.decompress({ src: sourcePath, dest: destinationPath }, resolve);
  });
}

// メイン処理を行う関数
async function main() {
  // 結果格納用オブジェクト（パッケージ名とファイル名のマッピング）
  const resultPackages: { [packageName: string]: string } = {};
  // キャッシュを使用するかどうかのフラグ
  const useCache = process.argv.includes("--cache");

  // 出力ディレクトリが存在しない場合は作成
  if (!fs.existsSync(DIST_DIRECTORY)) fs.mkdirSync(DIST_DIRECTORY);

  // リポジトリごとの処理
  for (const repository of repositories.root) {
    // Windows 64bit向けのものだけを処理
    if (!repository.win64) continue;

    // ダウンロードURLの組み立て
    const downloadUrl =
      repository.url +
      repository.archive
        .replace("[VERSION]", repository.version)
        .replace("[OS]", "win64")
        .replace("[ARCH]", "");

    // ファイル名を取得してダウンロード先パスを組み立て
    const filename = path.basename(downloadUrl);
    const filePath = `${DIST_DIRECTORY}/${filename}`;
    resultPackages[repository.name] = filename;

    // ファイルをダウンロード
    await download(downloadUrl, filePath);

    // 追加ファイルの処理
    const additionalItem = (additionalFiles as any)[
      repository.name
    ] as AdditionalItem;
    if (!additionalItem) continue;

    // 新しいファイル名の組み立て（サフィックス付き）
    const newFilename = filename.replace(
      ".tar.gz",
      `${additionalItem.suffix}.tar.gz`
    );
    const newFilePath = `${DIST_DIRECTORY}/${newFilename}`;
    resultPackages[repository.name] = newFilename;

    // 一時ディレクトリのパス
    const tempDirectory = `${DIST_DIRECTORY}/temp/${additionalItem.suffix}`;

    if (!useCache) {
      // キャッシュを使わない場合、いったん一時ディレクトリを削除して再作成
      console.log(`一時ディレクトリを削除します`);
      fs.rmSync(tempDirectory, { recursive: true, force: true });
      fs.mkdirSync(tempDirectory, { recursive: true });

      // メインアーカイブを一時ディレクトリに展開
      await extract(filePath, tempDirectory);

      // 追加ファイルを処理
      for (const archive of additionalItem.archives) {
        const archiveFilename = path.basename(archive.url);
        const archiveFilePath = `${DIST_DIRECTORY}/temp/${archiveFilename}`;

        // 追加ファイルをダウンロード
        await download(archive.url, archiveFilePath, true);

        // アーカイブの種類によって処理を分岐
        if (
          archiveFilePath.endsWith(".tar.gz") ||
          archiveFilePath.endsWith(".zip")
        ) {
          // アーカイブの場合は展開
          await extract(archiveFilePath, `${tempDirectory}${archive.sub}`);
        } else {
          // 通常ファイルの場合はコピー
          console.log(
            `コピー中: ${archiveFilePath} → ${tempDirectory}${archive.sub}`
          );

          fs.copyFileSync(
            archiveFilePath,
            `${tempDirectory}${archive.sub}/${archiveFilename}`
          );
        }
      }
    } else {
      console.log(`スキップ: ${filePath} の展開（キャッシュ利用）`);
    }

    // 一時ディレクトリの内容を圧縮して新しいアーカイブを作成
    await compress(tempDirectory, newFilePath);
  }

  // 結果の出力
  console.log("------------------");
  console.log("------------------");
  console.log("dist 以下のファイルを以下にアップロードしてください (temp除く)");
  console.log(
    "https://github.com/n-air-app/native-deps/releases/tag/[指定タグ]"
  );

  console.log("------------------");
  console.log("package.json の dependencies を以下に変更してください");
  for (const packageName in resultPackages) {
    console.log(
      `"${packageName}": "https://github.com/n-air-app/native-deps/releases/download/[指定タグ]/${resultPackages[packageName]}",`
    );
  }
}

// メイン処理の実行
main()
  .then()
  .catch((error) => console.log(error));
