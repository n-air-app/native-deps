native-deps

`npm run build`

基本的にosnのバージョン変更毎か追加dllの更新時に処理してください。

repositories.json は適時 streamlabs desktop にあるファイルにて更新してください。

https://github.com/streamlabs/desktop/blob/master/scripts/repositories.json

osnバージョンが変わった場合、都度タグを切ってください。

圧縮前に変更を行いたい場合は一旦処理の上 `npm run cache` を実行してください。
tempにて展開したファイルを再ダウンロードせずに圧縮します。

クリーン実行したい場合は dist フォルダを一旦消してください。
