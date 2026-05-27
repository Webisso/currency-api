import path from "node:path";
import express from "express";

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDir = path.resolve(process.cwd(), "public");

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(express.static(publicDir, {
  extensions: ["json"]
}));

app.use((_req, res) => {
  res.status(404).json({
    error: "Not found",
    example: "/latest/v1/currencies/eur.json"
  });
});

app.listen(port, () => {
  console.log(`[server] Listening on http://localhost:${port}`);
});
