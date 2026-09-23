import { chromium } from "playwright";
import { SignJWT } from "jose";
import { readFileSync, existsSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const PROD = "https://eunomia-tasks.vercel.app";
const LOCAL = process.env.APP_URL ?? "http://localhost:3000";

const OPERA_PATH = [
  `${process.env.LOCALAPPDATA}\\Programs\\Opera GX\\opera.exe`,
  `${process.env.LOCALAPPDATA}\\Programs\\Opera\\opera.exe`,
].find((p) => existsSync(p));

const PROFILE_DIR = `${process.cwd()}\\.playwright-profiles`;

function parseArgs() {
  const args = {
    task: process.argv[2] ?? "health",
    browser: "chrome",
    target: "prod",
  };
  for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--browser") args.browser = process.argv[++i];
    if (arg === "--local") args.target = "local";
  }
  return args;
}

function baseUrl(target) {
  return target === "local" ? LOCAL : PROD;
}

function envValue(key) {
  if (!existsSync(".env.local")) return undefined;
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

function envOr(key) {
  return process.env[key] ?? envValue(key);
}

async function mintAddToken(userId) {
  const secret = envValue("SESSION_SECRET") ?? "eunomia-email-actions-secret";
  return new SignJWT({ v: 1, action: "add", userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime())
    .sign(new TextEncoder().encode(secret));
}

function launchOptions(browser) {
  if (browser === "operagx") {
    if (!OPERA_PATH) throw new Error("OperaGX no encontrado");
    return { executablePath: OPERA_PATH };
  }
  return { channel: "chrome" };
}

async function snapshot(page, label) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  const title = await page.title().catch(() => "");
  const url = page.url();
  const text = (await page.locator("body").innerText().catch(() => ""))
    .replace(/\s+/g, " ")
    .slice(0, 3000);
  console.log(`\n=== ${label} ===`);
  console.log(`URL: ${url}`);
  console.log(`TITLE: ${title}`);
  console.log(`TEXT: ${text}`);
}

async function run() {
  const args = parseArgs();
  const url = baseUrl(args.target);
  const profile = `${PROFILE_DIR}\\${args.browser}`;

  console.log(
    `[playwright] task=${args.task} browser=${args.browser} target=${args.target} profile=${profile}`,
  );

  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      ...launchOptions(args.browser),
      headless: false,
      viewport: { width: 1440, height: 900 },
      args: ["--start-maximized"],
    });
  } catch (err) {
    console.error("[playwright] no se pudo abrir el navegador:", err.message);
    if (/lock/i.test(err.message)) {
      console.error(
        "Pista: cierra el navegador abierto o borra .playwright-profiles para usar un perfil limpio.",
      );
    }
    process.exit(1);
  }

  const page = await context.newPage();

  if (args.task === "health") {
    await page.goto(`${url}/api/health`, { waitUntil: "networkidle" });
    const json = await page.locator("body").innerText();
    console.log("\n=== HEALTH ===");
    console.log(json);
  } else if (args.task === "login") {
    await page.goto(`${url}/login`, { waitUntil: "domcontentloaded" });
    await snapshot(page, "LOGIN");
    console.log(
      "\n[*] Escribe las credenciales en la ventana del navegador si es necesario. Esperando hasta 45s a que cambie de página...",
    );
    await page.waitForLoadState("domcontentloaded", { timeout: 3000 }).catch(() => {});
    await page.waitForURL(/^(?!.*\/login)(.|\n)*$/, { timeout: 45000 }).catch(() => {});
    await sleep(1500);
    await snapshot(page, "TRAS LOGIN");
  } else if (args.task === "add") {
    const userId = args.additional ?? envOr("ADD_USER_ID");
    if (!userId) throw new Error("Falta userId para firmar el token (ADD_USER_ID)");
    const token = await mintAddToken(userId);
    await page.goto(`${url}/add?s=${encodeURIComponent(token)}`, {
      waitUntil: "domcontentloaded",
    });
    await snapshot(page, "ADD FORMULARIO");
  } else if (args.task === "gmail") {
    await page.goto("https://mail.google.com", { waitUntil: "domcontentloaded" });
    console.log(
      "\n[*] Inicia sesión en Gmail en la ventana. Buscando 'Eunomia' en el buscador en 40s...",
    );
    await sleep(40000);
    if (/accounts\.google/.test(page.url())) {
      console.log("URL actual: " + page.url());
      console.log("AVISO: sigue sin sesión en Gmail. Repite con '--browser operagx' si ahí ya está logueado, o termina el login manual.");
    } else {
      await page.goto("https://mail.google.com/mail/u/0/#search/Eunomia", {
        waitUntil: "domcontentloaded",
      });
      await sleep(6000);
      await snapshot(page, "BUSQUEDA EUNOMIA");
    }
  }

  await sleep(4000);
  await context.close();
  console.log("\n[playwright] fin.");
}

run().catch((err) => {
  console.error("[playwright] ERROR:", err);
  process.exit(1);
});