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

変更したら、いつ更新したか追えるようにコミットしておくのを推奨します。

### 3) 推奨フロー: `npm run release` で Draft Release まで自動作成する

`main.ts` の処理（ダウンロード・情報生成）を実行したうえで、GitHub の Draft Release を作成し、`dist` のアセットをアップロードします。

```bash
# 事前に gh でログイン（repo 権限が必要）
gh auth login

# streamlabs-version.txt を使う
npm run release

# バージョンを直接指定
npm run release -- v1.19.6
```

- 指定タグの Release ページがすでに存在する場合は自動で `skip` します。
- Release の Description は `main.ts` の出力（Release notes セクション）を使用します。
- 自動作成される Release はデフォルトで Draft です（内容確認後に Publish）。
- `dist` のアセットに加えて、`repositories.json` も Release asset としてアップロードします。
- このフローでは、**Git タグを手動で作成・push する必要はありません**。

### 4) N-Air 側の依存を更新する

- 実行結果ファイル（`dist/release-handoff.txt`）またはターミナルに表示される
	`package.json の dependencies を以下に変更してください` 以降を、N-Air 側 `package.json` に反映

例（`dist/release-handoff.txt` から貼り付け）:

```json
{
	"dependencies": {
		"obs-studio-node": "https://github.com/n-air-app/native-deps/releases/download/osn0.25.70/osn-0.25.70-release-win64.tar.gz",
		"node-libuiohook": "https://github.com/n-air-app/native-deps/releases/download/osn0.25.70/node-libuiohook-1.1.17-win64.tar.gz"
	}
}
```

---

### （参考）手動フロー: `main.ts` だけ実行して自分で Release を作る場合

#### A) スクリプトを実行する

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

#### B) 出力された情報を使ってリリースを作成する

実行後、以下が出力されます。

- タグ名（例: `osn0.25.56`）
- リリース先 URL（`https://github.com/n-air-app/native-deps/releases/tag/<tag>`）
- Release notes 用 Markdown（library/version 表 + ElectronVersion/LibOBSVersion）

さらに以下のファイルが生成されます。

- `dist/`（アップロードするアセット）
- `repositories.json`（取得した依存定義）

#### C) Git タグを作成して push する

```bash
git tag osn0.25.56
git push origin osn0.25.56
```

※ タグ名は必ずスクリプト出力の値を使用してください。

#### D) GitHub Releases を作成する

- [n-air-app/native-deps/releases](https://github.com/n-air-app/native-deps/releases) で「Draft a new release」
- Tag に C) で作ったタグを指定
- Title はタグ名に合わせる
- Description に、スクリプト出力の `Release notes として以下を追加してください` 以降を貼り付け
- `dist/` 内のファイルをすべて添付して Publish

## 出力の貼り付け先早見表

- `タグ <tag> を作成し...` → Git タグ名
- `.../releases/tag/<tag>` → リリース URL 確認
- `package.json の dependencies...` 以降（`npm run release` 実行時）→ N-Air 側 `package.json`
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
