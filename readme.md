# Native Dependencies

このリポジトリは、N-Air アプリケーション用のネイティブ依存関係（obs-studio-node 関連）を管理するためのツールです。

## 概要

このツールは、repositories.json にて指定されたネイティブモジュールをダウンロードします。

## 使い方

### 基本的な使用方法

```bash
# 依存関係をインストール
npm install

# ビルド実行（モジュールのダウンロード）
npm run build
```

基本的に OBS Studio Node (OSN) のバージョン変更時に処理してください。

### クリーン実行

クリーンビルドを行いたい場合は、以下の手順で実行してください：

```bash
# distディレクトリを削除
rm -rf dist

# ビルド実行
npm run build
```

## 設定ファイル

### repositories.json

このファイルには、ダウンロードするネイティブモジュールのリポジトリ情報が含まれています。
以下の形式で定義されています：

```json
{
  "root": [
    {
      "name": "モジュール名",
      "url": "ダウンロード元のURL",
      "archive": "アーカイブファイル名のパターン",
      "version": "バージョン番号",
      "win64": true,
      "osx": false
    }
  ]
}
```

Streamlabs Desktop の repositories.json ファイルを参照して定期的に更新してください：
https://github.com/streamlabs/desktop/blob/master/scripts/repositories.json

## リリース手順

1. OSN バージョンが変更された場合は、新しいタグを切ってください

   ```bash
   # 例: osn0.y.z というタグを作成する場合
   git tag osn0.y.z
   git push origin osn0.y.z
   ```

2. GitHub 上でリリースを作成します

   - [n-air-app/native-deps](https://github.com/n-air-app/native-deps/releases)にアクセス
   - 「Draft a new release」ボタンをクリック
   - 作成したタグを選択（または新しいタグを作成）
   - リリースタイトルと説明文を入力
   - 「Publish release」ボタンを押さずに一時保存

3. `dist` ディレクトリ内のファイルをリリースページにアップロードします

   - 先ほど作成したドラフトリリースページで「Attach binaries by dropping them here or selecting them」エリアに`dist`内のファイルをドラッグ＆ドロップするか、クリックして選択します
   - すべてのバイナリのアップロードが完了したら「Publish release」ボタンをクリックして公開します

4. n-air リポジトリの `package.json` の dependencies を更新します

   - ビルド後のコンソール出力に表示される依存関係の記述をコピー
   - n-air プロジェクトの`package.json`の該当箇所を更新
   - 例:
     ```json
     "dependencies": {
       "obs-studio-node": "https://github.com/n-air-app/native-deps/releases/download/osn0.y.z/obs-studio-node-0.y.z-release-win64.tar.gz",
       // その他の依存関係
     }
     ```

5. 必要に応じて n-air プロジェクト側でパッケージを再インストールする
   ```bash
   npm ci
   # または
   yarn install
   ```

## リリース判断

基本的に Streamlabs Desktop が配布ページにてリリースされたバージョンのみを対象とします。

- https://streamlabs.com/
- https://github.com/streamlabs/desktop

リポジトリから該当バージョンのタグより `/scripts/repositories.json` を調査します。
アップデートの場合、ここにある repositories.json を更新します。

ここに記載されている obs-studio-node を利用しているバージョンを参照し：

https://github.com/streamlabs/obs-studio-node

こちらのリポジトリから該当タグより `/.github/workflows/main.yml` を調査します。

ここにある LibOBSVersion が OBS Studio で用いられているバージョンとなります。

リビジョンは毎回異なる可能性が高いので基本的にスルーし、メジャーおよびマイナーで特記事項がある場合に検討対象とします。

N-Air として使用する判断を行った場合、こちらのアップデートを行い、該当名のタグ付け＆リリースを行い、アセットにバイナリを添付します。
