import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils'
import { createEslintRule, getAccessorValue } from '../utils'
import { parseVitestFnCall } from '../utils/parse-vitest-fn-call'

const RULE_NAME = 'no-spy-on-mocked-module'

type MESSAGE_IDS = 'noSpyOnMockedModule'
type Options = []

const getMockedPath = (
  node: TSESTree.CallExpressionArgument | undefined,
): string | null => {
  if (node?.type === AST_NODE_TYPES.Literal && typeof node.value === 'string')
    return node.value

  if (
    node?.type === AST_NODE_TYPES.ImportExpression &&
    node.source.type === AST_NODE_TYPES.Literal &&
    typeof node.source.value === 'string'
  )
    return node.source.value

  return null
}

const getPropertyAccess = (
  node: TSESTree.CallExpressionArgument,
  sourceCode: Readonly<TSESLint.SourceCode>,
): string => {
  if (
    node.type === AST_NODE_TYPES.Literal &&
    typeof node.value === 'string' &&
    /^[A-Za-z_$][\w$]*$/u.test(node.value)
  )
    return `.${node.value}`

  return `[${sourceCode.getText(node)}]`
}

export default createEslintRule<Options, MESSAGE_IDS>({
  name: RULE_NAME,
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'disallow `vi.spyOn` on a module already mocked by `vi.mock`',
      recommended: false,
    },
    messages: {
      noSpyOnMockedModule:
        "'{{ name }}' is already mocked by vi.mock('{{ path }}'), use vi.mocked() instead of vi.spyOn()",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const importedModules = new Map<string, string>()
    const mockedPaths = new Set<string>()
    const spyOnCalls: Array<{
      node: TSESTree.CallExpression
      member: TSESTree.Node
      name: string
    }> = []

    return {
      ImportDeclaration(node) {
        for (const specifier of node.specifiers) {
          if (
            specifier.type === AST_NODE_TYPES.ImportDefaultSpecifier ||
            specifier.type === AST_NODE_TYPES.ImportNamespaceSpecifier
          )
            importedModules.set(specifier.local.name, node.source.value)
        }
      },
      CallExpression(node) {
        const vitestFnCall = parseVitestFnCall(node, context)

        if (vitestFnCall?.type !== 'vi' || vitestFnCall.members.length === 0)
          return

        const [member] = vitestFnCall.members
        const method = getAccessorValue(member)

        // only the outermost call of a chain is parsed, e.g. `vi.spyOn(...).mockReturnValue(...)`
        const call = member.parent.parent

        if (call?.type !== AST_NODE_TYPES.CallExpression) return

        if (method === 'mock' && call.arguments.length === 1) {
          const path = getMockedPath(call.arguments[0])

          if (path !== null) mockedPaths.add(path)
          return
        }

        if (
          method === 'spyOn' &&
          call.arguments[0]?.type === AST_NODE_TYPES.Identifier
        )
          spyOnCalls.push({ node: call, member, name: call.arguments[0].name })
      },
      'Program:exit'() {
        for (const { node, member, name } of spyOnCalls) {
          const path = importedModules.get(name)

          if (path === undefined || !mockedPaths.has(path)) continue

          context.report({
            node,
            messageId: 'noSpyOnMockedModule',
            data: { name, path },
            fix(fixer) {
              const [object, property, accessType] = node.arguments

              // `vi.mocked()` has no equivalent for spying on getters and setters
              if (!property || accessType) return null

              return [
                fixer.replaceText(
                  member,
                  member.type === AST_NODE_TYPES.Identifier
                    ? 'mocked'
                    : "'mocked'",
                ),
                fixer.replaceTextRange(
                  [object.range[0], property.range[1]],
                  `${name}${getPropertyAccess(property, context.sourceCode)}`,
                ),
              ]
            },
          })
        }
      },
    }
  },
})
