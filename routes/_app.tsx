import { PageProps } from "fresh";

export default function App({ Component }: PageProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>TLA+ Playground</title>
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
