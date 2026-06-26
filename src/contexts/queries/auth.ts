import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";

// export function useGetUser() {
//   const mutationFn = useConvexMutation(
//     api.auth.getUser,
//   )

//   return useMutation({ mutationFn })
// }