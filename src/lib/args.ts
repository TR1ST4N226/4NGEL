// src/lib/args.ts

export type CliArgs = {
  help: boolean;
  version: boolean;
  initialUrl?: string;
  themeMode?: "auto" | "light" | "dark";
  error?: string;
};

/**
 * Parse les arguments de la ligne de commande
 */
export function parseArgs(argv: string[]): CliArgs {
  const result: CliArgs = {
    help: false,
    version: false,
    themeMode: "auto",
  };

  let positional: string[] = [];
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
      i++;
      continue;
    }

    if (arg === "--version" || arg === "-v") {
      result.version = true;
      i++;
      continue;
    }

    if (arg === "--theme") {
      const value = argv[i + 1];
      if (!value) {
        result.error = "Option --theme requires a value (auto|light|dark)";
        return result;
      }
      if (value !== "auto" && value !== "light" && value !== "dark") {
        result.error = `Invalid theme mode: "${value}". Use auto, light, or dark.`;
        return result;
      }
      result.themeMode = value;
      i += 2;
      continue;
    }

    if (arg.startsWith("--theme=")) {
      const value = arg.slice(8);
      if (value !== "auto" && value !== "light" && value !== "dark") {
        result.error = `Invalid theme mode: "${value}". Use auto, light, or dark.`;
        return result;
      }
      result.themeMode = value;
      i++;
      continue;
    }

    if (arg.startsWith("-")) {
      result.error = `Unknown option: "${arg}"`;
      return result;
    }

    positional.push(arg);
    i++;
  }

  if (positional.length > 1) {
    result.error = "Expected a single URL, got multiple arguments.";
    return result;
  }

  if (positional.length === 1) {
    result.initialUrl = positional[0];
  }

  return result;
}