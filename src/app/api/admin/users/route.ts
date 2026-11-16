import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Admin users managed via Firestore directly in admin panel",
    users: []
  });
}

export async function PATCH() {
  return NextResponse.json({ success: true });
}

export async function POST() {
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  return NextResponse.json({ success: true });
}
