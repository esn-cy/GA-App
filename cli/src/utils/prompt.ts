import { cancel, isCancel, text as clackText } from '@clack/prompts';

export {
  cancel,
  confirm,
  group,
  intro,
  isCancel,
  log,
  multiselect,
  note,
  outro,
  password,
  select,
  spinner
} from '@clack/prompts';

export interface TextPromptOptions {
  message: string;
  placeholder?: string;
  defaultValue?: string;
  initialValue?: string;
  validate?: (value: string) => string | Error | undefined;
}

/**
 * Wrapper around @clack/prompts text() that validates against defaultValue
 * when the user submits empty input.
 */
export function text(opts: TextPromptOptions): Promise<string | symbol> {
  return clackText({
    message: opts.message,
    placeholder: opts.placeholder ?? opts.defaultValue,
    defaultValue: opts.defaultValue,
    initialValue: opts.initialValue,
    validate: opts.validate
      ? value => {
        const effective = value && value.length > 0 ? value : (opts.defaultValue ?? '');
        return opts.validate!(effective);
      }
      : undefined
  });
}

export function unwrapPrompt<T>(value: T, message = 'Operation cancelled.'): Exclude<T, symbol> {
  if (isCancel(value)) {
    cancel(message);
    process.exit(0);
  }
  return value as Exclude<T, symbol>;
}

export function isNonInteractive(ciFlag?: boolean): boolean {
  return Boolean(ciFlag) || !process.stdout.isTTY || process.env.CI === 'true';
}
