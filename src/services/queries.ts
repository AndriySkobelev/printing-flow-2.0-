import { queryOptions } from "@tanstack/react-query";
import { getUser } from "./server-func/auth";

export const authQueries = {
  all: ["auth"],
  user: () =>
    queryOptions({
      queryKey: [...authQueries.all, "user"],
      queryFn: () => getUser(),
    }),
}