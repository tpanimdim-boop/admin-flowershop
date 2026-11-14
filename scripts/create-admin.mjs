import { createInterface } from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";
import { readFile } from "node:fs/promises";
import { hash } from "bcryptjs";
import mysql from "mysql2/promise";
import { z } from "zod";

// One keypress reader for every hidden prompt. Attaching it per prompt would
// duplicate keypress events on the same stream.
emitKeypressEvents(stdin);

// Run locally with the backend owner's private database settings.
// This is not a web endpoint and is never imported into the Next.js app.
class SetupError extends Error {}

const databaseSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_SSL_CA: z.string().optional(),
});

const usernameSchema = z.string().trim().min(1, "Enter a username.")
  .max(50, "Use a username with 50 characters or fewer.")
  .refine(value => !/[\x00-\x1f\x7f]/.test(value), "The username cannot contain control characters.");

const passwordSchema = z.string().min(12, "Use at least 12 characters for an admin password.")
  .refine(value => Buffer.byteLength(value, "utf8") <= 72, "The password cannot exceed 72 UTF-8 bytes.");

function loadEnvironment() {
  const args = process.argv.slice(2);
  if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
    console.log('Usage: npm run create-admin -- --env-file "C:\\private\\Backend\\.env" [--ca-file ".certs\\aiven-project-ca.pem"]');
    console.log("The script privately prompts for a new username and password.");
    console.log("Pass --ca-file when the database uses a private certificate authority.");
    return null;
  }
  if (args.length % 2) throw new SetupError("Each option needs a value. Enter passwords at the private prompt, never in command arguments.");
  let envFile = "";
  let caFile = "";
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!["--env-file", "--ca-file"].includes(flag) || !value || value.startsWith("-")) {
      throw new SetupError("Only --env-file and --ca-file are supported. Enter passwords at the private prompt, never in command arguments.");
    }
    if (flag === "--env-file") {
      if (envFile) throw new SetupError("Pass --env-file only once.");
      envFile = value;
    } else {
      if (caFile) throw new SetupError("Pass --ca-file only once.");
      caFile = value;
    }
  }
  if (envFile) {
    if (typeof process.loadEnvFile !== "function") throw new SetupError("Use Node.js 20.12 or newer to run this setup script.");
    try { process.loadEnvFile(envFile); }
    catch { throw new SetupError("The private environment file could not be read. Check its path and permissions."); }
  }
  return { envFile, caFile };
}

async function ask(question) {
  const terminal = createInterface({ input: stdin, output: stdout });
  try { return await terminal.question(question); }
  finally { terminal.close(); }
}

function askPassword(question) {
  stdout.write(question);
  const previousRawMode = Boolean(stdin.isRaw);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";
    function cleanup() {
      stdin.off("keypress", keypress);
      stdin.off("end", ended);
      stdin.setRawMode(previousRawMode);
      stdin.pause();
      stdout.write("\n");
    }
    function ended() { cleanup(); reject(new SetupError("Input closed. Setup cancelled.")); }
    function keypress(text, key = {}) {
      if (key.ctrl && ["c", "d"].includes(key.name)) {
        cleanup();
        reject(new SetupError("Setup cancelled."));
      } else if (["return", "enter"].includes(key.name)) {
        cleanup();
        resolve(value);
      } else if (key.name === "backspace") {
        value = Array.from(value).slice(0, -1).join("");
      } else if (!key.ctrl && !key.meta && typeof text === "string") {
        value += text.replace(/[\r\n\0]/g, "");
      }
    }
    stdin.on("keypress", keypress);
    stdin.once("end", ended);
  });
}

