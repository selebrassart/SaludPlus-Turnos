"use server"

import * as userController from "@/controllers/UserController"
import { runAction, type ActionResult } from "@/lib/actionResult"
import type { UserDto, UserFormInput } from "@/models/User"

export async function getUsers(): Promise<UserDto[]> {
  return userController.findAll()
}

export async function saveUser(
  input: UserFormInput,
  password?: string
): Promise<ActionResult<UserDto | undefined>> {
  const { id, ...attributes } = input
  return runAction(() =>
    id
      ? userController.update(id, attributes)
      : userController.create(attributes, password)
  )
}

export async function deleteUser(
  id: string
): Promise<ActionResult<{ id: string } | undefined>> {
  return runAction(() => userController.remove(id))
}
