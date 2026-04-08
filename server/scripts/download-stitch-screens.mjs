/**
 * Baixa HTML + screenshot de ecrãs Google Stitch.
 * Chave: STITCH_API_KEY — https://stitch.withgoogle.com/settings
 *
 * npm run stitch:download  (na pasta server)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Stitch, StitchToolClient } from "@google/stitch-sdk";

const PROJECT_ID = "7171599069899789050";
const PROJECT_TITLE_SLUG = "duelo-western-digital";

const SCREENS = [
  { id: "d692cfb63747448ea0eb098a9cfc0603", slug: "01-lobby-do-jogo" },
  { id: "ae51dbf10e874b9eb2737c0c65a37dfc", slug: "02-lobby-do-jogo-alt" },
  { id: "f63bb1a73688426eae958b9de2860166", slug: "03-configurar-pratica-com-bots" },
  { id: "9c2884c281894ca8a645f25a3d155750", slug: "04-regras-do-jogo" },
  { id: "0611caf7abb74466bb7ccd230eb79181", slug: "05-loja-modern-frontier" },
  { id: "6dc9245c1e164436a20e4290ef944841", slug: "06-sala-de-espera" },
  { id: "b0f91cc0da73485687da5d89a3cc4761", slug: "07-lobby-do-jogo-v2" },
  { id: "f30703dff77641dba3403bb49e7f5308", slug: "08-regras-oficiais-modern-frontier" },
  { id: "e7fa231135fe4e1798942492d07338ae", slug: "09-criar-nova-sala" },
  { id: "a14b7804e8d747e985d8e3cc872950f8", slug: "10-o-duelo-gameplay" },
];

async function fetchBinary(url) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`GET ${url.slice(0, 80)}… → HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function repoRootDir() {
  return path.resolve(process.cwd(), "..");
}

async function main() {
  const apiKey = process.env.STITCH_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "Defina STITCH_API_KEY (https://stitch.withgoogle.com/settings → API Keys).",
    );
    process.exit(1);
  }

  const outDir = path.join(
    repoRootDir(),
    "design",
    `stitch-${PROJECT_TITLE_SLUG}`,
  );
  await mkdir(outDir, { recursive: true });

  const client = new StitchToolClient({ apiKey });
  const sdk = new Stitch(client);
  const project = sdk.project(PROJECT_ID);
  const manifest = [];

  try {
    for (const { id, slug } of SCREENS) {
      process.stdout.write(`Fetching ${slug} (${id})… `);
      const screen = await project.getScreen(id);
      const htmlUrl = await screen.getHtml();
      const imageUrl = await screen.getImage();

      const [htmlBuf, imageBuf] = await Promise.all([
        fetchBinary(htmlUrl),
        fetchBinary(imageUrl),
      ]);

      const htmlPath = path.join(outDir, `${slug}.html`);
      const ext = imageUrl.includes(".png") ? "png" : "jpg";
      const imagePath = path.join(outDir, `${slug}.${ext}`);

      await writeFile(htmlPath, htmlBuf);
      await writeFile(imagePath, imageBuf);
      manifest.push({
        screenId: id,
        slug,
        html: path.relative(repoRootDir(), htmlPath),
        image: path.relative(repoRootDir(), imagePath),
      });
      console.log("ok");
    }
  } finally {
    await client.close();
  }

  await writeFile(
    path.join(outDir, "manifest.json"),
    JSON.stringify(
      {
        projectId: PROJECT_ID,
        projectTitle: "Duelo Western Digital",
        exportedAt: new Date().toISOString(),
        screens: manifest,
      },
      null,
      2,
    ),
  );

  console.log(`\nFicheiros em: ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
