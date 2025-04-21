// 標準モジュール
import * as path from "path";
import * as fs from "node:fs";
import * as os from "node:os";
import * as toml from "toml";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// グローバル型宣言を追加
declare global {
  var expressServer: any;
}

/**
 * ロックファイルパス (重複起動防止用)
 */
const LOCK_FILE_PATH = path.join(os.tmpdir(), "reins-of-claude-mcp-server.lock");
/**
 * プロセスが実行中かどうかを確認
 */
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * サーバーが既に実行中かどうか確認
 */
function checkIfServerAlreadyRunning(): boolean {
  try {
    if (fs.existsSync(LOCK_FILE_PATH)) {
      const pidStr = fs.readFileSync(LOCK_FILE_PATH, "utf8");
      const pid = parseInt(pidStr, 10);

      if (pid && isProcessRunning(pid)) {
        console.error(`[INFO] サーバーはすでにPID ${pid}で実行中です`);
        return true;
      } else {
        fs.unlinkSync(LOCK_FILE_PATH);
      }
    }

    fs.writeFileSync(LOCK_FILE_PATH, process.pid.toString(), "utf8");

    process.on("exit", () => {
      if (fs.existsSync(LOCK_FILE_PATH)) {
        try {
          fs.unlinkSync(LOCK_FILE_PATH);
        } catch (err) {
          // 終了時のエラーは無視
        }
      }
    });

    process.on("uncaughtException", (err) => {
      console.error(`[ERROR] 未処理の例外: ${err}`);
      if (fs.existsSync(LOCK_FILE_PATH)) {
        try {
          fs.unlinkSync(LOCK_FILE_PATH);
        } catch (err) {
          // 終了時のエラーは無視
        }
      }
      process.exit(1);
    });

    return false;
  } catch (err) {
    console.error(`[ERROR] ロックファイル操作中のエラー: ${err}`);
    return false;
  }
}

// MCPサーバーの終了処理を行うシグナルハンドラー設定
const setupSignalHandlers = (mcpServer: McpServer) => {
  console.error("[INFO] 終了シグナルハンドラーを設定しています");

  const cleanup = async (signal: string) => {
    console.error(
      `[INFO] シグナル${signal}を受信しました。適切に終了します...`,
    );

    try {
      // MCPサーバーを終了
      await mcpServer.close();

      // Expressサーバーを終了（グローバル変数から取得）
      if (global.expressServer) {
        global.expressServer.close(() => {
          console.error("[INFO] Express server has been closed");
        });
      }

      // ロックファイルを削除
      if (fs.existsSync(LOCK_FILE_PATH)) {
        fs.unlinkSync(LOCK_FILE_PATH);
      }

      console.error(
        "[INFO] クリーンアップが完了しました。アプリケーションを終了します。",
      );
      process.exit(0);
    } catch (error) {
      console.error(`[ERROR] 終了処理中にエラーが発生しました: ${error}`);

      if (fs.existsSync(LOCK_FILE_PATH)) {
        try {
          fs.unlinkSync(LOCK_FILE_PATH);
        } catch (_) {
          // エラーは無視
        }
      }
      process.exit(1);
    }
  };

  // シグナルハンドラーを登録
  process.on("SIGINT", () => cleanup("SIGINT"));
  process.on("SIGTERM", () => cleanup("SIGTERM"));
  process.on("SIGHUP", () => cleanup("SIGHUP"));

  // 親プロセスの終了検知
  process.stdin.on("end", () => {
    console.error(
      "[INFO] 標準入力が閉じられました。親プロセスが終了した可能性があります。",
    );
    cleanup("STDIN_CLOSE");
  });

  console.error("[INFO] 終了シグナルハンドラーの設定が完了しました");
};

const main = async () => {
  const ToolConfig = z.object({
    description: z.string().describe("An explain this tool"),
    goal: z.string().describe("A goal to acheive this tool"),
    prefix: z
      .string()
      .optional()
      .describe(
        'A predefined string that is automatically added before the user\'s input. It typically helps guide the model\'s behavior (e.g., "Translate the following text into English: ").',
      ),
    suffix: z
      .string()
      .optional()
      .describe(
        'A predefined string that is automatically added after the user\'s input. It can be used to finish or wrap up the instruction (e.g., "adding punctuation or a follow-up instruction").',
      ),
  });
  type ToolConfigType = z.infer<typeof ToolConfig>;
  type ToolsMap = Record<string, ToolConfigType>;

  // Load tools from TOML
  const toolsTomlPath = path.join(__dirname, "tools.toml");
  const parsedToml = toml.parse(fs.readFileSync(toolsTomlPath, "utf-8")) as {
    tools: ToolsMap;
  };
  const tools: ToolsMap = parsedToml?.tools || {};

  try {
    // サーバーの実行チェック - 重複起動防止
    if (checkIfServerAlreadyRunning()) {
      console.error(
        "[INFO] 別のSmaregiMCPサーバープロセスが既に実行中です。このインスタンスは終了します。",
      );
      process.exit(0);
    }

    console.error("[INFO] MCPサーバーを初期化します");

    // Create an MCP server
    const mcpServer = new McpServer({
      name: "ReinsOfClaude",
      version: "1.0.0",
    });

    const ToolArgs = {
      userPrompt: z
        .string()
        .describe(
          "The input text provided by the user. This is the main content the user wants the tool to process. It is dynamically inserted between a predefined prefix and suffix.",
        ),
    };

    // ツールを登録
    Object.entries(tools).forEach(([name, config]: [string, ToolConfigType]) => {
      mcpServer.tool(name, config.description, ToolArgs, async ({ userPrompt }) => ({
        content: [
          { 
            type: "text", 
            text: `
              THE GOAL OF THIS INSTRUCTION IS ${config.goal}. ONCE ACHEIVED THIS GOAL, DO STOP THE OPERATION: 
              ${config.prefix || ""}${userPrompt}${config.suffix || ""}
              ` 
          },
        ],
      }));
    });

    // シグナルハンドラーのセットアップ
    setupSignalHandlers(mcpServer);

    // Expressサーバーをグローバルビジブルにしてシャットダウンできるようにする
    // 注：実際のExpressサーバー初期化コードがある場合はここに記述

    // StdioServerTransport経由で接続
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);

    console.error("[INFO] MCPサーバーが起動しました");
  } catch (error) {
    console.error(`[ERROR] サーバー起動中にエラーが発生しました: ${error}`);

    if (fs.existsSync(LOCK_FILE_PATH)) {
      try {
        fs.unlinkSync(LOCK_FILE_PATH);
      } catch (_) {
        // エラーは無視
      }
    }
    process.exit(1);
  }
};

main();
