import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  await deleteSession();
  return NextResponse.redirect(new URL("/", request.url));
}
