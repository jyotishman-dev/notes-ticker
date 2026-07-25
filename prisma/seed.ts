import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const track = await prisma.track.create({
    data: {
      name: "Backend Fundamentals Gauntlet",
      category: "General",
      color: "emerald",
      order: 0,
      phases: {
        create: [
          {
            index: 0,
            title: "Setup + Rules of Engagement",
            concept: "Environment, repo structure, and how this gauntlet works.",
            tasks: {
              create: [
                { content: "Install Node, pnpm, Docker, Postgres locally", order: 0 },
                { content: "Create repo + base folder structure", order: 1 },
              ],
            },
          },
          {
            index: 1,
            title: "JS/TS Fundamentals Rebuild",
            concept:
              "Everything downstream (Redis clients, Fastify handlers, Prisma queries) is async JS. If this is shaky, everything else wobbles.",
            tasks: {
              create: [
                { content: "TypeScript: write 3 generic functions (not copied) — a typed `pick`, a typed `groupBy`, a typed `retry<T>`", order: 0 },
                { content: "Explain the difference between `interface` and `type` and when each is idiomatic", order: 1 },
                { content: "Explain `strict: true`, `noUncheckedIndexedAccess`, and why they matter, using a real bug they'd have caught", order: 2 },
                { content: "Convert a callback-based function (fs.readFile style) into a Promise-based one without using `util.promisify`", order: 3 },
                { content: "Explain the difference between `null`, `undefined`, and an unhandled promise rejection", order: 4 },
                { content: "Write 5 functions using `async/await` that properly catch and rethrow errors with context", order: 5 },
                { content: "Implement `Promise.all`, `Promise.race`, and `Promise.allSettled` behavior manually with plain callbacks", order: 6 },
                { content: "Write a function that demonstrates a closure bug (stale variable in a loop) and fix it two different ways", order: 7 },
                { content: "Explain the event loop out loud: call stack, microtask queue, macrotask queue, in order", order: 8 },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.track.create({
    data: { name: "THE 150 DSA GAUNTLET", category: "General", color: "amber", order: 1 },
  });
  await prisma.track.create({
    data: { name: "WebRTC Gaun", category: "General", color: "cyan", order: 2 },
  });

  console.log("Seeded track:", track.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
