import { Elysia } from "elysia";
import { app } from "./src/api/app";

app.listen(3000);

void Elysia;

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
