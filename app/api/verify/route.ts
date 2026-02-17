import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { email, code } = await request.json();

        if (!email || !code) {
            return NextResponse.json(
                { success: false, message: 'Email and code are required' },
                { status: 400 }
            );
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('verification_code')
            .eq('email', email)
            .single();

        if (error || !user) {
            return NextResponse.json(
                { success: false, message: 'User not found.' },
                { status: 404 }
            );
        }

        const storedCode = String(user.verification_code).trim();
        const providedCode = String(code).trim();

        if (storedCode === providedCode) {
            return NextResponse.json({ success: true, message: 'Verified!' });
        }

        return NextResponse.json(
            { success: false, message: 'Invalid code.' },
            { status: 401 }
        );
    } catch (error) {
        console.error('Verify Error:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}
