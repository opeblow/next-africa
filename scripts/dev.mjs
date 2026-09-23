import { spawn } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const tasks = [
  { name: "backend", args: ["run", "dev", "-w", "backend"] },
  { name: "frontend", args: ["run", "dev", "-w", "frontend"] },
];

const children = tasks.map(({ name, args }) => {
  // npm.cmd is a Windows command-wrapper. Invoke it through cmd.exe to avoid
  // direct-spawn EINVAL errors on newer Node versions.
  const isWindows = process.platform === "win32";
  const child = spawn(
    isWindows ? process.env.ComSpec : npm,
    isWindows ? ["/d", "/s", "/c", `${npm} ${args.join(" ")}`] : args,
    { stdio: "inherit" },
  );
  child.on("exit", (code) => {
    console.log(`[${name}] exited with code ${code ?? 1}`);
    children.forEach((c) => !c.killed && c.kill());
    process.exit(code ?? 1);
  });
  child.on("error", (err) => {
    console.error(`[${name}] failed to start:`, err.message);
    process.exit(1);
  });
  return child;
});
