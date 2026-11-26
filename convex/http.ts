import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { type Id } from "./_generated/dataModel";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

// /pdf/<storageId>/<name>.pdf — a stored PDF under a readable file name.
http.route({
  pathPrefix: "/pdf/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const [storageId, name] = new URL(request.url).pathname.split("/").slice(2);
    const blob = storageId && name ? await ctx.storage.get(storageId as Id<"_storage">).catch(() => null) : null;
    if (!blob) return new Response("Not found", { status: 404 });
    return new Response(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${name}`,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  }),
});

export default http;
