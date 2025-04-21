# ReinsOfClaude

## 概要
ReinsOfClaudeは、Claude Desktopで使用するためのMCPサーバーです。このツールを使用すると、特定のコマンド（ツール名）を文頭に置いて入力することで、その入力文字列に適切な指示文をラップし、Claudeに確実に指示を出すことができます。

Claude Desktopのプロジェクトナレッジスペースや指示書にコマンド指示を書いていてもしばしば無視されることがあるため、このツールは都度入力文に指示を挿入して確実に実行できるように開発されました。

## 特徴
- ツール名をコマンドとして使用するシンプルなインターフェース
- tomlファイルによるツール設定の簡単な管理
- 入力テキストに適切な指示文を自動的に追加
- 既存のClaudeインターフェースとシームレスに連携

## インストール
```bash
git clone https://github.com/yourusername/ReinsOfClaude.git
npm i
cp tools.example.toml tools.toml
```

in claude_desktop_config.json
```jsonc
{
  "mcpServers": {
    "reins": {
      "command": "/path/to/bun", // or node
      "args": ["/path/to/ReinsOfClaude/index.ts"]
    }
  }
}
```

## 使用例

### 翻訳ツールの例:

**入力:**
```
translate
こんにちは、良いお天気ですね
```

**出力:**
```
I'll translate that for you.reins（ローカル）からの translate の結果を表示{
  `userPrompt`: `こんにちは、良い天気ですね`
}英語に翻訳してください：こんにちは、良い天気ですねThe Japanese text "こんにちは、良い天気ですね" translates to:
"Hello, nice weather today, isn't it?"
```

## ツール設定

ツールはtomlファイルで管理されており、簡単に追加・削除が可能です。短くわかりやすいツール名を使用することで使いやすさが向上します。

**設定例:**
```toml
[tools.translate]
description = "Translate Japanese to English"
prefix = "Translate Japanese to English: "
suffix = ""

[tools.invest]
description = "investigate for a coding plan"
prefix = ""
suffix = """
However, be sure to follow these instructions: 
  - Do not implement.
  - Please investigate the existing code, summarize your findings, and make a plan for what follows.
  - Only the test code may be implemented or modified.
"""
```

## 使用方法
1. ツール名を文頭に置く
2. 改行して処理したいテキストを入力
3. Claudeが自動的に適切な指示文をテキストにラップして処理

## 新しいツールの追加方法
1. tomlファイルを開く
2. 新しいツール設定を追加
   - ツール名（コマンド名）
   - 説明
   - 前置文（prefix）
   - 後置文（suffix）
3. 保存して利用開始

## 利点
- 確実にClaudeに特定の指示を実行させることが可能
- 繰り返し使用する指示文を毎回入力する手間を省略
- 複雑な指示文のテンプレートを簡単に再利用可能
- ユーザー独自のカスタムコマンドを作成可能

