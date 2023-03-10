#!/usr/bin/env node
import { Command } from 'commander';
import pageloader from '../src/index.js';

const program = new Command();

program
  .name('page-loader')
  .description('Page loader utility')
  .version('1.0.0')
  .option('-o, --output [dir]', 'output dir', process.cwd())
  .argument('<url>')
  .action((url) => pageloader(url, program.opts().output))
  .parse();
