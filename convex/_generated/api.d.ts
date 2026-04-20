/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as http_actions_iventory_movements from "../http_actions/iventory_movements.js";
import type * as http_actions_orders from "../http_actions/orders.js";
import type * as queries_fabrics from "../queries/fabrics.js";
import type * as queries_manipulations from "../queries/manipulations.js";
import type * as queries_materials from "../queries/materials.js";
import type * as queries_movements from "../queries/movements.js";
import type * as queries_orders from "../queries/orders.js";
import type * as queries_planner from "../queries/planner.js";
import type * as queries_products from "../queries/products.js";
import type * as queries_shift_reports from "../queries/shift_reports.js";
import type * as queries_specifications from "../queries/specifications.js";
import type * as queries_users from "../queries/users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  http: typeof http;
  "http_actions/iventory_movements": typeof http_actions_iventory_movements;
  "http_actions/orders": typeof http_actions_orders;
  "queries/fabrics": typeof queries_fabrics;
  "queries/manipulations": typeof queries_manipulations;
  "queries/materials": typeof queries_materials;
  "queries/movements": typeof queries_movements;
  "queries/orders": typeof queries_orders;
  "queries/planner": typeof queries_planner;
  "queries/products": typeof queries_products;
  "queries/shift_reports": typeof queries_shift_reports;
  "queries/specifications": typeof queries_specifications;
  "queries/users": typeof queries_users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
