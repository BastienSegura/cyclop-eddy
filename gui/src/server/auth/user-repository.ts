import type { User } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export interface CreateUserInput {
  email: string;
  emailLower: string;
  passwordHash: string;
}

export interface UserRepository {
  findByEmailLower(emailLower: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
}

export const prismaUserRepository: UserRepository = {
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
