import type { KeyboardEvent } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Enter on the keyboard; without it Enter just closes the keyboard. */
  onEnter?: () => void;
  placeholder?: string;
  label: string;
  className?: string;
};

/**
 * One-line nickname field built on a <textarea> on purpose. Chrome on Android shows its password / card / address
 * bar above the keyboard for <input> fields it suspects to be a username or a name, and it ignores
 * autocomplete="off" for that. A textarea is never treated as a sign-in username, so the bar stays away.
 */
export function NicknameField({ value, onChange, onEnter, placeholder, label, className = "" }: Props) {
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (onEnter) onEnter();
    else event.currentTarget.blur();
  }

  return (
    <textarea
      value={value}
      rows={1}
      wrap="off"
      maxLength={16}
      placeholder={placeholder}
      aria-label={label}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="words"
      spellCheck={false}
      enterKeyHint={onEnter ? "go" : "done"}
      data-1p-ignore="true"
      data-lpignore="true"
      data-form-type="other"
      className={`block resize-none overflow-hidden whitespace-nowrap rounded-xl border-2 border-ink bg-white/70 px-4 font-extrabold leading-[1.25rem] text-ink outline-none focus:border-bow ${className}`}
      // A pasted line break must not turn the nickname into two lines.
      onChange={(event) => onChange(event.target.value.replace(/[\r\n]+/g, " ").slice(0, 16))}
      onKeyDown={onKeyDown}
    />
  );
}
