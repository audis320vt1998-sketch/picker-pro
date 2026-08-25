import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface TestedNextConfig {
  output?: string
  outputFileTracingIncludes: Record<string, string[]>
  serverExternalPackages: string[]
}

function repositoryFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

function loadNextConfig(standalone: boolean): TestedNextConfig {
  const env = { ...process.env }
  if (standalone) {
    env.PICKER_PRO_STANDALONE_BUILD = '1'
  } else {
    delete env.PICKER_PRO_STANDALONE_BUILD
  }

  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        '-e',
        "process.stdout.write(JSON.stringify(require('./next.config.js')))",
      ],
      { cwd: process.cwd(), encoding: 'utf8', env }
    )
  ) as TestedNextConfig
}

describe('staging container contract', () => {
  it('builds a standalone server with the dynamic Tesseract runtime files', () => {
    const normalConfig = loadNextConfig(false)
    const standaloneConfig = loadNextConfig(true)

    expect(normalConfig.output).toBeUndefined()
    expect(standaloneConfig.output).toBe('standalone')
    expect(standaloneConfig.serverExternalPackages).toContain('tesseract.js')

    for (const route of [
      '/api/intake/preflight',
      '/api/intake/pdf-preflight',
    ]) {
      expect(standaloneConfig.outputFileTracingIncludes[route]).toEqual(
        expect.arrayContaining([
          'node_modules/tesseract.js/**/*',
          'node_modules/tesseract.js-core/**/*',
        ])
      )
    }
  })

  it('uses a current Node 24, non-root runtime with Poppler and a healthcheck', () => {
    const dockerfile = repositoryFile('Dockerfile')

    expect(dockerfile).toContain('# syntax=docker/dockerfile:1.26.0')
    expect(dockerfile).toContain('ARG NODE_VERSION=24-trixie-slim')
    expect(dockerfile).toContain('PICKER_PRO_STANDALONE_BUILD=1')
    expect(dockerfile).toContain('npm ci --no-audit --no-fund')
    expect(dockerfile).toContain('poppler-utils')
    expect(dockerfile).toContain('/usr/local/lib/node_modules/npm')
    expect(dockerfile).toContain('/app/.next/standalone')
    expect(dockerfile).toContain('/app/.next/static')
    expect(dockerfile).toContain('USER node')
    expect(dockerfile).toContain("path:'/api/health'")
    expect(dockerfile).toContain('CMD ["node", "server.js"]')
    expect(dockerfile).not.toContain('/app/public')
  })

  it('keeps the staging service local and gives only runtime caches write access', () => {
    const compose = repositoryFile('compose.staging.yml')

    expect(compose).toContain('read_only: true')
    expect(compose).toContain('pull: true')
    expect(compose).toContain('cpus: 2.0')
    expect(compose).toContain('init: true')
    expect(compose).toContain('mem_limit: 2g')
    expect(compose).toContain('pids_limit: 256')
    expect(compose).toContain('127.0.0.1:${PICKER_PRO_PORT:-3000}:3000')
    expect(compose).toContain('no-new-privileges:true')
    expect(compose).toContain('cap_drop:')
    expect(compose).toContain('- ALL')
    expect(compose).toContain('next-cache:/app/.next/cache')
    expect(compose).toContain('ocr-cache:/var/cache/picker-pro-ocr')
    expect(compose).toContain('/tmp:rw,noexec,nosuid,nodev,mode=1777,size=1g')
  })

  it('blocks fixable high or critical container vulnerabilities in CI', () => {
    const workflow = repositoryFile('.github/workflows/quality.yml')

    expect(workflow).toContain(
      'docker/scout-action@7c6b6c3f7844478ace1ffd4e7aef649053d1f87d'
    )
    expect(workflow).toContain('only-severities: critical,high')
    expect(workflow).toContain('only-fixed: true')
    expect(workflow).toContain('exit-code: true')
  })

  it('excludes local dependencies, outputs, secrets, caches, and archives', () => {
    const ignored = repositoryFile('.dockerignore')

    for (const pattern of [
      '.git',
      '.next',
      'node_modules',
      '.env*',
      '*.log',
      '*.traineddata',
      '*.tsbuildinfo',
      'coverage',
      '*.zip',
    ]) {
      expect(ignored.split(/\r?\n/)).toContain(pattern)
    }
  })
})
