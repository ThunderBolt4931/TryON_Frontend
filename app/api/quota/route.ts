import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json(
                { allowed: true, remaining: 3 },
                { status: 200 }
            );
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            // If user doesn't exist, they have full quota (will be created on login/generate attempt usually, but here we just say allowed)
            return NextResponse.json({ allowed: true, remaining: 3 });
        }

        const now = new Date();
        const lastReset = user.last_reset_time ? new Date(user.last_reset_time) : new Date(0);
        let count = user.generation_count || 0;

        // Check if 24 hours have passed since last reset
        // We do not reset DB here (that's for write operations), we just calculate effective quota
        if (now.getTime() - lastReset.getTime() > 24 * 60 * 60 * 1000) {
            count = 0;
        }

        if (count < 3) {
            return NextResponse.json({ allowed: true, remaining: 3 - count });
        }

        return NextResponse.json({ allowed: false, remaining: 0 });
    } catch (error) {
        console.error('Quota Error:', error);
        return NextResponse.json(
            { allowed: true, remaining: 3 },
            { status: 200 }
        );
    }
}
