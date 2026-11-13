import { runDb } from "./db";

export default function globalSetup(): void {
  runDb(["seed"]);
}
