// Static not-found page with no imports
export default function NotFound() {
  // Return a simple HTML structure with no dependencies
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>404 - Page Not Found</title>
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
            font-size: 6rem;
            font-weight: bold;
            color: var(--primary);
            margin-bottom: 1rem;
          }
          
          h2 {
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
          }
          
          p {
            margin-bottom: 2rem;
            color: #999;
          }
          
          a {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background-color: var(--primary);
            color: white;
            text-decoration: none;
            border-radius: 0.375rem;
            font-weight: 500;
            transition: background-color 0.2s;
          }
          
          a:hover {
            background-color: var(--primary-hover);
          }
        `,
          }}
        />
      </head>
      <body>
        <div className="container">
          <h1>404</h1>
          <h2>Page Not Found</h2>
          <p>The page you are looking for doesn't exist or has been moved.</p>
          <a href="/">Return to Home</a>
        </div>
      </body>
    </html>
  )
}
