"use client"

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
          :root {
            --background: #000000;
            --foreground: #ffffff;
            --primary: #FF6B35;
            --primary-hover: #E85A2A;
          }
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--background);
            color: var(--foreground);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 1rem;
          }
          
          .container {
            text-align: center;
            max-width: 28rem;
          }
          
          h1 {
            font-size: 2rem;
            font-weight: bold;
            color: var(--primary);
            margin-bottom: 1rem;
          }
          
          p {
            margin-bottom: 2rem;
            color: #999;
          }
          
          button {
            padding: 0.75rem 1.5rem;
            background-color: var(--primary);
            color: white;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
            font-weight: 500;
            transition: background-color 0.2s;
          }
          
          button:hover {
            background-color: var(--primary-hover);
          }
        `,
          }}
        />
      </head>
      <body>
        <div className="container">
          <h1>Something went wrong</h1>
          <p>An unexpected error has occurred. Please try again later.</p>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  )
}
