"use client"

export default function Error({ error, reset }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "1rem",
        textAlign: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        backgroundColor: "#000",
        color: "#fff",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#FF6B35", marginBottom: "1rem" }}>
        Something went wrong
      </h1>
      <p style={{ color: "#999", maxWidth: "28rem", marginBottom: "2rem" }}>
        An unexpected error has occurred. Please try again later.
      </p>
      <button
        onClick={() => reset()}
        style={{
          padding: "0.75rem 1.5rem",
          backgroundColor: "#FF6B35",
          color: "white",
          border: "none",
          borderRadius: "0.375rem",
          cursor: "pointer",
          fontWeight: "500",
        }}
      >
        Try again
      </button>
    </div>
  )
}
