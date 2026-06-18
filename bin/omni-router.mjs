#!/usr/bin/env node
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync, spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const rendererDist = join(root, 'out', 'renderer')

if (!existsSync(rendererDist)) {
  console.log('First run — building Omni-Router (this takes a minute)...')
  try {
    execSync('npm run build:web', { cwd: root, stdio: 'inherit' })
  } catch {
    console.error('Build failed. Run "npm run build:web" manually to see errors.')
    process.exit(1)
  }
}

const args = ['--import', 'tsx', join(root, 'src', 'web', 'server.ts')]
const child = spawn(process.execPath, args, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env }
})

child.on('exit', (code) => process.exit(code ?? 1))
