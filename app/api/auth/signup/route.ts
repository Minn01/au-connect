import { tradSignup } from '@/lib/authFunctions';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
    return await tradSignup(req);
}
