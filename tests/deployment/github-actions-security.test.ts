import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('GitHub Actions supply-chain policy', () => {
  it('pins every remote action to a full commit SHA', () => {
    const workflowsDirectory = resolve(process.cwd(), '.github', 'workflows')
    const workflowFiles = readdirSync(workflowsDirectory)
      .filter((name) => /\.ya?ml$/i.test(name))
      .sort()

    expect(workflowFiles.length).toBeGreaterThan(0)

    for (const workflowFile of workflowFiles) {
      const workflow = readFileSync(
        resolve(workflowsDirectory, workflowFile),
        'utf8'
      )
      const references = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)/gm)].map(
        (match) => match[1]
      )

      for (const reference of references) {
        if (reference.startsWith('./')) {
          continue
        }
        expect(`${workflowFile}: ${reference}`).toMatch(
          /^[^:]+:\s[^@\s]+@[0-9a-f]{40}$/
        )
      }
    }
  })
})
