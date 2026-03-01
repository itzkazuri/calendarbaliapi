import { Elysia } from "elysia";
import { app } from "./api/app";

if (!process.env.VERCEL) {
  app.listen(3000);
  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
  );
}

void Elysia;

export default app;