function safeFailure(error) {
  if (error instanceof SetupError) return error.message;
  const code = error && typeof error === "object" && "code" in error ? error.code : "";
  if (code === "ER_DUP_ENTRY") return "That username already exists. Choose another. Existing accounts are never overwritten.";
  if (code === "ER_ACCESS_DENIED_ERROR") return "Database access was denied. Check the private DB_USER and DB_PASSWORD with the owner.";
  if (code === "ER_BAD_DB_ERROR") return "The configured database was not found. Check DB_NAME with the owner.";
  if (["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "ER_HOST_NOT_PRIVILEGED"].includes(code)) return "The database could not be reached. Check its host, port, and access rules with the owner.";
  if (["DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "CERT_HAS_EXPIRED", "ERR_TLS_CERT_ALTNAME_INVALID"].includes(code)) return "TLS certificate verification failed. Set DB_SSL_CA or pass --ca-file with the official database CA certificate. Do not disable verification.";
  return "Could not confirm admin creation. Check the users table before trying again. No existing account is overwritten by this script.";
}

async function main() {
  const options = loadEnvironment();
  if (!options) return;
  if (!stdin.isTTY || !stdout.isTTY) throw new SetupError("Run this from an interactive terminal so the password stays hidden.");
  const parsedDatabase = databaseSchema.safeParse(process.env);
  if (!parsedDatabase.success) {
    const fields = [...new Set(parsedDatabase.error.issues.map(issue => issue.path.join(".")))];
    throw new SetupError(`Missing or invalid private database settings: ${fields.join(", ")}. Ask the backend owner for these locally, not in chat.`);
  }
  const config = parsedDatabase.data;
  let ca = config.DB_SSL_CA ? config.DB_SSL_CA.replace(/\\n/g, "\n") : "";
  if (options.caFile) {
    try { ca = await readFile(options.caFile, "utf8"); }
    catch { throw new SetupError("The database CA file could not be read. Check its path."); }
    if (!ca.includes("BEGIN CERTIFICATE")) throw new SetupError("The database CA file is not a PEM certificate.");
  }
  console.log("Panimdim: create one new admin account.");
  console.log("Existing users, passwords, and roles are never overwritten.");
  console.log(`Configured database: ${JSON.stringify(config.DB_NAME)}`);

  const parsedUsername = usernameSchema.safeParse(await ask("New admin username: "));
  if (!parsedUsername.success) throw new SetupError(parsedUsername.error.issues[0].message);
  const username = parsedUsername.data;
  let password = await askPassword("New admin password (hidden): ");
  const validPassword = passwordSchema.safeParse(password);
  if (!validPassword.success) throw new SetupError(validPassword.error.issues[0].message);
  const confirmation = await askPassword("Confirm password (hidden): ");
  if (confirmation !== password) throw new SetupError("Passwords do not match. No account was created.");

  const required = `CREATE ADMIN IN ${config.DB_NAME}`;
  console.log(`New account: ${JSON.stringify(username)}. Role: admin.`);
  const approval = await ask(`Type ${JSON.stringify(required)} to confirm: `);
  if (approval !== required) throw new SetupError("Confirmation did not match. No account was created.");

  let connection;
  let transactionOpen = false;
  try {
    connection = await mysql.createConnection({
      host: config.DB_HOST,
      port: config.DB_PORT,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME,
      connectTimeout: 15000,
      multipleStatements: false,
      ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
      timezone: "Z",
    });
    const [existing] = await connection.execute("SELECT id FROM users WHERE username = ? LIMIT 1", [username]);
    if (!Array.isArray(existing)) throw new SetupError("The database response could not be read. No account was created.");
    if (existing.length) throw new SetupError("This username already exists. No password or role was changed. Choose a new username.");

    const passwordHash = await hash(password, 12);
    password = "";
    await connection.beginTransaction();
    transactionOpen = true;
    const [result] = await connection.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [username, passwordHash, "admin"]);
    if (!result || Array.isArray(result) || result.affectedRows !== 1) throw new SetupError("The insert could not be confirmed. Check the users table before retrying.");
    await connection.commit();
    transactionOpen = false;
    console.log(`Admin created: ${JSON.stringify(username)} (ID ${String(result.insertId)}).`);
    console.log("Sign in at http://localhost:3001 with the username and password you entered.");
    console.log("The password and password hash are not printed or saved in this project.");
  } catch (error) {
    if (connection && transactionOpen) {
      try { await connection.rollback(); }
      catch { console.error("Rollback could not be confirmed. Check the users table before retrying."); }
    }
    throw error;
  } finally {
    password = "";
    if (connection) {
      try { await connection.end(); }
      catch { console.error("The database connection did not close cleanly. Check the creation result above before retrying."); }
    }
  }
}

main().catch(error => { console.error(safeFailure(error)); process.exitCode = 1; });
