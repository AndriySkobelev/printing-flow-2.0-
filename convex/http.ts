import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { checkIncomnigVerify } from './actionsHttp';

const http = httpRouter();

http.route({
  path: "/create-incoming",
  method: "POST",
  handler: checkIncomnigVerify,
});
export default http;