#!/usr/bin/env node
import { Command } from 'commander';
import pageloader from '../src/index.js';

const program = new Command();

function errorColor(str) {
  // Add ANSI escape codes to display text in red.
  return `\x1b[31m${str}\x1b[0m`;
}

program
  .name('page-loader')
  .description('Page loader utility')
  .version('1.0.0')
  .option('-o, --output [dir]', 'output dir', process.cwd())
  .argument('<url>')
  .configureOutput({
    outputError: (str, write) => write(errorColor(str)),
  })
  .action((url) => pageloader(url, program.opts().output)
    .catch((err) => {
      const errMsg = {
        EACCES: `Permission denied, failed to make '${err.path}'`,
        ENOTFOUND: `Failed to download web page '${err.hostname}'`,
      };
      const msg = errMsg[err.code] !== undefined ? errMsg[err.code] : err;
      console.error(errorColor(msg));
      process.exit(1);
    }));

program.parse();
