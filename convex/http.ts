import { httpRouter } from "convex/server";
import { checkIncomnigVerify } from './htttp_actions/iventory_movements';

const http = httpRouter();

http.route({
  path: "/create-incoming",
  method: "POST",
  handler: checkIncomnigVerify,
});

export default http;