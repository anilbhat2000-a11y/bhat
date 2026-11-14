// Runs once when the server starts. Picks up lesson file conversions that were waiting or
// running when the server last stopped. Scheduled, not awaited, so start-up is not delayed.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  setTimeout(() => {
    void import("./lib/learning/conversions")
      .then((m) => m.resumePendingConversions())
      .catch((e) => console.error("could not resume lesson conversions", (e as Error).message));
  }, 5_000);
}
