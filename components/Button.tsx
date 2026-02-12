import { JSX } from "preact";
import { IS_BROWSER } from "fresh/runtime";

export function Button(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={!IS_BROWSER || props.disabled}
      class="px-2 py-1 border(gray-100 2) hover:bg-gray-200"
    />
  );
}
