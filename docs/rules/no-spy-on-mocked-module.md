# vitest/no-spy-on-mocked-module

📝 Disallow `vi.spyOn` on a module already mocked by `vi.mock`.

⚠️ This rule _warns_ in the 🌐 `all` config.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

When a module is mocked with `vi.mock()`, all of its exports are already replaced by mocks. Calling `vi.spyOn()` on that module only wraps a mock in another mock, and `mockRestore()` restores the automock rather than the original implementation. Use `vi.mocked()` to configure the existing mock instead.

### Rule details

This rule reports `vi.spyOn()` calls on a default or namespace import whose module is mocked by a `vi.mock()` call without a factory in the same file.

The following patterns are considered a warning:

```js
import fs from 'node:fs'

vi.mock(import('node:fs'))

beforeEach(() => {
  vi.spyOn(fs, 'readSync').mockReturnValue(0)
})
```

The following patterns are not considered a warning:

```js
import fs from 'node:fs'

vi.mock(import('node:fs'))

beforeEach(() => {
  vi.mocked(fs.readSync).mockReturnValue(0)
})
```

```js
import fs from 'node:fs'

beforeEach(() => {
  vi.spyOn(fs, 'readSync').mockReturnValue(0)
})
```

### Autofix

The autofix replaces `vi.spyOn(module, 'name')` with `vi.mocked(module.name)`, keeping any chained calls. Calls that spy on a getter or setter (`vi.spyOn(module, 'name', 'get')`) are reported but not fixed, since `vi.mocked()` has no equivalent.
