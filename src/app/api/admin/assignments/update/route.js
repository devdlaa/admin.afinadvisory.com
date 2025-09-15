import { NextResponse } from "next/server";
import { z } from "zod";
import admin from "@/lib/firebase-admin";

const schema = z.object({
 
});

const db = admin.firestore();

export async function POST(req) {
 
}
