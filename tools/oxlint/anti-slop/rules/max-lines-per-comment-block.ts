import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

const DEFAULT_MAX_LINES = 3;

const DEFAULT_MAX_LINES_PER_FUNCTION = 6;

const DEFAULT_MAX_LINES_PER_MODULE = 8;

type Budget = "default" | "function" | "module";

const MESSAGE_IDS = {
  default: "tooLongForDefault",
  function: "tooLongForFunction",
  module: "tooLongForModule",
} satisfies Record<Budget, string>;

type Block = {
  end: number;
  lines: number;
  start: number;
};

function optionOf(option: unknown, key: string, fallback: number): number {
  if (typeof option === "object" && option !== null && !Array.isArray(option)) {
    const value = (option as Record<string, unknown>)[key];
    if (typeof value === "number") {
      return value;
    }
  }
  return fallback;
}

/**
 * Count the lines a reader sees, delimiters excluded.
 *
 * `/*` and `*\/` carry no prose, so counting them would make the same budget mean four lines in
 * a block comment and six in a run of line comments.
 */
function proseLines(comment: ESTree.Comment): number {
  return comment.value.replace(/^\s*\n|\n\s*$/gu, "").split("\n").length;
}

/** Group consecutive comments into one block: only whitespace between them reads as one paragraph. */
function groupComments(comments: readonly ESTree.Comment[], text: string): Block[] {
  const blocks: Block[] = [];
  for (const comment of comments) {
    const lines = proseLines(comment);
    const previous = blocks.at(-1);
    const between = previous === undefined ? "x" : text.slice(previous.end, comment.start);
    if (previous !== undefined && between.trim() === "" && between.split("\n").length <= 2) {
      previous.end = comment.end;
      previous.lines += lines;
      continue;
    }
    blocks.push({ end: comment.end, lines, start: comment.start });
  }
  return blocks;
}

/**
 * A block gets the budget of what it documents. A module header explains a file, a function
 * explains behaviour, and everything else explains one value.
 */
function budgetFor(block: Block, firstStatement: number, functionStarts: Set<number>): Budget {
  if (block.end <= firstStatement) {
    return "module";
  }
  for (const start of functionStarts) {
    if (start >= block.end && start - block.end < 3) {
      return "function";
    }
  }
  return "default";
}

/** An import or a directive such as `"use client"`: a module header may sit after them. */
function isPrelude(statement: ESTree.Directive | ESTree.Statement): boolean {
  return statement.type === "ImportDeclaration" || "directive" in statement;
}

function declaresFunction(node: ESTree.Node): boolean {
  if (node.type === "VariableDeclaration") {
    return node.declarations.some(
      (declarator) =>
        declarator.init?.type === "ArrowFunctionExpression" ||
        declarator.init?.type === "FunctionExpression",
    );
  }
  return node.type === "FunctionDeclaration" || node.type === "ClassDeclaration";
}

/** Cap the height of a comment block, so a reason stays a reason and not an essay. */
export const maxLinesPerCommentBlockRule = defineRule({
  createOnce(context) {
    const functionStarts = new Set<number>();

    const note = (node: ESTree.Node) => {
      if (declaresFunction(node)) functionStarts.add(node.start);
    };

    return {
      ClassDeclaration: note,
      ExportDefaultDeclaration(node) {
        if (declaresFunction(node.declaration as ESTree.Node)) functionStarts.add(node.start);
      },
      ExportNamedDeclaration(node) {
        if (node.declaration !== null && declaresFunction(node.declaration)) {
          functionStarts.add(node.start);
        }
      },
      FunctionDeclaration: note,
      "Program:exit"(node) {
        const option = context.options?.[0];
        const limits = {
          default: optionOf(option, "maxLines", DEFAULT_MAX_LINES),
          function: optionOf(option, "maxLinesPerFunction", DEFAULT_MAX_LINES_PER_FUNCTION),
          module: optionOf(option, "maxLinesPerModule", DEFAULT_MAX_LINES_PER_MODULE),
        };
        const text = context.sourceCode.getText();
        // Un en-tête de module se pose après les directives et les imports.
        const firstStatement =
          node.body.find((statement) => !isPrelude(statement))?.start ?? text.length;
        for (const block of groupComments(node.comments, text)) {
          const budget = budgetFor(block, firstStatement, functionStarts);
          if (block.lines <= limits[budget]) continue;
          context.report({
            data: { lines: String(block.lines), maxLines: String(limits[budget]) },
            messageId: MESSAGE_IDS[budget],
            node: { range: [block.start, block.end] },
          });
        }
        functionStarts.clear();
      },
      VariableDeclaration: note,
    };
  },
  meta: {
    defaultOptions: [
      {
        maxLines: DEFAULT_MAX_LINES,
        maxLinesPerFunction: DEFAULT_MAX_LINES_PER_FUNCTION,
        maxLinesPerModule: DEFAULT_MAX_LINES_PER_MODULE,
      },
    ],
    docs: {
      description:
        "Cap the prose height of a comment block. A module header, a function and a single value each get their own budget, because they do not owe the reader the same amount of explanation.",
    },
    messages: {
      tooLongForDefault:
        "This comment runs {{lines}} prose lines, over the {{maxLines}} that `maxLines` allows above a value. A constant, a type or a statement earns one reason, not a paragraph. Keep the constraint that would bite whoever edits the line, and move the measurement, the history and the rejected alternatives to the spec or to the folder CONTEXT.md. Delimiters are not counted, so shortening means cutting prose.",
      tooLongForFunction:
        "This comment runs {{lines}} prose lines, over the {{maxLines}} that `maxLinesPerFunction` allows above a function. Say WHY the function behaves as it does, never what it does: the signature and the body already say that. Move the measurement, the history and the rejected alternatives to the spec or to the folder CONTEXT.md. Delimiters are not counted, so shortening means cutting prose.",
      tooLongForModule:
        "This module header runs {{lines}} prose lines, over the {{maxLines}} that `maxLinesPerModule` allows. Name what the file is for and the constraints that bind an edit to it. Move the measurement, the history and the rejected alternatives to the spec or to the folder CONTEXT.md. Delimiters are not counted, so shortening means cutting prose.",
    },
    schema: [
      {
        type: "object",
        properties: {
          maxLines: { type: "integer", minimum: 1 },
          maxLinesPerFunction: { type: "integer", minimum: 1 },
          maxLinesPerModule: { type: "integer", minimum: 1 },
        },
        additionalProperties: false,
      },
    ],
    type: "suggestion",
  },
});
