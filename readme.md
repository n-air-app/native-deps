# Native Dependencies

このリポジトリは、N-Air アプリケーション用のネイティブ依存関係（obs-studio-node 関連）を管理するためのツールです。

## 概要

このツールは以下の機能を提供します：

- Streamlabs Desktop の指定バージョンから `repositories.json` を自動取得・更新
- ネイティブモジュールのダウンロード（現在はダウンロード処理をコメントアウト）
- OBS Studio Node のワークフローファイルから LibOBSVersion などの環境変数を抽出
- リリースノート用のマークダウン表を自動生成
- パッケージの依存関係情報を出力

## 使い方

### 前提条件

```bash
# 依存関係をインストール
npm install
```

### 基本的な使用方法

#### 1. Streamlabs Desktop のバージョンを指定して実行

```bash
# 特定のバージョンを指定（推奨）
npm run build v1.19.6

# バージョンを指定しない場合（streamlabs-version.txt から読み取り）
npm run build
```

#### 2. 出力される情報

ツールを実行すると以下の情報が出力されます：

- **アップロード先の案内**: GitHub Releases へのアップロード先 URL
- **package.json の更新案内**: N-Air プロジェクト用の依存関係設定
- **リリースノート**: Markdown 表形式でのライブラリバージョン一覧
- **LibOBSVersion**: OBS Studio のバージョン情報

## ファイル構成

### streamlabs-version.txt

使用する Streamlabs Desktop のバージョンを記録するファイルです。
コマンドライン引数でバージョンを指定した場合、このファイルが自動更新されます。

### repositories.json

ネイティブモジュールのリポジトリ情報を含む設定ファイルです。
Streamlabs Desktop の指定バージョンから自動的にダウンロード・更新されます。

取得元: `https://github.com/streamlabs/desktop/blob/{バージョン}/scripts/repositories.json`

形式例：

```json
{
  "root": [
    {
      "name": "obs-studio-node",
      "url": "https://s3-us-west-2.amazonaws.com/obsstudionodes3.streamlabs.com/",
      "archive": "osn-[VERSION]-release-[OS][ARCH].tar.gz",
      "version": "0.25.56",
      "win64": true,
      "osx": true
    }
  ]
}
```

## リリース手順

### 1. 最新の Streamlabs Desktop バージョンを確認

[Streamlabs Desktop リリースページ](https://github.com/streamlabs/desktop/releases) で最新バージョンを確認します。

### 2. ツールを実行して情報を取得しダウンロード

```bash
# 最新バージョンを指定して実行
npm run build v1.19.6
```

### 3. GitHub でリリースを作成

1. **タグの作成**

   ```bash
   # obs-studio-node のバージョンに基づいてタグを作成
   # 例: obs-studio-node が 0.25.56 の場合
   git tag osn0.25.56
   git push origin osn0.25.56
   ```

2. **GitHub リリースページでリリース作成**

   - [n-air-app/native-deps/releases](https://github.com/n-air-app/native-deps/releases) にアクセス
   - 「Draft a new release」をクリック
   - 作成したタグを選択
   - ツールの出力に含まれるリリースノート用マークダウンをコピーして使用

3. **バイナリファイルのアップロード**
   - `dist` ディレクトリ内のファイルをリリースページにアップロード
   - すべてのファイルをアップロード後に「Publish release」で公開

### 4. N-Air プロジェクトの更新

ツールの出力に表示される依存関係の記述を N-Air プロジェクトの `package.json` に反映します：

```json
{
  "dependencies": {
    "obs-studio-node": "https://github.com/n-air-app/native-deps/releases/download/osn0.25.56/obs-studio-node-0.25.56-release-win64.tar.gz"
  }
}
```

## 更新判断の指針

### 対象バージョンの選定

基本的に [Streamlabs Desktop](https://github.com/streamlabs/desktop/releases) で正式リリースされたバージョンのみを対象とします。

### 更新が必要な場合

以下のような場合に N-Air での依存関係更新を検討します：

1. **OBS Studio のメジャー・マイナーバージョンアップ**

   - `LibOBSVersion` の変更を確認
   - 互換性に影響する可能性がある変更

2. **obs-studio-node の重要な修正**

   - セキュリティ修正
   - クリティカルなバグ修正
   - N-Air で使用する機能に関する改善

3. **依存ライブラリの重要な更新**
   - セキュリティ上の脆弱性の修正
   - パフォーマンスの大幅な改善

### 更新の流れ

1. **情報収集**

   ```bash
   npm run build v1.19.6  # 新しいバージョンを指定
   ```

2. **変更内容の確認**

   - 出力される `LibOBSVersion` や各ライブラリのバージョンを確認
   - 前回のリリースと比較して変更点を把握

3. **影響範囲の評価**

   - N-Air で使用している機能への影響を評価
   - 必要に応じて N-Air 側での対応も検討

4. **テスト実施**
   - N-Air での動作確認
   - 問題がないことを確認後にリリース

## 参考リンク

- [Streamlabs Desktop](https://github.com/streamlabs/desktop)
- [OBS Studio Node](https://github.com/streamlabs/obs-studio-node)
- [N-Air App](https://github.com/n-air-app)

## トラブルシューティング

### repositories.json の取得に失敗する場合

- 指定したバージョンが存在するかを確認
- インターネット接続を確認
- GitHub の API 制限に達していないかを確認

### バージョン指定がうまく動作しない場合

- `streamlabs-version.txt` ファイルが正しく作成されているかを確認
- コマンドライン引数の形式が正しいかを確認（例: `v1.19.6`）
