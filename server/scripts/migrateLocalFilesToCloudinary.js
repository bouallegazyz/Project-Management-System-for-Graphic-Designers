import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../utils/index.js";
import Brief from "../models/brief.js";
import SourceFile from "../models/sourceFile.js";
import { isCloudinaryConfigured, uploadFileToCloudinary } from "../utils/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.join(__dirname, "..");
const uploadsRoot = path.join(serverRoot, "uploads");

const parseArgs = () => {
  const argv = process.argv.slice(2);
  const getArgValue = (flag) => {
    const idx = argv.indexOf(flag);
    if (idx === -1) return undefined;
    const value = argv[idx + 1];
    if (!value || value.startsWith("--")) return undefined;
    return value;
  };

  const only = (getArgValue("--only") || "all").toLowerCase();
  if (!["all", "briefs", "sources"].includes(only)) {
    throw new Error("Option --only invalide. Utilisez: all | briefs | sources");
  }

  const limitRaw = getArgValue("--limit");
  const limit = limitRaw ? Number(limitRaw) : 0;
  if (Number.isNaN(limit) || limit < 0) {
    throw new Error("Option --limit invalide. Utilisez un nombre >= 0.");
  }

  return {
    dryRun: argv.includes("--dry-run"),
    removeLocal: argv.includes("--remove-local"),
    verbose: argv.includes("--verbose"),
    only,
    limit,
  };
};

const printHelp = () => {
  console.log(`\nMigration local -> Cloudinary (briefs/sources)\n
Usage:
  node scripts/migrateLocalFilesToCloudinary.js [options]

Options:
  --dry-run         Simule la migration sans écrire en base ni uploader
  --remove-local    Supprime le fichier local après upload réussi
  --only <type>     Cible: all | briefs | sources (default: all)
  --limit <n>       Limite le nombre de documents traités par collection
  --verbose         Affiche les détails fichier par fichier
  --help            Affiche cette aide
`);
};

const ensureSubdocId = (subdoc) => {
  if (subdoc._id) return false;
  subdoc._id = new mongoose.Types.ObjectId();
  return true;
};

const isCloudFile = (entry) => Boolean(entry?.cloudinaryId);

const isLocalBriefPath = (filePath) => typeof filePath === "string" && filePath.startsWith("/uploads/briefs/");
const isLocalSourcePath = (filePath) => typeof filePath === "string" && filePath.startsWith("/uploads/sources/");

const resolveLocalAbsolutePath = (filePath) => {
  const relative = filePath.replace(/^\/uploads\//, "");
  return path.join(uploadsRoot, relative);
};

const loadEnv = () => {
  dotenv.config({ path: path.join(serverRoot, ".env"), quiet: true });
  if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
    dotenv.config({ path: path.join(serverRoot, "utils", ".ENV"), quiet: true });
  }
};

const makeSummary = () => ({
  docsScanned: 0,
  filesScanned: 0,
  migrated: 0,
  alreadyCloud: 0,
  missingLocal: 0,
  skippedPath: 0,
  errors: 0,
});

const logItem = (options, message) => {
  if (options.verbose) {
    console.log(message);
  }
};

