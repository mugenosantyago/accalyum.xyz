"use server"

export async function getAcyumTokenId(): Promise<string> {
  return process.env.ACYUM_TOKEN_ID || ""
}

export async function getAcyumToken(): Promise<string> {
  return process.env.ACYUM_TOKEN || ""
}
