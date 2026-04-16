import type { User } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export interface CreateUserInput {
  email: string;
  emailLower: string;
  passwordHash: string;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmailLower(emailLower: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
}

export const prismaUserRepository: UserRepository = {
  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  async findByEmailLower(emailLower) {
    return prisma.user.findUnique({
      where: { emailLower },
    });
  },

  async create(input) {
    return prisma.user.create({
      data: {
        email: input.email,
        emailLower: input.emailLower,
        passwordHash: input.passwordHash,
      },
    });
  },
};
