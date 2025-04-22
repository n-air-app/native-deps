# Native Dependencies

このリポジトリは、N-Air アプリケーション用のネイティブ依存関係（モジュール）を管理するためのツールです。

## 概要

このツールは、指定されたリポジトリからネイティブモジュールをダウンロードし、必要に応じて追加ファイルを組み込んで再パッケージングします。

## 使い方

### 基本的な使用方法

```bash
# 依存関係をインストール
npm install

# ビルド実行（モジュールのダウンロードと再パッケージング）
npm run build
```

基本的に OBS Studio Node (OSN) のバージョン変更時や追加 DLL の更新時に処理してください。

### キャッシュの活用

圧縮前にファイルを編集したい場合は、一旦処理した後に以下のコマンドを実行してください：

```bash
npm run cache
```

これにより、`temp` ディレクトリに展開したファイルを再ダウンロードせずに圧縮します。

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
      "win64": true/false,
      "osx": true/false
    },
    ...
  ]
}
```

Streamlabs Desktop の repositories.json ファイルを参照して定期的に更新してください：
https://github.com/streamlabs/desktop/blob/master/scripts/repositories.json

### additional.json

このファイルには、ダウンロードしたアーカイブに追加するファイルの情報が含まれています。
以下の形式で定義されています：

```json
{
  "モジュール名": {
    "suffix": "ファイル名に追加するサフィックス",
    "archives": [
      {
        "sub": "展開先のサブディレクトリパス",
        "url": "追加ファイルのダウンロードURL"
      },
      ...
    ]
  },
  ...
}
```

## リリース手順

1. OSN バージョンが変更された場合、または追加モジュールに変更があった場合は、新しいタグを切ってください

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

3. `dist` ディレクトリ内のファイル（`temp` ディレクトリを除く）をリリースページにアップロードします

   - 先ほど作成したドラフトリリースページで「Attach binaries by dropping them here or selecting them」エリアに`dist`内のファイルをドラッグ＆ドロップするか、クリックして選択します
   - すべてのバイナリのアップロードが完了したら「Publish release」ボタンをクリックして公開します

4. n-air リポジトリの `package.json` の dependencies を更新します

   - ビルド後のコンソール出力に表示される依存関係の記述をコピー
   - n-air プロジェクトの`package.json`の該当箇所を更新
   - 例:
     ```json
     "dependencies": {
       "obs-studio-node": "https://github.com/n-air-app/native-deps/releases/download/osn0.y.z/osn-0.y.z-release-win64_xxxx.tar.gz",
       // その他の依存関係
     }
     ```

5. 必要に応じて n-air プロジェクト側でパッケージを再インストールする
   ```bash
   npm ci
   # または
   yarn install
   ```

## 注意事項

- このツールは Windows および macOS 向けにネイティブモジュールをパッケージングします
- 現在のバージョンでは、Windows 64bit 向けのモジュールのみを処理します
