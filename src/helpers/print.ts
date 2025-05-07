import chalk from "chalk";

enum OutputType {
  INFORMATION = "INFORMATION",
  SUCCESS = "SUCCESS",
  WARNING = "WARNING",
  ERROR = "ERROR",
}
const print = (message: string, outputType: OutputType) => {
  switch (outputType) {
    case OutputType.INFORMATION:
      console.log(chalk.blue(message));
      break;
    case OutputType.SUCCESS:
      console.log(chalk.green(message));
      break;
    case OutputType.WARNING:
      console.log(chalk.yellow(message));
      break;
    case OutputType.ERROR:
      console.log(chalk.red(message));
      break;
    default:
      console.log(message);
      break;
  }
};
export { OutputType, print };
