import fs from "fs";
import path from "path";
import axios from "axios";

import repositories from "./repositories.json";

// 出力ディレクトリのパス
const DIST_DIRECTORY = "./dist";

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
  fs.writeFileSync(destinationPath, new Uint8Array(response.data));
}

// メイン処理を行う関数
async function main() {
  // 結果格納用オブジェクト（パッケージ名とファイル名のマッピング）
  const resultPackages: { [packageName: string]: string } = {};

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
  }

  // 結果の出力
  console.log("------------------");
  console.log("------------------");
  console.log("dist 以下のファイルを以下にアップロードしてください");
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
