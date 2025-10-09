import fs from "fs";
import path from "path";
import axios from "axios";

// 出力ディレクトリのパス
const DIST_DIRECTORY = "./dist";
const VERSION_FILE = "./streamlabs-version.txt";
const REPOSITORIES_FILE = "./repositories.json";

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

// Streamlabs Desktopのrepositories.jsonをダウンロードして更新する関数
async function updateRepositoriesJson(
  streamlabsVersion?: string
): Promise<any> {
  // バージョンが指定されていない場合はファイルから読み取り
  if (!streamlabsVersion) {
    if (fs.existsSync(VERSION_FILE)) {
      streamlabsVersion = fs.readFileSync(VERSION_FILE, "utf8").trim();
    } else {
      throw new Error(
        "バージョンが指定されておらず、streamlabs-version.txtも見つかりません"
      );
    }
  }

  const repositoriesUrl = `https://raw.githubusercontent.com/streamlabs/desktop/${streamlabsVersion}/scripts/repositories.json`;

  console.log(`Streamlabs Desktop バージョン: ${streamlabsVersion}`);
  console.log(`repositories.json をダウンロード中: ${repositoriesUrl}`);

  try {
    const response = await axios.get(repositoriesUrl, { responseType: "text" });
    const repositoriesData = JSON.parse(response.data);

    // repositories.jsonを更新
    fs.writeFileSync(
      REPOSITORIES_FILE,
      JSON.stringify(repositoriesData, null, 2)
    );
    console.log("repositories.json を更新しました");

    return repositoriesData;
  } catch (error) {
    console.error(`repositories.json の取得に失敗しました: ${error}`);
    // 既存のファイルがあれば読み込む
    if (fs.existsSync(REPOSITORIES_FILE)) {
      console.log("既存のrepositories.jsonを使用します");
      return JSON.parse(fs.readFileSync(REPOSITORIES_FILE, "utf8"));
    }
    throw error;
  }
}

// obs-studio-nodeのワークフローファイルからenvセクションを取得して出力する関数
async function fetchAndDisplayObsStudioNodeEnv(version: string): Promise<void> {
  console.log(`### Reference from streamlabs/obs-studio-node ${version}`);
  console.log(`https://github.com/streamlabs/obs-studio-node/tree/${version}`);
  console.log("");

  console.log("osn|version");
  console.log("---|---");

  const workflowUrl = `https://raw.githubusercontent.com/streamlabs/obs-studio-node/${version}/.github/workflows/main.yml`;

  try {
    const response = await axios.get(workflowUrl, { responseType: "text" });
    const workflowContent = response.data;

    // テキストからLibOBSVersionを抽出
    const lines = workflowContent.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim() as string;
      if (
        trimmedLine.startsWith("LibOBSVersion:") ||
        trimmedLine.startsWith("ElectronVersion:")
      ) {
        const ar = trimmedLine.split(":").map((item) => item.trim());
        console.log(`${ar[0]}|${ar[1]}`);
      }
    }
  } catch (error) {
    console.error(`ワークフローファイルの取得に失敗しました: ${error}`);
  }
  console.log("");
}

// メイン処理を行う関数
async function main() {
  // コマンドライン引数からバージョンを取得
  const args = process.argv.slice(2);
  let streamlabsVersion = args.length > 0 ? args[0] : undefined;

  if (streamlabsVersion) {
    console.log(`指定されたバージョン: ${streamlabsVersion}`);
    // バージョンファイルを更新
    fs.writeFileSync(VERSION_FILE, streamlabsVersion);
  } else {
    // バージョンが指定されていない場合はファイルから読み取り
    if (fs.existsSync(VERSION_FILE)) {
      streamlabsVersion = fs.readFileSync(VERSION_FILE, "utf8").trim();
      console.log(`ファイルから読み取ったバージョン: ${streamlabsVersion}`);
    } else {
      throw new Error(
        "バージョンが指定されておらず、streamlabs-version.txtも見つかりません"
      );
    }
  }

  // repositories.jsonを更新
  const repositories = await updateRepositoriesJson(streamlabsVersion);

  // obs-studio-nodeのバージョンを取得（指定タグとして使用）
  const obsStudioNode = repositories.root.find(
    (repo: any) => repo.name === "obs-studio-node"
  );
  const tagVersion = obsStudioNode
    ? `osn${obsStudioNode.version}`
    : "[指定タグ]";

  // 結果格納用オブジェクト（パッケージ名とファイル名のマッピング）
  const resultPackages: { [packageName: string]: string } = {};

  // distディレクトリが存在する場合は削除
  if (fs.existsSync(DIST_DIRECTORY))
    fs.rmSync(DIST_DIRECTORY, { recursive: true, force: true });

  fs.mkdirSync(DIST_DIRECTORY);

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
  console.log(
    `タグ ${tagVersion} を作成しReleasesとし、作成される以下URLにdist以下のファイルをアップロードしてください`
  );
  console.log(
    `https://github.com/n-air-app/native-deps/releases/tag/${tagVersion}`
  );

  console.log("------------------");
  console.log("package.json の dependencies を以下に変更してください");
  for (const packageName in resultPackages) {
    console.log(
      `"${packageName}": "https://github.com/n-air-app/native-deps/releases/download/${tagVersion}/${resultPackages[packageName]}",`
    );
  }

  // repositories.jsonの各項目の名前とバージョンを出力
  console.log("------------------");
  console.log("Release notes として以下を追加してください");
  console.log("");

  console.log(`### Reference from streamlabs/desktop ${streamlabsVersion}`);
  console.log(
    `https://github.com/streamlabs/desktop/tree/${streamlabsVersion}`
  );
  console.log("");
  console.log("library|version");
  console.log("---|---");
  for (const repository of repositories.root) {
    console.log(`${repository.name}|${repository.version}`);
  }
  console.log("");

  // obs-studio-nodeのワークフローファイルからenvセクションを取得・表示
  if (obsStudioNode) {
    await fetchAndDisplayObsStudioNodeEnv(obsStudioNode.version);
  }
} // メイン処理の実行
main()
  .then()
  .catch((error) => console.log(error));
