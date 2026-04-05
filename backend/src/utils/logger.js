/**
 * logger.js — Lightweight coloured console logger.
 *
 * Every line is prefixed with a HH:MM:SS timestamp and a level tag.
 * Uses chalk for colour so output is still readable if piped to a file.
 */

import chalk from 'chalk';

/** Returns the current time formatted as HH:MM:SS in gray. */
const time = () => chalk.gray(new Date().toTimeString().slice(0, 8));

export const logger = {
  /** Informational messages (cyan "INFO" tag). */
  info: (msg, ...args) =>
    console.log(`${time()} ${chalk.cyan('INFO')}  ${msg}`, ...args),

  /** Success / happy-path confirmations (green "OK" tag). */
  success: (msg, ...args) =>
    console.log(`${time()} ${chalk.green('OK')}    ${msg}`, ...args),

  /** Non-fatal warnings (yellow "WARN" tag). */
  warn: (msg, ...args) =>
    console.warn(`${time()} ${chalk.yellow('WARN')}  ${msg}`, ...args),

  /** Errors / stack traces (red "ERROR" tag). */
  error: (msg, ...args) =>
    console.error(`${time()} ${chalk.red('ERROR')} ${msg}`, ...args),

  /** Structured HTTP request log — used by morgan override. */
  request: (method, url, status, ms) => {
    const statusColor =
      status >= 500 ? chalk.red(status) :
      status >= 400 ? chalk.yellow(status) :
      chalk.green(status);
    const methodColor = chalk.magenta(method.padEnd(6));
    console.log(`${time()} ${methodColor} ${chalk.white(url)} -> ${statusColor} ${chalk.gray(ms + 'ms')}`);
  },
};