const migrateBriefs = async ({ options, summary }) => {
  const filter = { "files.filePath": /^\/uploads\/briefs\// };
  const query = Brief.find(filter).sort({ _id: 1 });
  if (options.limit > 0) {
    query.limit(options.limit);
  }

  const briefs = await query;
  const cloudFolder = process.env.CLOUDINARY_BRIEFS_FOLDER || "bloomworks/briefs";

  for (const brief of briefs) {
    summary.docsScanned += 1;
    let hasChanges = false;

    for (const file of brief.files || []) {
      summary.filesScanned += 1;

      if (!isLocalBriefPath(file.filePath) && !isCloudFile(file)) {
        summary.skippedPath += 1;
        continue;
      }

      if (isCloudFile(file)) {
        summary.alreadyCloud += 1;
        const idAdded = ensureSubdocId(file);
        const expectedPath = `/api/client/briefs/${brief._id}/files/${file._id}/download`;
        if (file.filePath !== expectedPath) {
          file.filePath = expectedPath;
          hasChanges = true;
        }
        if (idAdded) hasChanges = true;
        continue;
      }

      const absolutePath = resolveLocalAbsolutePath(file.filePath);
      if (!fs.existsSync(absolutePath)) {
        summary.missingLocal += 1;
        logItem(options, `[brief:${brief._id}] Fichier local introuvable: ${absolutePath}`);
        continue;
      }

      if (options.dryRun) {
        summary.migrated += 1;
        logItem(options, `[DRY-RUN][brief:${brief._id}] ${file.originalName}`);
        continue;
      }

      try {
        const uploaded = await uploadFileToCloudinary({
          localFilePath: absolutePath,
          originalName: file.originalName,
          folder: cloudFolder,
          publicIdPrefix: "brief",
        });

        ensureSubdocId(file);
        file.cloudinaryId = uploaded.cloudinaryId;
        file.cloudinaryResourceType = uploaded.resourceType;
        file.cloudinaryFormat = uploaded.format;
        file.fileName = uploaded.cloudinaryId.split("/").pop();
        file.fileSize = uploaded.bytes || file.fileSize;
        file.filePath = `/api/client/briefs/${brief._id}/files/${file._id}/download`;
        hasChanges = true;
        summary.migrated += 1;

        if (options.removeLocal) {
          await fsPromises.unlink(absolutePath).catch(() => undefined);
        }

        logItem(options, `[brief:${brief._id}] Migré: ${file.originalName}`);
      } catch (error) {
        summary.errors += 1;
        console.error(`[brief:${brief._id}] Erreur migration ${file.originalName}: ${error.message}`);
      }
    }

    if (hasChanges && !options.dryRun) {
      await brief.save();
    }
  }
};

const migrateSources = async ({ options, summary }) => {
  const filter = { filePath: /^\/uploads\/sources\// };
  const query = SourceFile.find(filter).sort({ _id: 1 });
  if (options.limit > 0) {
    query.limit(options.limit);
  }

  const sources = await query;
  const cloudFolder = process.env.CLOUDINARY_SOURCES_FOLDER || "bloomworks/sources";

  for (const source of sources) {
    summary.docsScanned += 1;

    if (!isLocalSourcePath(source.filePath) && !isCloudFile(source)) {
      summary.skippedPath += 1;
      continue;
    }

    if (isCloudFile(source)) {
      summary.alreadyCloud += 1;
      const expectedPath = `/api/sources/${source._id}/download`;
      if (!options.dryRun && source.filePath !== expectedPath) {
        source.filePath = expectedPath;
        await source.save();
      }
      continue;
    }

    summary.filesScanned += 1;
    const absolutePath = resolveLocalAbsolutePath(source.filePath);
    if (!fs.existsSync(absolutePath)) {
      summary.missingLocal += 1;
      logItem(options, `[source:${source._id}] Fichier local introuvable: ${absolutePath}`);
      continue;
    }

    if (options.dryRun) {
      summary.migrated += 1;
      logItem(options, `[DRY-RUN][source:${source._id}] ${source.originalName}`);
      continue;
    }

    try {
      const uploaded = await uploadFileToCloudinary({
        localFilePath: absolutePath,
        originalName: source.originalName,
        folder: cloudFolder,
        publicIdPrefix: "source",
      });

      source.cloudinaryId = uploaded.cloudinaryId;
      source.cloudinaryResourceType = uploaded.resourceType;
      source.cloudinaryFormat = uploaded.format;
      source.fileName = uploaded.cloudinaryId.split("/").pop();
      source.fileSize = uploaded.bytes || source.fileSize;
      source.filePath = `/api/sources/${source._id}/download`;
      await source.save();

      if (options.removeLocal) {
        await fsPromises.unlink(absolutePath).catch(() => undefined);
      }

      summary.migrated += 1;
      logItem(options, `[source:${source._id}] Migré: ${source.originalName}`);
    } catch (error) {
      summary.errors += 1;
      console.error(`[source:${source._id}] Erreur migration ${source.originalName}: ${error.message}`);
    }
  }
};

const printSummary = (label, summary) => {
  console.log(`\n[${label}] Résumé`);
  console.log(`- Documents scannés: ${summary.docsScanned}`);
  console.log(`- Fichiers scannés: ${summary.filesScanned}`);
  console.log(`- Migrés: ${summary.migrated}`);
  console.log(`- Déjà cloud: ${summary.alreadyCloud}`);
  console.log(`- Fichiers locaux manquants: ${summary.missingLocal}`);
  console.log(`- Chemins ignorés: ${summary.skippedPath}`);
  console.log(`- Erreurs: ${summary.errors}`);
};

const main = async () => {
  if (process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const options = parseArgs();
  loadEnv();

  if (!options.dryRun && !isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary n'est pas configuré. Renseignez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET."
    );
  }

  if (options.dryRun && !isCloudinaryConfigured()) {
    console.warn("Cloudinary non configuré: dry-run possible, migration réelle impossible tant que les variables manquent.");
  }

  console.log("\n=== Migration locaux -> Cloudinary ===");
  console.log(`Mode dry-run: ${options.dryRun ? "oui" : "non"}`);
  console.log(`Supprimer local après upload: ${options.removeLocal ? "oui" : "non"}`);
  console.log(`Cible: ${options.only}`);
  console.log(`Limite par collection: ${options.limit || "aucune"}`);

  await connectDB();

  const briefsSummary = makeSummary();
  const sourcesSummary = makeSummary();

  if (options.only === "all" || options.only === "briefs") {
    await migrateBriefs({ options, summary: briefsSummary });
  }

  if (options.only === "all" || options.only === "sources") {
    await migrateSources({ options, summary: sourcesSummary });
  }

  printSummary("Briefs", briefsSummary);
  printSummary("Sources", sourcesSummary);

  const totalErrors = briefsSummary.errors + sourcesSummary.errors;
  if (totalErrors > 0) {
    process.exitCode = 1;
  }
};

main()
  .catch((error) => {
    console.error(`\nMigration interrompue: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch {
      // Ignore close errors
    }
  });
