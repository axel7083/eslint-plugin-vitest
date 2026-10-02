import rule from '../src/rules/no-spy-on-mocked-module'
import { ruleTester } from './ruleTester'

describe(rule.name, () => {
  ruleTester.run(rule.name, rule, {
    valid: [
      `
        import fs from 'node:fs'
        vi.spyOn(fs, 'readSync')
      `,
      `
        import fs from 'node:fs'
        vi.mock('node:fs', () => ({ default: { readSync: vi.fn() } }))
        vi.spyOn(fs, 'readSync')
      `,
      `
        import fs from 'node:fs'
        vi.mock(import('node:path'))
        vi.spyOn(fs, 'readSync')
      `,
      `
        import fs from 'node:fs'
        vi.doMock('node:fs')
        vi.spyOn(fs, 'readSync')
      `,
      `
        vi.mock('node:fs')
        const fs = { readSync() {} }
        vi.spyOn(fs, 'readSync')
      `,
      `
        import { readSync } from 'node:fs'
        vi.mock('node:fs')
        vi.spyOn(console, 'log')
      `,
    ],
    invalid: [
      {
        code: `
          import fs from 'node:fs'
          vi.mock('node:fs')
          vi.spyOn(fs, 'readSync')
        `,
        output: `
          import fs from 'node:fs'
          vi.mock('node:fs')
          vi.mocked(fs.readSync)
        `,
        errors: [
          {
            messageId: 'noSpyOnMockedModule',
            data: { name: 'fs', path: 'node:fs' },
            line: 4,
          },
        ],
      },
      {
        code: `
          import * as fs from 'node:fs'
          vi.mock(import('node:fs'))
          beforeEach(() => {
            vi.spyOn(fs, 'readSync').mockReturnValue(0)
          })
        `,
        output: `
          import * as fs from 'node:fs'
          vi.mock(import('node:fs'))
          beforeEach(() => {
            vi.mocked(fs.readSync).mockReturnValue(0)
          })
        `,
        errors: [{ messageId: 'noSpyOnMockedModule', line: 5 }],
      },
      {
        code: `
          import fs from 'node:fs'
          vi.spyOn(fs, 'readSync')
          vi.mock('node:fs')
        `,
        output: `
          import fs from 'node:fs'
          vi.mocked(fs.readSync)
          vi.mock('node:fs')
        `,
        errors: [{ messageId: 'noSpyOnMockedModule', line: 3 }],
      },
      {
        code: `
          import * as mod from './mod'
          vi.mock('./mod')
          const key = 'foo'
          vi['spyOn'](mod, 'foo-bar')
          vi.spyOn(mod, key)
        `,
        output: `
          import * as mod from './mod'
          vi.mock('./mod')
          const key = 'foo'
          vi['mocked'](mod['foo-bar'])
          vi.mocked(mod[key])
        `,
        errors: [
          { messageId: 'noSpyOnMockedModule', line: 5 },
          { messageId: 'noSpyOnMockedModule', line: 6 },
        ],
      },
      {
        code: `
          import * as mod from './mod'
          vi.mock('./mod')
          vi.spyOn(mod, 'value', 'get').mockReturnValue(1)
        `,
        output: null,
        errors: [{ messageId: 'noSpyOnMockedModule', line: 4 }],
      },
    ],
  })
})
