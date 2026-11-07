import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

import {
  type FunctionParameter,
  functionParameterBindingName,
  functionParameterTypeAnnotation,
} from "../shared/function-parameters.ts";

type ParameterOwner = ESTree.ArrowFunctionExpression | ESTree.Function;

function isBooleanTyped(parameter: FunctionParameter): boolean {
  const annotation = functionParameterTypeAnnotation(parameter)?.typeAnnotation;

  if (annotation?.type === "TSBooleanKeyword") {
    return true;
  }

  // TypeScript déduit un booléen pour un paramètre sans type dont la valeur par défaut est `true` ou `false`.
  return (
    parameter.type === "AssignmentPattern" &&
    annotation === undefined &&
    parameter.right.type === "Literal" &&
    (parameter.right.value === true || parameter.right.value === false)
  );
}

/** Ban a boolean parameter in a function of two or more parameters: the call site needs the signature. */
export const noBooleanFlagParameterRule = defineRule({
  createOnce(context) {
    const checkParameters = (node: ParameterOwner) => {
      if (node.params.length < 2) {
        return;
      }

      for (const parameter of node.params.filter(isBooleanTyped)) {
        context.report({
          data: { parameter: functionParameterBindingName(parameter, context.sourceCode) },
          messageId: "booleanParameter",
          node: parameter,
        });
      }
    };

    return {
      ArrowFunctionExpression: checkParameters,
      FunctionDeclaration: checkParameters,
      FunctionExpression: checkParameters,
    };
  },
  meta: {
    docs: {
      description:
        "Disallow a function with more than one parameter where one is boolean-typed. A lone boolean call argument reads as noise once the signature is out of sight; group flags into a named options object instead.",
    },
    messages: {
      booleanParameter:
        "Parameter `{{parameter}}` is boolean, and this function takes more than one parameter. A call site like `fn(x, true)` reads as noise without the signature open beside it. Replace the trailing parameters with a named options object.",
    },
    type: "problem",
  },
});
