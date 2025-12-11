import { NextRequest } from "next/server";
import { createPost } from "@/lib/postFunctions";

// create post 
export async function POST(req: NextRequest) {
    return await createPost(req);
}

// get all posts
export async function GET(req: NextRequest) {
  
}