import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const pathParam = request.nextUrl.searchParams.get("path");
  if (!pathParam) {
    return new NextResponse("Bad Request: Missing path parameter", { status: 400 });
  }

  // Security Verification: Ensure the user is only requesting files within their own isolated folder
  if (!pathParam.startsWith(`${session.userId}/`)) {
    return new NextResponse("Forbidden: Access Denied", { status: 403 });
  }

  const isDownload = request.nextUrl.searchParams.get("download") === "true";

  // Generate a signed URL valid for 60 seconds (1 minute)
  const { data, error } = await supabase.storage
    .from("personal-os-bucket")
    .createSignedUrl(pathParam, 60, {
      download: isDownload
    });

  if (error || !data?.signedUrl) {
    console.error("Failed to generate signed URL:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  // Redirect the client to the newly generated Signed URL
  return NextResponse.redirect(data.signedUrl);
}
