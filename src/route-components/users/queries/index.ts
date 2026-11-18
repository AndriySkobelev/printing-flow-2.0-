import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'

export const useGetAllUsers = () =>
  useQuery(convexQuery(api.queries.users.getAllUsers, {}))

export const useGetUserById = (id: Id<'users'>) =>
  useQuery(convexQuery(api.queries.users.getUserById, { id }))
