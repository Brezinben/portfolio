import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

import {
	functionParameterBindingName,
	functionParameterTypeAnnotation,
	type FunctionParameter,
} from "../shared/function-parameters.ts";

type ParameterOwner = ESTree.ArrowFunctionExpression | ESTree.Function;

function isBooleanTyped(parameter: FunctionParameter): boolean {
	const annotation = functionParameterTypeAnnotation(parameter)?.typeAnnotation;
	if (annotation?.type === "TSBooleanKeyword") return true;

	// Un parametre sans annotation, mais defaite par un litteral vrai ou faux, est infere
	// booleen par TypeScript au meme titre qu'une annotation explicite.
	return (
		parameter.type === "AssignmentPattern" &&
		annotation === undefined &&
		parameter.right.type === "Literal" &&
		typeof parameter.right.value === "boolean"
	);
}

/** Ban a second-or-later boolean parameter, a call-site flag that only the signature explains. */
export const noBooleanFlagParameterRule = defineRule({
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow a function with more than one parameter where one is boolean-typed. A lone boolean call argument reads as noise once the signature is out of sight; group flags into a named options object instead.",
		},
		messages: {
			booleanParameter:
				"Parameter `{{parameter}}` is boolean, and this function takes more than one parameter. A call site like `fn(x, true)` reads as noise without the signature open beside it. Replace the trailing parameters with a named options object.",
		},
	},
	createOnce(context) {
		const checkParameters = (node: ParameterOwner) => {
			if (node.params.length < 2) return;

			for (const parameter of node.params) {
				if (!isBooleanTyped(parameter)) continue;
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
});
