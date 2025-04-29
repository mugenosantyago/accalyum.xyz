import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // Ensure the route is always dynamic

export async function GET() {
  try {
    const response = await fetch('https://candyswap.gg/api/token-list', {
      // It's often good practice to pass through certain headers if needed,
      // but for a simple GET, this might be sufficient.
      // Add cache control headers if appropriate for your use case.
      cache: 'no-store', // Ensure fresh data
    });

    if (!response.ok) {
      // Log the error status and text for debugging
      console.error(`CandySwap API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`CandySwap API Response: ${errorText}`);
      // Return a structured error response to the client
      return NextResponse.json({ error: `Failed to fetch from CandySwap API: ${response.statusText}` }, { status: response.status });
    }

    const data = await response.json();
    // Return the data fetched from CandySwap
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching CandySwap token list:', error);
    // Return a generic server error response
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 