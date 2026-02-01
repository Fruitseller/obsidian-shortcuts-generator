/**
 * Dependencies - Inline Implementierungen ohne externe Abhängigkeiten
 */

// =============================================================================
// Path Utilities (inline implementation)
// =============================================================================

const SEPARATOR = "/";

export function join(...paths: string[]): string {
  if (paths.length === 0) return ".";

  let joined = "";
  for (const path of paths) {
    if (path.length > 0) {
      if (joined.length === 0) {
        joined = path;
      } else {
        joined += SEPARATOR + path;
      }
    }
  }

  // Normalize: remove double slashes, handle . and ..
  return normalize(joined);
}

export function normalize(path: string): string {
  if (path.length === 0) return ".";

  const isAbsolute = path.charAt(0) === SEPARATOR;
  const segments = path.split(SEPARATOR).filter((s) => s.length > 0 && s !== ".");
  const stack: string[] = [];

  for (const segment of segments) {
    if (segment === "..") {
      if (stack.length > 0 && stack[stack.length - 1] !== "..") {
        stack.pop();
      } else if (!isAbsolute) {
        stack.push("..");
      }
    } else {
      stack.push(segment);
    }
  }

  let result = stack.join(SEPARATOR);
  if (isAbsolute) {
    result = SEPARATOR + result;
  }

  return result || ".";
}

export function basename(path: string): string {
  if (path.length === 0) return "";

  // Remove trailing slash
  let end = path.length - 1;
  while (end > 0 && path.charAt(end) === SEPARATOR) {
    end--;
  }

  // Find last separator
  let start = end;
  while (start >= 0 && path.charAt(start) !== SEPARATOR) {
    start--;
  }

  return path.slice(start + 1, end + 1);
}

export function dirname(path: string): string {
  if (path.length === 0) return ".";

  // Remove trailing slashes
  let end = path.length - 1;
  while (end > 0 && path.charAt(end) === SEPARATOR) {
    end--;
  }

  // Find last separator
  while (end >= 0 && path.charAt(end) !== SEPARATOR) {
    end--;
  }

  // Remove trailing slashes from result
  while (end > 0 && path.charAt(end - 1) === SEPARATOR) {
    end--;
  }

  if (end < 0) return path.charAt(0) === SEPARATOR ? SEPARATOR : ".";
  if (end === 0 && path.charAt(0) === SEPARATOR) return SEPARATOR;

  return path.slice(0, end) || ".";
}

// =============================================================================
// YAML Parser (simple implementation for frontmatter)
// =============================================================================

export function parseYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");

  let currentKey = "";
  let currentArray: string[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    // Check for array item
    if (trimmed.startsWith("- ")) {
      if (currentArray !== null) {
        const value = trimmed.slice(2).trim();
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, "");
        currentArray.push(cleanValue);
      }
      continue;
    }

    // Check for key-value pair
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      // Save previous array if exists
      if (currentArray !== null && currentKey) {
        result[currentKey] = currentArray;
        currentArray = null;
      }

      currentKey = trimmed.slice(0, colonIndex).trim();
      let value = trimmed.slice(colonIndex + 1).trim();

      // Check if value starts array on next lines
      if (value === "") {
        currentArray = [];
        continue;
      }

      // Parse value
      // Remove quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Check for number
      if (/^-?\d+$/.test(value)) {
        result[currentKey] = parseInt(value, 10);
      } else if (/^-?\d+\.\d+$/.test(value)) {
        result[currentKey] = parseFloat(value);
      } else if (value === "true") {
        result[currentKey] = true;
      } else if (value === "false") {
        result[currentKey] = false;
      } else if (value === "null" || value === "~") {
        result[currentKey] = null;
      } else if (value.startsWith("[") && value.endsWith("]")) {
        // Inline array
        const arrayContent = value.slice(1, -1);
        result[currentKey] = arrayContent
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""));
      } else {
        result[currentKey] = value;
      }

      currentArray = null;
    }
  }

  // Save last array if exists
  if (currentArray !== null && currentKey) {
    result[currentKey] = currentArray;
  }

  return result;
}

// =============================================================================
// CLI Args Parser (simple implementation)
// =============================================================================

export interface ParseArgsOptions {
  boolean?: string[];
  string?: string[];
  alias?: Record<string, string>;
  default?: Record<string, unknown>;
}

export interface ParsedArgs {
  _: (string | number)[];
  [key: string]: unknown;
}

export function parseArgs(
  args: string[],
  options: ParseArgsOptions = {}
): ParsedArgs {
  const result: ParsedArgs = { _: [] };
  const booleans = new Set(options.boolean || []);
  const strings = new Set(options.string || []);
  const aliases: Record<string, string> = {};

  // Build alias map (both directions)
  if (options.alias) {
    for (const [key, value] of Object.entries(options.alias)) {
      aliases[key] = value;
      aliases[value] = key;
    }
  }

  // Apply defaults
  if (options.default) {
    for (const [key, value] of Object.entries(options.default)) {
      result[key] = value;
    }
  }

  // Parse args
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      // Long option
      const equalIndex = arg.indexOf("=");
      let key: string;
      let value: unknown;

      if (equalIndex > 0) {
        key = arg.slice(2, equalIndex);
        value = arg.slice(equalIndex + 1);
      } else {
        key = arg.slice(2);

        if (booleans.has(key) || booleans.has(aliases[key] || "")) {
          value = true;
        } else if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
          value = args[++i];
        } else {
          value = true;
        }
      }

      result[key] = value;
      if (aliases[key]) {
        result[aliases[key]] = value;
      }
    } else if (arg.startsWith("-") && arg.length > 1) {
      // Short option(s)
      const chars = arg.slice(1);

      for (let j = 0; j < chars.length; j++) {
        const char = chars[j];
        const fullKey = aliases[char] || char;
        const isBoolean = booleans.has(char) || booleans.has(fullKey);

        if (isBoolean) {
          result[char] = true;
          if (aliases[char]) {
            result[aliases[char]] = true;
          }
        } else if (j === chars.length - 1) {
          // Last char can take a value
          if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
            const value = args[++i];
            result[char] = value;
            if (aliases[char]) {
              result[aliases[char]] = value;
            }
          } else {
            result[char] = true;
            if (aliases[char]) {
              result[aliases[char]] = true;
            }
          }
        } else {
          result[char] = true;
          if (aliases[char]) {
            result[aliases[char]] = true;
          }
        }
      }
    } else {
      // Positional argument
      result._.push(arg);
    }
  }

  return result;
}
