// Writes docs/CATALOGUE.md from content/catalogue.json. Run: npm run catalogue:docs
import { writeFileSync } from "node:fs";
import { loadCatalogue, renderCatalogueMarkdown } from "../src/lib/catalogue/catalogue";

writeFileSync("docs/CATALOGUE.md", renderCatalogueMarkdown(loadCatalogue()));
console.log("Wrote docs/CATALOGUE.md");
