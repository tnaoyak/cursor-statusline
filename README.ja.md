# cursor-statusline

`cursor-statusline` は、Cursor CLI のステータスラインを対話的に設定するためのセットアップツールです。  
実行時に使う `~/.cursor/statusline.sh` を生成し、Cursor 側の設定へ反映します。

英語版README: [README.md](README.md)

![ステータスラインのスクリーンショット](assets/statusline-screenshot.png)

## 設計方針

- 実行時の `statusLine.command` は `~/.cursor/statusline.sh` を参照
- `npx -y cursor-statusline` はセットアップ時のみ利用
- セットアップ後は、生成済みスクリプトだけで運用可能

## セットアップ

```bash
npx -y cursor-statusline
```

実行すると次を行います。

1. 対話UIで表示項目と表示順を選択
2. `~/.config/cursor-statusline/config.toml` を保存
3. `~/.cursor/statusline.sh` を生成または更新
4. `~/.cursor/cli-config.json` の `statusLine.command` を `~/.cursor/statusline.sh` に設定

`-y` は `--yes` の省略形で、`npx` 実行時の確認プロンプトを自動承認します。

## セットアップUIの操作

- 文字入力: 項目の絞り込み検索
- `Space`: 項目のON/OFF切り替え
- `Enter`: 選択確定
- 並び替えステップ:
  - 並び替えを行うか選択
  - 移動する項目を選択
  - 移動先の位置を選択
  - 必要な回数繰り返し

## デフォルト項目（v1）

- `model`
- `current-dir`
- `git-branch`
- `context-used`

## 表示項目一覧（v1）

- `model`
- `model-with-params`
- `current-dir`
- `project-name`
- `git-branch`
- `git-diff`
- `context-used`
- `context-remaining`
- `context-window-size`
- `tokens-used`
- `tokens-in`
- `tokens-out`
- `session-id`
- `session-name`
- `cli-version`
- `vim-mode`
- `worktree-name`

## 開発

```bash
npm install
npm run check
npm test
npm run build
```

