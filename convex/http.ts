import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { checkIncomnigVerify } from './http_actions/iventory_movements';

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/create-incoming",
  method: "POST",
  handler: checkIncomnigVerify,
});

export default http;