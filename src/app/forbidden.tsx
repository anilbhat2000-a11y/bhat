export default function Forbidden() {
  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>You do not have access to this record</h1>
      <p><a href="/manager/team">Back to my team</a></p>
    </main>
  );
}
