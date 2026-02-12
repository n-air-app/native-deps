# Native Dependencies

このリポジトリは、N-Air 用ネイティブ依存（obs-studio-node 関連）を更新し、
GitHub Releases 作成に必要な情報を出力するためのツールです。

## 目的

- Streamlabs Desktop の対象バージョンから `repositories.json` を取得
- win64 アセットを `dist` にダウンロード
- リリース作成に必要な情報（タグ名、Release notes、依存 URL）を出力

## 前提

```bash
npm install
```

## 操作順（実運用）

### 1) 対象の Streamlabs Desktop バージョンを決める

- [Streamlabs Desktop Releases](https://github.com/streamlabs/desktop/releases) で対象バージョン（例: `v1.19.6`）を確認

### 2) `streamlabs-version.txt` に対象バージョンを書く

```text
v1.19.6
```

> 引数で指定した場合は、実行時にこのファイルも更新されます。

### 3) スクリプトを実行する

- `streamlabs-version.txt` を使う場合:

```bash
npm run build
```

- 実行時にバージョンを直接指定する場合:

```bash
npm run build -- v1.19.6
# または
npx ts-node main.ts v1.19.6
```

### 4) 出力された情報を使ってリリースを作成する

実行後、以下が出力されます。

- タグ名（例: `osn0.25.56`）
- リリース先 URL（`https://github.com/n-air-app/native-deps/releases/tag/<tag>`）
- N-Air 側 `package.json` 用の dependencies 行
- Release notes 用 Markdown（library/version 表 + ElectronVersion/LibOBSVersion）

さらに以下のファイルが生成されます。

- `dist/`（アップロードするアセット）
- `repositories.json`（取得した依存定義）

### 5) Git タグを作成して push する

```bash
git tag osn0.25.56
git push origin osn0.25.56
```

※ タグ名は必ずスクリプト出力の値を使用してください。

### 6) GitHub Releases を作成する

- [n-air-app/native-deps/releases](https://github.com/n-air-app/native-deps/releases) で「Draft a new release」
- Tag に 5) で作ったタグを指定
- Title はタグ名に合わせる
- Description に、スクリプト出力の `Release notes として以下を追加してください` 以降を貼り付け
- `dist/` 内のファイルをすべて添付して Publish

### 7) N-Air 側の依存を更新する

- スクリプト出力の `package.json の dependencies を以下に変更してください` 以降を、N-Air 側 `package.json` に反映

## 出力の貼り付け先早見表

- `タグ <tag> を作成し...` → Git タグ名
- `.../releases/tag/<tag>` → リリース URL 確認
- `package.json の dependencies...` 以降 → N-Air 側 `package.json`
- `Release notes として以下を追加してください` 以降 → GitHub Release Description

## トラブルシューティング

### `repositories.json` の取得に失敗

- バージョン文字列が正しいか（例: `v1.19.6`）
- ネットワーク接続
- GitHub 側の一時的な障害

### コミット時に署名エラー

- ローカル署名鍵設定を確認
- 一時的に署名なしでコミットする場合:

```bash
git commit --no-gpg-sign
```
