import chalk from 'chalk';

const time = () => chalk.gray(new Date().toTimeString().slice(0, 8));

export const logger = {
  info: (msg, ...args) =>
    console.log(`${time()} ${chalk.cyan('INFO')}  ${msg}`, ...args),

  success: (msg, ...args) =>
    console.log(`${time()} ${chalk.green('OK')}    ${msg}`, ...args),

  warn: (msg, ...args) =>
    console.warn(`${time()} ${chalk.yellow('WARN')}  ${msg}`, ...args),

  error: (msg, ...args) =>
    console.error(`${time()} ${chalk.red('ERROR')} ${msg}`, ...args),

  request: (method, url, status, ms) => {
    const statusColor =
      status >= 500 ? chalk.red(status) :
      status >= 400 ? chalk.yellow(status) :
      chalk.green(status);
    const methodColor = chalk.magenta(method.padEnd(6));
    console.log(`${time()} ${methodColor} ${chalk.white(url)} → ${statusColor} ${chalk.gray(ms + 'ms')}`);
  },
};
