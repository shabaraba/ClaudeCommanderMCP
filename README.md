# ReinsOfClaude

## Overview
ReinsOfClaude is an MCP server designed for use with Claude Desktop. This tool allows you to place specific commands (tool names) at the beginning of your input to wrap appropriate instruction text around your input string, ensuring Claude accurately follows your instructions.

This tool was developed to address situations where command instructions written in Claude Desktop's project knowledge space or instruction sheets are sometimes ignored, enabling reliable execution by inserting instructions directly into the input text.

## Features
- Simple interface using tool names as commands
- Easy management of tool settings via toml files
- Automatic addition of appropriate instruction text to input
- Seamless integration with existing Claude interfaces

## Installation
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

## Usage Example

### Translation Tool Example:

**Input:**
```
translate
こんにちは、良いお天気ですね
```

**Output:**
```
I'll translate that for you.reins（local）displaying results from translate {
  `userPrompt`: `こんにちは、良い天気ですね`
}英語に翻訳してください：こんにちは、良い天気ですねThe Japanese text "こんにちは、良い天気ですね" translates to:
"Hello, nice weather today, isn't it?"
```

## Tool Configuration

Tools are managed using toml files, making them easy to add or remove. Using short, clear tool names improves usability.

**Configuration Example:**
```toml
[tools.translate]
description = "Translate Japanese to English"
prefix = "英語に翻訳してください："
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

## How to Use
1. Place the tool name at the beginning of your input
2. Add a line break and enter the text you want to process
3. Claude will automatically wrap appropriate instruction text around your input for processing

## Adding New Tools
1. Open the toml file
2. Add a new tool configuration:
   - Tool name (command name)
   - Description
   - Prefix text
   - Suffix text
3. Save and start using

## Benefits
- Ensures Claude executes specific instructions reliably
- Eliminates the need to repeatedly type instruction text
- Easy reuse of complex instruction templates
- Ability to create custom user commands

## Installation & Requirements
(※ Please add details about installation methods, required environment, dependencies, etc.)
