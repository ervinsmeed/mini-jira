/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as boardMembers from "../boardMembers.js";
import type * as boards from "../boards.js";
import type * as columns from "../columns.js";
import type * as favorites from "../favorites.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_cascade from "../lib/cascade.js";
import type * as lib_directoryQueries from "../lib/directoryQueries.js";
import type * as lib_projectOrder from "../lib/projectOrder.js";
import type * as lib_roleDelegation from "../lib/roleDelegation.js";
import type * as lib_taskAccess from "../lib/taskAccess.js";
import type * as lib_taskChanges from "../lib/taskChanges.js";
import type * as lib_taskQueries from "../lib/taskQueries.js";
import type * as lib_workspaceAccess from "../lib/workspaceAccess.js";
import type * as recentTasks from "../recentTasks.js";
import type * as roles from "../roles.js";
import type * as taskTemplates from "../taskTemplates.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";
import type * as workspaceMembers from "../workspaceMembers.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  boardMembers: typeof boardMembers;
  boards: typeof boards;
  columns: typeof columns;
  favorites: typeof favorites;
  "lib/access": typeof lib_access;
  "lib/cascade": typeof lib_cascade;
  "lib/directoryQueries": typeof lib_directoryQueries;
  "lib/projectOrder": typeof lib_projectOrder;
  "lib/roleDelegation": typeof lib_roleDelegation;
  "lib/taskAccess": typeof lib_taskAccess;
  "lib/taskChanges": typeof lib_taskChanges;
  "lib/taskQueries": typeof lib_taskQueries;
  "lib/workspaceAccess": typeof lib_workspaceAccess;
  recentTasks: typeof recentTasks;
  roles: typeof roles;
  taskTemplates: typeof taskTemplates;
  tasks: typeof tasks;
  users: typeof users;
  workspaceMembers: typeof workspaceMembers;
  workspaces: typeof workspaces;
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
